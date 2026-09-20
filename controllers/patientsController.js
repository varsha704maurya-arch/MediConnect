import db from '../db/connection.js';
import { ensurePatientProfile } from '../services/patientProfile.js';

// ➕ Add Patient (or initialize)
export const addPatient = async (req, res) => {
    const { user_id, date_of_birth, gender, blood_group, medical_history } = req.body;
    const targetUserId = req.user.role === 'admin' ? user_id : req.user.user_id;

    if (!date_of_birth || !gender || !blood_group) {
        return res.status(400).json({
            error: "Missing required fields: date_of_birth, gender, blood_group"
        });
    }

    const sql = `
        INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            date_of_birth = VALUES(date_of_birth),
            gender = VALUES(gender),
            blood_group = VALUES(blood_group),
            medical_history = VALUES(medical_history)
    `;

    try {
        const [result] = await db.query(sql, [targetUserId, date_of_birth, gender, blood_group, medical_history || ""]);
        res.status(201).json({ message: 'Patient profile saved successfully', patient_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message || "Unexpected server error" });
    }
};

// 👤 Get current logged-in patient profile
export const getMyPatientProfile = async (req, res) => {
    try {
        await ensurePatientProfile(req.user.user_id);

        const [rows] = await db.query(`
            SELECT p.patient_id, p.user_id, u.name, u.email, u.phone_number,
                   p.date_of_birth, p.gender, p.blood_group, p.medical_history, u.created_at
            FROM Patients p
            JOIN Users u ON p.user_id = u.user_id
            WHERE p.user_id = ?
        `, [req.user.user_id]);

        if (!rows.length) {
            return res.status(404).json({ error: "Patient profile not found" });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✏️ Update patient profile
export const updatePatientProfile = async (req, res) => {
    const { date_of_birth, gender, blood_group, medical_history, name, phone_number } = req.body;
    try {
        await ensurePatientProfile(req.user.user_id);

        if (name || phone_number) {
            await db.query(`
                UPDATE Users 
                SET name = COALESCE(?, name), phone_number = COALESCE(?, phone_number)
                WHERE user_id = ?
            `, [name?.trim() || null, phone_number?.trim() || null, req.user.user_id]);
        }

        await db.query(`
            UPDATE Patients
            SET date_of_birth = COALESCE(?, date_of_birth),
                gender = COALESCE(?, gender),
                blood_group = COALESCE(?, blood_group),
                medical_history = COALESCE(?, medical_history)
            WHERE user_id = ?
        `, [date_of_birth || null, gender || null, blood_group || null, medical_history !== undefined ? medical_history : null, req.user.user_id]);

        const [updated] = await db.query(`
            SELECT p.patient_id, p.user_id, u.name, u.email, u.phone_number,
                   p.date_of_birth, p.gender, p.blood_group, p.medical_history
            FROM Patients p
            JOIN Users u ON p.user_id = u.user_id
            WHERE p.user_id = ?
        `, [req.user.user_id]);

        res.json({ message: "Profile updated successfully", profile: updated[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📋 Get Patients (for authorized doctors)
// Returns patients who have booked appointments with the requesting doctor
export const getDoctorPatients = async (req, res) => {
    try {
        const [doctorRows] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [req.user.user_id]);
        if (!doctorRows.length) return res.status(403).json({ error: "Doctor profile not found" });
        const doctorId = doctorRows[0].doctor_id;

        const sql = `
            SELECT DISTINCT 
                p.patient_id, 
                u.name AS patient_name, 
                u.email AS patient_email,
                u.phone_number AS patient_phone,
                p.date_of_birth, 
                p.gender, 
                p.blood_group, 
                p.medical_history,
                (SELECT COUNT(*) FROM Appointments WHERE patient_id = p.patient_id AND doctor_id = ?) AS total_appointments,
                (SELECT MAX(appointment_date) FROM Appointments WHERE patient_id = p.patient_id AND doctor_id = ?) AS last_appointment_date
            FROM Patients p
            JOIN Users u ON p.user_id = u.user_id
            JOIN Appointments a ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ?
            ORDER BY last_appointment_date DESC
        `;

        const [rows] = await db.query(sql, [doctorId, doctorId, doctorId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔍 Get specific patient details (authorized check)
export const getPatientById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT p.patient_id, p.user_id, u.name AS patient_name, u.email AS patient_email, u.phone_number,
                   p.date_of_birth, p.gender, p.blood_group, p.medical_history
            FROM Patients p
            JOIN Users u ON p.user_id = u.user_id
            WHERE p.patient_id = ?
        `, [id]);

        if (!rows.length) return res.status(404).json({ error: "Patient not found" });
        const patient = rows[0];

        // Access check: patient themselves, or guardian linked to them, or doctor with an appointment
        if (req.user.role === 'patient' && req.user.user_id !== patient.user_id) {
            return res.status(403).json({ error: "Access denied" });
        }
        if (req.user.role === 'doctor') {
            const [doc] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [req.user.user_id]);
            if (doc.length) {
                const [apts] = await db.query('SELECT appointment_id FROM Appointments WHERE doctor_id = ? AND patient_id = ?', [doc[0].doctor_id, id]);
                if (!apts.length) return res.status(403).json({ error: "You are not authorized to view this patient's records" });
            }
        }
        if (req.user.role === 'guardian') {
            const [links] = await db.query('SELECT link_id FROM Guardian_Patient_Link WHERE guardian_id = ? AND patient_id = ?', [req.user.user_id, id]);
            if (!links.length) return res.status(403).json({ error: "Access denied: patient not linked to your guardian account" });
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
