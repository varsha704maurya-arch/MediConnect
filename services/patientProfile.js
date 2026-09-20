import db from '../db/connection.js';

export async function ensurePatientProfile(userId) {
    await db.query(
        `INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history)
         VALUES (?, NULL, NULL, NULL, '')
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
        [userId]
    );

    const [rows] = await db.query(
        'SELECT patient_id FROM Patients WHERE user_id = ?',
        [userId]
    );

    return rows[0] || null;
}