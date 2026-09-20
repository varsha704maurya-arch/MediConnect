import db from '../db/connection.js';
import { createInAppNotification } from '../services/pushNotifications.js';

// 🔗 Link guardian to patient (by patient email or patient_id)
export const linkGuardianToPatient = async (req, res) => {
    const { patient_id, patient_email, relationship } = req.body;
    const guardian_id = req.user.role === 'guardian' ? req.user.user_id : req.body.guardian_id;

    if (!guardian_id || (!patient_id && !patient_email) || !relationship) {
        return res.status(400).json({ error: 'Patient identifier and relationship are required' });
    }

    try {
        let resolvedPatientId = patient_id;

        if (!resolvedPatientId && patient_email) {
            const [users] = await db.query(`
                SELECT p.patient_id, u.name 
                FROM Patients p 
                JOIN Users u ON p.user_id = u.user_id 
                WHERE u.email = ?
            `, [patient_email.toLowerCase().trim()]);

            if (!users.length) {
                return res.status(404).json({ error: 'No patient account found with that email address' });
            }
            resolvedPatientId = users[0].patient_id;
        }

        // Verify patient exists
        const [patRows] = await db.query(`
            SELECT p.patient_id, p.user_id, u.name AS patient_name 
            FROM Patients p 
            JOIN Users u ON p.user_id = u.user_id 
            WHERE p.patient_id = ?
        `, [resolvedPatientId]);

        if (!patRows.length) return res.status(404).json({ error: 'Patient not found' });
        const patient = patRows[0];

        // Check if already linked
        const [existing] = await db.query(
            'SELECT link_id FROM Guardian_Patient_Link WHERE guardian_id = ? AND patient_id = ?',
            [guardian_id, resolvedPatientId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'You are already linked to this patient' });
        }

        const [guardianRows] = await db.query('SELECT name FROM Users WHERE user_id = ?', [guardian_id]);
        const guardianName = guardianRows.length ? guardianRows[0].name : "A guardian";

        const sql = `
            INSERT INTO Guardian_Patient_Link (guardian_id, patient_id, relationship)
            VALUES (?, ?, ?)
        `;
        const [result] = await db.query(sql, [guardian_id, resolvedPatientId, relationship.trim()]);

        // Notify patient
        await createInAppNotification(
            patient.user_id,
            `${guardianName} has linked with your profile as care guardian (${relationship.trim()}).`,
            'system'
        );

        res.status(201).json({
            message: 'Guardian linked to patient successfully',
            link_id: result.insertId,
            patient_name: patient.patient_name
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 👩‍👧 Get guardian’s linked patients with medication adherence overview
export const getGuardianPatients = async (req, res) => {
    const guardian_id = req.user.role === 'guardian' ? req.user.user_id : (req.params.guardian_id || req.user.user_id);

    const sql = `
        SELECT 
            gpl.link_id,
            gpl.relationship,
            p.patient_id, 
            pu.name AS patient_name, 
            pu.email AS patient_email,
            pu.phone_number AS patient_phone,
            p.date_of_birth, 
            p.gender, 
            p.blood_group, 
            p.medical_history,
            (SELECT COUNT(*) FROM Medicine_Reminders WHERE patient_id = p.patient_id) AS total_medicines,
            (SELECT COUNT(*) FROM Medicine_Reminders WHERE patient_id = p.patient_id AND taken = 1) AS taken_today,
            (SELECT COUNT(*) FROM Medicine_Reminders WHERE patient_id = p.patient_id AND taken = 0 AND reminder_time <= CURTIME()) AS pending_today,
            (SELECT COUNT(*) FROM Appointments WHERE patient_id = p.patient_id AND status = 'booked' AND appointment_date >= NOW()) AS upcoming_appointments
        FROM Guardian_Patient_Link gpl
        JOIN Patients p ON gpl.patient_id = p.patient_id
        JOIN Users pu ON p.user_id = pu.user_id
        WHERE gpl.guardian_id = ?
        ORDER BY gpl.link_id DESC
    `;

    try {
        const [rows] = await db.query(sql, [guardian_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ Unlink patient
export const unlinkGuardianPatient = async (req, res) => {
    const { link_id } = req.params;
    const guardian_id = req.user.user_id;

    try {
        const [result] = await db.query(
            'DELETE FROM Guardian_Patient_Link WHERE link_id = ? AND guardian_id = ?',
            [link_id, guardian_id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Link not found or not authorized' });
        }
        res.json({ message: 'Patient unlinked successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
