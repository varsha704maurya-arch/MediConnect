import db from '../db/connection.js';

// ➕ Add Doctor
export const addDoctor = async (req, res) => {
    const { user_id, specialization, hospital_name, consultation_fee } = req.body;
    const targetUserId = req.user.role === 'admin' ? user_id : req.user.user_id;

    if (!specialization || !hospital_name) {
        return res.status(400).json({
            error: "Missing required fields: specialization, hospital_name"
        });
    }

    const sql = `
        INSERT INTO Doctors (user_id, specialization, hospital_name, consultation_fee)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            specialization = VALUES(specialization),
            hospital_name = VALUES(hospital_name),
            consultation_fee = VALUES(consultation_fee)
    `;

    try {
        const [result] = await db.query(sql, [targetUserId, specialization, hospital_name, consultation_fee || 0]);
        res.status(201).json({ message: 'Doctor profile saved successfully', doctor_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📋 Get all Doctors (for patient booking and directory)
export const getDoctors = async (req, res) => {
    const sql = `
        SELECT d.doctor_id, d.user_id, u.name AS doctor_name, u.email, u.phone_number,
               d.specialization, d.hospital_name, d.consultation_fee
        FROM Doctors d
        JOIN Users u ON d.user_id = u.user_id
        ORDER BY u.name ASC
    `;

    try {
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 👤 Get current logged-in doctor profile
export const getMyDoctorProfile = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.doctor_id, d.user_id, u.name AS doctor_name, u.email, u.phone_number,
                   d.specialization, d.hospital_name, d.consultation_fee
            FROM Doctors d
            JOIN Users u ON d.user_id = u.user_id
            WHERE d.user_id = ?
        `, [req.user.user_id]);

        if (!rows.length) {
            return res.status(404).json({ error: "Doctor profile not found" });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ✏️ Update doctor profile
export const updateDoctorProfile = async (req, res) => {
    const { name, phone_number, specialization, hospital_name, consultation_fee } = req.body;
    try {
        if (name || phone_number) {
            await db.query(`
                UPDATE Users 
                SET name = COALESCE(?, name), phone_number = COALESCE(?, phone_number)
                WHERE user_id = ?
            `, [name?.trim() || null, phone_number?.trim() || null, req.user.user_id]);
        }

        await db.query(`
            UPDATE Doctors
            SET specialization = COALESCE(?, specialization),
                hospital_name = COALESCE(?, hospital_name),
                consultation_fee = COALESCE(?, consultation_fee)
            WHERE user_id = ?
        `, [specialization?.trim() || null, hospital_name?.trim() || null, consultation_fee !== undefined ? consultation_fee : null, req.user.user_id]);

        const [updated] = await db.query(`
            SELECT d.doctor_id, d.user_id, u.name AS doctor_name, u.email, u.phone_number,
                   d.specialization, d.hospital_name, d.consultation_fee
            FROM Doctors d
            JOIN Users u ON d.user_id = u.user_id
            WHERE d.user_id = ?
        `, [req.user.user_id]);

        res.json({ message: "Doctor profile updated", profile: updated[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔍 Get single doctor by id
export const getDoctorById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT d.doctor_id, d.user_id, u.name AS doctor_name, u.email, u.phone_number,
                   d.specialization, d.hospital_name, d.consultation_fee
            FROM Doctors d
            JOIN Users u ON d.user_id = u.user_id
            WHERE d.doctor_id = ?
        `, [id]);

        if (!rows.length) return res.status(404).json({ error: "Doctor not found" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
