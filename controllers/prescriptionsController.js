import db from '../db/connection.js';
import { createInAppNotification, sendWebPush } from '../services/pushNotifications.js';
import { ensurePatientProfile } from '../services/patientProfile.js';

// ➕ Doctor creates Prescription (with optional reminder schedule)
export const addPrescription = async (req, res) => {
    const { appointment_id, patient_id, medicine_name, dosage, duration_days, instructions, reminder_time } = req.body;
    let doctor_id = req.body.doctor_id;

    if (req.user.role === 'doctor') {
        const [docs] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [req.user.user_id]);
        if (!docs.length) return res.status(403).json({ error: "Doctor profile not found" });
        doctor_id = docs[0].doctor_id;
    }

    if (!doctor_id || !patient_id || !medicine_name || !dosage) {
        return res.status(400).json({
            error: "Missing required fields: doctor, patient, medicine name, and dosage"
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [docRows] = await connection.query(`
            SELECT u.name AS doctor_name, d.specialization 
            FROM Doctors d 
            JOIN Users u ON d.user_id = u.user_id 
            WHERE d.doctor_id = ?
        `, [doctor_id]);
        const doctorName = docRows.length ? docRows[0].doctor_name : "Doctor";

        const [patRows] = await connection.query(`
            SELECT p.user_id, u.name AS patient_name 
            FROM Patients p 
            JOIN Users u ON p.user_id = u.user_id 
            WHERE p.patient_id = ?
        `, [patient_id]);
        if (!patRows.length) {
            await connection.rollback();
            return res.status(404).json({ error: "Patient not found" });
        }
        const patient = patRows[0];

        const insertPrescriptionSql = `
            INSERT INTO Prescriptions (appointment_id, doctor_id, patient_id, medicine_name, dosage, duration_days, instructions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(insertPrescriptionSql, [
            appointment_id || null,
            doctor_id,
            patient_id,
            medicine_name.trim(),
            dosage.trim(),
            duration_days ? Number(duration_days) : null,
            instructions?.trim() || ''
        ]);

        const prescriptionId = result.insertId;

        // If reminder time provided, automatically create medicine reminder
        if (reminder_time) {
            await connection.query(
                `INSERT INTO Medicine_Reminders (prescription_id, patient_id, reminder_time, taken) VALUES (?, ?, ?, 0)`,
                [prescriptionId, patient_id, reminder_time]
            );
        }

        await connection.commit();

        // Notify patient
        const msg = `Dr. ${doctorName} issued a new prescription: ${medicine_name} (${dosage}).`;
        await createInAppNotification(patient.user_id, msg, 'prescription');
        await sendWebPush(patient.user_id, {
            title: `New Prescription: ${medicine_name}`,
            body: msg,
            prescriptionId
        });

        res.status(201).json({
            message: 'Prescription issued successfully',
            prescription_id: prescriptionId
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

// ➕ Patient logs personal medication
export const addPatientMedication = async (req, res) => {
    const { doctor_id, medicine_name, dosage, reminder_time, duration_days, instructions } = req.body;
    if (!medicine_name || !dosage || !reminder_time) {
        return res.status(400).json({ error: "Medicine name, dosage, and reminder time are required" });
    }

    const connection = await db.getConnection();
    try {
        const patient = await ensurePatientProfile(req.user.user_id);
        if (!patient) return res.status(404).json({ error: "Patient profile could not be initialized" });
        const patientId = patient.patient_id;

        // If no doctor_id provided, pick default or first available doctor
        let docId = doctor_id;
        if (!docId) {
            const [firstDoc] = await connection.query("SELECT doctor_id FROM Doctors LIMIT 1");
            docId = firstDoc.length ? firstDoc[0].doctor_id : null;
        }

        await connection.beginTransaction();
        const [prescription] = await connection.query(
            `INSERT INTO Prescriptions (appointment_id, doctor_id, patient_id, medicine_name, dosage, duration_days, instructions)
             VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
            [docId, patientId, medicine_name.trim(), dosage.trim(), duration_days ? Number(duration_days) : null, instructions?.trim() || ""],
        );
        await connection.query(
            "INSERT INTO Medicine_Reminders (prescription_id, patient_id, guardian_id, reminder_time, taken) VALUES (?, ?, NULL, ?, 0)",
            [prescription.insertId, patientId, reminder_time],
        );
        await connection.commit();
        res.status(201).json({ message: "Medication and reminder added", prescription_id: prescription.insertId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

// 📋 Get Prescriptions by Patient
export const getPrescriptionsByPatient = async (req, res) => {
    let { patient_id } = req.params;

    if (req.user.role === 'patient') {
        const [patients] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
        if (!patients.length) return res.json([]);
        patient_id = patients[0].patient_id;
    }

    const sql = `
        SELECT 
            p.prescription_id,
            p.appointment_id,
            p.medicine_name,
            p.dosage,
            p.duration_days,
            p.instructions,
            p.doctor_id,
            u.name AS doctor_name,
            d.specialization,
            d.hospital_name,
            mr.reminder_time,
            mr.reminder_id
        FROM Prescriptions p
        LEFT JOIN Doctors d ON p.doctor_id = d.doctor_id
        LEFT JOIN Users u ON d.user_id = u.user_id
        LEFT JOIN Medicine_Reminders mr ON p.prescription_id = mr.prescription_id
        WHERE p.patient_id = ?
        ORDER BY p.prescription_id DESC
    `;

    try {
        const [rows] = await db.query(sql, [patient_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📋 Get Prescriptions by Doctor
export const getPrescriptionsByDoctor = async (req, res) => {
    let { doctor_id } = req.params;

    if (req.user.role === 'doctor') {
        const [docs] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [req.user.user_id]);
        if (!docs.length) return res.json([]);
        doctor_id = docs[0].doctor_id;
    }

    const sql = `
        SELECT 
            p.prescription_id,
            p.appointment_id,
            p.medicine_name,
            p.dosage,
            p.duration_days,
            p.instructions,
            p.patient_id,
            u.name AS patient_name,
            u.email AS patient_email,
            pt.blood_group,
            mr.reminder_time
        FROM Prescriptions p
        JOIN Patients pt ON p.patient_id = pt.patient_id
        JOIN Users u ON pt.user_id = u.user_id
        LEFT JOIN Medicine_Reminders mr ON p.prescription_id = mr.prescription_id
        WHERE p.doctor_id = ?
        ORDER BY p.prescription_id DESC
    `;

    try {
        const [rows] = await db.query(sql, [doctor_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
