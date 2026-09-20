import db from '../db/connection.js';
import { createInAppNotification, sendWebPush } from '../services/pushNotifications.js';
import { ensurePatientProfile } from '../services/patientProfile.js';

async function ensureConsultationMessagesTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Consultation_Messages (
            message_id INT AUTO_INCREMENT PRIMARY KEY,
            appointment_id INT NOT NULL,
            sender_id INT NOT NULL,
            sender_role ENUM('patient', 'doctor') NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_consultation_appt (appointment_id),
            FOREIGN KEY (appointment_id) REFERENCES Appointments(appointment_id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE
        )
    `);
}

async function getConsultationParticipants(appointmentId) {
    const [rows] = await db.query(`
        SELECT
            a.appointment_id,
            p.user_id AS patient_user_id,
            d.user_id AS doctor_user_id
        FROM Appointments a
        JOIN Patients p ON a.patient_id = p.patient_id
        JOIN Doctors d ON a.doctor_id = d.doctor_id
        WHERE a.appointment_id = ?
    `, [appointmentId]);
    return rows[0] || null;
}

function canAccessConsultation(user, apt) {
    return Boolean(
        apt &&
        (user.user_id === apt.patient_user_id || user.user_id === apt.doctor_user_id || user.role === 'admin')
    );
}

// ➕ Book Appointment
export const bookAppointment = async (req, res) => {
    const { doctor_id, appointment_date, notes, consultation_type } = req.body;
    let patient_id = req.body.patient_id;

    // Resolve patient_id from logged-in user if role is patient
    if (req.user.role === 'patient') {
        const patient = await ensurePatientProfile(req.user.user_id);
        if (!patient) return res.status(400).json({ error: "Patient profile could not be initialized" });
        patient_id = patient.patient_id;
    }

    if (!patient_id || !doctor_id || !appointment_date) {
        return res.status(400).json({ error: "Missing required fields: patient, doctor, and appointment date/time" });
    }

    // Validate future date
    const parsedDate = new Date(appointment_date);
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
        return res.status(400).json({ error: "Appointment date must be in the future" });
    }

    // Validate mode
    const mode = (consultation_type === 'online' || req.body.mode === 'online') ? 'online' : 'offline';

    try {
        // Check if doctor exists
        const [doctorRows] = await db.query(`
            SELECT d.doctor_id, d.user_id, u.name AS doctor_name 
            FROM Doctors d 
            JOIN Users u ON d.user_id = u.user_id 
            WHERE d.doctor_id = ?
        `, [doctor_id]);
        if (!doctorRows.length) return res.status(404).json({ error: "Selected doctor was not found" });
        const doctor = doctorRows[0];

        // Check patient info
        const [patientRows] = await db.query(`
            SELECT p.patient_id, p.user_id, u.name AS patient_name 
            FROM Patients p 
            JOIN Users u ON p.user_id = u.user_id 
            WHERE p.patient_id = ?
        `, [patient_id]);
        if (!patientRows.length) return res.status(404).json({ error: "Patient not found" });
        const patient = patientRows[0];

        // Prevent double booking within 15 minutes for the same doctor
        const [existing] = await db.query(`
            SELECT appointment_id FROM Appointments 
            WHERE doctor_id = ? 
              AND status = 'booked'
              AND ABS(TIMESTAMPDIFF(MINUTE, appointment_date, ?)) < 20
        `, [doctor_id, parsedDate]);

        if (existing.length > 0) {
            return res.status(409).json({ error: "Doctor already has a consultation booked near this time. Please select another slot." });
        }

        const sql = `INSERT INTO Appointments (patient_id, doctor_id, appointment_date, mode, status, notes) VALUES (?, ?, ?, ?, 'booked', ?)`;
        const [result] = await db.query(sql, [patient_id, doctor_id, parsedDate, mode, notes || '']);

        // Format nice date for notifications
        const formattedDate = parsedDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

        // Notify doctor
        const docMsg = `New appointment: ${patient.patient_name} booked an ${mode.toUpperCase()} consultation for ${formattedDate}.`;
        await createInAppNotification(doctor.user_id, docMsg, 'appointment');
        await sendWebPush(doctor.user_id, {
            title: `New ${mode.toUpperCase()} Appointment`,
            body: docMsg,
            appointmentId: result.insertId
        });

        // Notify patient
        const patMsg = `Appointment confirmed: ${mode.toUpperCase()} consultation with ${doctor.doctor_name} on ${formattedDate}.`;
        await createInAppNotification(patient.user_id, patMsg, 'appointment');

        res.status(201).json({
            message: 'Appointment booked successfully',
            appointment_id: result.insertId,
            mode,
            appointment_date: parsedDate
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "Unexpected server error" });
    }
};

// 📋 Get Appointments (Role-filtered)
export const getAppointments = async (req, res) => {
    try {
        let sql = '';
        let params = [];

        if (req.user.role === 'patient') {
            const [patients] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
            if (!patients.length) return res.json([]);
            const patientId = patients[0].patient_id;

            sql = `
                SELECT 
                    a.appointment_id, 
                    a.appointment_date, 
                    a.status, 
                    a.mode, 
                    a.notes,
                    a.created_at,
                    d.doctor_id,
                    u.name AS doctor_name, 
                    u.email AS doctor_email,
                    u.phone_number AS doctor_phone,
                    d.specialization, 
                    d.hospital_name, 
                    d.consultation_fee
                FROM Appointments a
                JOIN Doctors d ON a.doctor_id = d.doctor_id
                JOIN Users u ON d.user_id = u.user_id
                WHERE a.patient_id = ?
                ORDER BY a.appointment_date DESC
            `;
            params = [patientId];
        } else if (req.user.role === 'doctor') {
            const [doctors] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [req.user.user_id]);
            if (!doctors.length) return res.json([]);
            const doctorId = doctors[0].doctor_id;

            sql = `
                SELECT 
                    a.appointment_id, 
                    a.appointment_date, 
                    a.status, 
                    a.mode, 
                    a.notes,
                    a.created_at,
                    p.patient_id,
                    u.name AS patient_name, 
                    u.email AS patient_email,
                    u.phone_number AS patient_phone,
                    p.date_of_birth,
                    p.gender,
                    p.blood_group,
                    p.medical_history
                FROM Appointments a
                JOIN Patients p ON a.patient_id = p.patient_id
                JOIN Users u ON p.user_id = u.user_id
                WHERE a.doctor_id = ?
                ORDER BY a.appointment_date DESC
            `;
            params = [doctorId];
        } else if (req.user.role === 'guardian') {
            // Return appointments for linked patients
            sql = `
                SELECT 
                    a.appointment_id, 
                    a.appointment_date, 
                    a.status, 
                    a.mode, 
                    a.notes,
                    a.created_at,
                    p.patient_id,
                    pu.name AS patient_name,
                    du.name AS doctor_name,
                    d.specialization,
                    d.hospital_name
                FROM Appointments a
                JOIN Patients p ON a.patient_id = p.patient_id
                JOIN Users pu ON p.user_id = pu.user_id
                JOIN Guardian_Patient_Link gpl ON p.patient_id = gpl.patient_id
                JOIN Doctors d ON a.doctor_id = d.doctor_id
                JOIN Users du ON d.user_id = du.user_id
                WHERE gpl.guardian_id = ?
                ORDER BY a.appointment_date DESC
            `;
            params = [req.user.user_id];
        } else {
            // Admin fallback
            sql = `
                SELECT a.*, du.name AS doctor_name, pu.name AS patient_name 
                FROM Appointments a
                JOIN Doctors d ON a.doctor_id = d.doctor_id
                JOIN Users du ON d.user_id = du.user_id
                JOIN Patients p ON a.patient_id = p.patient_id
                JOIN Users pu ON p.user_id = pu.user_id
                ORDER BY a.appointment_date DESC
            `;
        }

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔄 Update Appointment Status (completed, cancelled)
export const updateAppointmentStatus = async (req, res) => {
    const { appointment_id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = new Set(['booked', 'completed', 'cancelled']);
    if (!validStatuses.has(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'booked', 'completed', or 'cancelled'." });
    }

    try {
        const [rows] = await db.query(`
            SELECT 
                a.appointment_id, a.appointment_date, a.mode, a.status,
                p.patient_id, p.user_id AS patient_user_id, pu.name AS patient_name,
                d.doctor_id, d.user_id AS doctor_user_id, du.name AS doctor_name
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Users pu ON p.user_id = pu.user_id
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            JOIN Users du ON d.user_id = du.user_id
            WHERE a.appointment_id = ?
        `, [appointment_id]);

        if (!rows.length) return res.status(404).json({ error: "Appointment not found" });
        const apt = rows[0];

        // Access check
        const isPatientOwner = apt.patient_user_id === req.user.user_id;
        const isDoctorOwner = apt.doctor_user_id === req.user.user_id;
        if (!isPatientOwner && !isDoctorOwner && req.user.role !== 'admin') {
            return res.status(403).json({ error: "You are not authorized to update this appointment" });
        }

        await db.query(
            `UPDATE Appointments SET status = ?, notes = COALESCE(?, notes) WHERE appointment_id = ?`,
            [status, notes !== undefined ? notes : null, appointment_id]
        );

        // Notify other party
        const actorName = isDoctorOwner ? `Dr. ${apt.doctor_name}` : apt.patient_name;
        const targetUserId = isDoctorOwner ? apt.patient_user_id : apt.doctor_user_id;
        const aptDateStr = new Date(apt.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        const notificationMsg = `Appointment on ${aptDateStr} has been marked as ${status.toUpperCase()} by ${actorName}.`;

        await createInAppNotification(targetUserId, notificationMsg, 'appointment');
        await sendWebPush(targetUserId, {
            title: `Appointment ${status.toUpperCase()}`,
            body: notificationMsg,
            appointmentId: apt.appointment_id
        });

        res.json({ message: `Appointment status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 💬 Get Consultation Chat Messages
export const getAppointmentMessages = async (req, res) => {
    const { appointment_id } = req.params;
    try {
        await ensureConsultationMessagesTable();
        const apt = await getConsultationParticipants(appointment_id);
        if (!apt) return res.status(404).json({ error: "Appointment not found" });
        if (!canAccessConsultation(req.user, apt)) {
            return res.status(403).json({ error: "Unauthorized to view this consultation chat" });
        }

        const [rows] = await db.query(`
            SELECT 
                cm.message_id,
                cm.appointment_id,
                cm.sender_id,
                cm.sender_role,
                cm.message,
                cm.created_at,
                u.name AS sender_name
            FROM Consultation_Messages cm
            JOIN Users u ON cm.sender_id = u.user_id
            WHERE cm.appointment_id = ?
            ORDER BY cm.created_at ASC
        `, [appointment_id]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 💬 Send Consultation Chat Message
export const sendAppointmentMessage = async (req, res) => {
    const { appointment_id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message content cannot be empty" });
    }

    try {
        await ensureConsultationMessagesTable();
        // Verify user is patient or doctor on this appointment
        const [aptRows] = await db.query(`
            SELECT 
                a.appointment_id,
                p.user_id AS patient_user_id,
                d.user_id AS doctor_user_id,
                u.name AS sender_name
            FROM Appointments a
            JOIN Patients p ON a.patient_id = p.patient_id
            JOIN Doctors d ON a.doctor_id = d.doctor_id
            JOIN Users u ON u.user_id = ?
            WHERE a.appointment_id = ?
        `, [req.user.user_id, appointment_id]);

        if (!aptRows.length) return res.status(404).json({ error: "Appointment not found" });
        const apt = aptRows[0];

        const isPatient = req.user.user_id === apt.patient_user_id;
        const isDoctor = req.user.user_id === apt.doctor_user_id;

        if (!isPatient && !isDoctor && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized to send messages in this consultation" });
        }

        const senderRole = isDoctor ? 'doctor' : 'patient';

        const [result] = await db.query(`
            INSERT INTO Consultation_Messages (appointment_id, sender_id, sender_role, message)
            VALUES (?, ?, ?, ?)
        `, [appointment_id, req.user.user_id, senderRole, message.trim()]);

        const recipientUserId = isDoctor ? apt.patient_user_id : apt.doctor_user_id;
        const preview = message.trim().slice(0, 60);
        await createInAppNotification(
            recipientUserId,
            `New message from ${apt.sender_name}: "${preview}${message.trim().length > 60 ? "..." : ""}"`,
            "appointment"
        );
        await sendWebPush(recipientUserId, {
            title: "New consultation message",
            body: `${apt.sender_name}: ${preview}`,
            appointmentId: Number(appointment_id),
        });

        res.status(201).json({
            message_id: result.insertId,
            appointment_id: Number(appointment_id),
            sender_id: req.user.user_id,
            sender_role: senderRole,
            sender_name: apt.sender_name,
            message: message.trim(),
            created_at: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

