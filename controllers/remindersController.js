import db from '../db/connection.js';
import { recordDoseTaken } from '../services/pushNotifications.js';

// ➕ Add Reminder
export const addReminder = async (req, res) => {
    const { prescription_id, reminder_time } = req.body;
    let patient_id = req.body.patient_id;

    if (req.user.role === 'patient') {
        const [patients] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
        if (patients.length) patient_id = patients[0].patient_id;
    }

    if (!patient_id || !reminder_time) {
        return res.status(400).json({
            error: "Missing required fields: patient_id and reminder_time"
        });
    }

    const sql = `
        INSERT INTO Medicine_Reminders (prescription_id, patient_id, reminder_time, taken)
        VALUES (?, ?, ?, 0)
    `;

    try {
        const [result] = await db.query(sql, [prescription_id || null, patient_id, reminder_time]);
        res.status(201).json({ message: 'Reminder added successfully', reminder_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📋 Get Reminders for Patient
export const getRemindersByPatient = async (req, res) => {
    let { patient_id } = req.params;

    if (req.user.role === 'patient') {
        const [patients] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
        if (!patients.length) return res.json([]);
        patient_id = patients[0].patient_id;
    }

    if (!patient_id) {
        return res.status(400).json({ error: "patient_id is required" });
    }

    const sql = `
        SELECT 
            r.reminder_id, 
            r.reminder_time, 
            r.taken,
            r.taken_at,
            r.missed_at,
            r.notified_date,
            r.last_notified_at,
            r.escalated_to_guardian,
            COALESCE(p.medicine_name, 'Prescribed Medicine') AS medicine_name, 
            COALESCE(p.dosage, 'As directed') AS dosage, 
            COALESCE(p.instructions, '') AS instructions,
            u.name AS guardian_name,
            CASE 
                WHEN r.taken = 1 THEN 'taken'
                WHEN r.reminder_time <= CURTIME() THEN 'due'
                ELSE 'scheduled'
            END AS status
        FROM Medicine_Reminders r
        LEFT JOIN Prescriptions p ON r.prescription_id = p.prescription_id
        LEFT JOIN Users u ON r.guardian_id = u.user_id
        WHERE r.patient_id = ?
        ORDER BY r.reminder_time ASC
    `;

    try {
        const [rows] = await db.query(sql, [patient_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🚨 Get currently active/due unacknowledged reminders for patient
export const getActiveDueReminders = async (req, res) => {
    try {
        const [patients] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
        if (!patients.length) return res.json([]);
        const patientId = patients[0].patient_id;

        const [rows] = await db.query(`
            SELECT 
                r.reminder_id, 
                r.reminder_time, 
                r.taken,
                r.last_notified_at,
                r.escalated_to_guardian,
                COALESCE(p.medicine_name, 'Prescribed Medicine') AS medicine_name, 
                COALESCE(p.dosage, 'As directed') AS dosage, 
                COALESCE(p.instructions, '') AS instructions
            FROM Medicine_Reminders r
            LEFT JOIN Prescriptions p ON r.prescription_id = p.prescription_id
            WHERE r.patient_id = ? 
              AND r.taken = 0 
              AND r.reminder_time <= CURTIME()
            ORDER BY r.reminder_time DESC
        `, [patientId]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📋 Get Reminders for Guardian
export const getRemindersByGuardian = async (req, res) => {
    const guardianId = req.user.role === 'guardian' ? req.user.user_id : req.params.guardian_id;

    if (!guardianId) {
        return res.status(400).json({ error: "guardian_id is required" });
    }

    const sql = `
        SELECT 
            r.reminder_id, 
            r.reminder_time, 
            r.taken,
            r.taken_at,
            r.escalated_to_guardian,
            r.last_notified_at,
            COALESCE(p.medicine_name, 'Prescribed Medicine') AS medicine_name, 
            COALESCE(p.dosage, 'As directed') AS dosage, 
            COALESCE(p.instructions, '') AS instructions,
            u.name AS patient_name,
            pt.patient_id,
            gpl.relationship,
            CASE 
                WHEN r.taken = 1 THEN 'taken'
                WHEN r.reminder_time <= CURTIME() THEN 'due'
                ELSE 'scheduled'
            END AS status
        FROM Medicine_Reminders r
        LEFT JOIN Prescriptions p ON r.prescription_id = p.prescription_id
        JOIN Patients pt ON r.patient_id = pt.patient_id
        JOIN Users u ON pt.user_id = u.user_id
        JOIN Guardian_Patient_Link gpl ON pt.patient_id = gpl.patient_id
        WHERE gpl.guardian_id = ?
        ORDER BY r.taken ASC, r.reminder_time ASC
    `;

    try {
        const [rows] = await db.query(sql, [guardianId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✅ Mark Reminder as Taken (Authoritative backend state change)
export const markReminderTaken = async (req, res) => {
    const { reminder_id } = req.params;

    if (!reminder_id) {
        return res.status(400).json({ error: "reminder_id is required" });
    }

    try {
        const result = await recordDoseTaken(reminder_id, req.user.user_id);
        res.json({ message: 'Medicine successfully recorded as taken', data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
