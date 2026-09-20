import db from '../db/connection.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 📝 Register user
export const registerUser = (req, res) => {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Missing required fields: name, email, password, role" });
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert into Users (only Users has name/email)
        const sql = 'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)';
        db.query(sql, [name, email, hashedPassword, role], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            const userId = result.insertId;

            // Role-specific inserts
            if (role === 'patient') {
                const patientSql = `
                    INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history)
                    VALUES (?, ?, ?, ?, ?)
                `;
                db.query(patientSql, [userId, null, null, null, ''], (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    return res.status(201).json({ message: 'Patient registered successfully', user_id: userId });
                });
            } else if (role === 'doctor') {
                const doctorSql = `
                    INSERT INTO Doctors (user_id, specialization, hospital_name, consultation_fee)
                    VALUES (?, ?, ?, ?)
                `;
                db.query(doctorSql, [userId, 'General', 'Default Hospital', 0], (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    return res.status(201).json({ message: 'Doctor registered successfully', user_id: userId });
                });
            } else if (role === 'guardian') {
                // Guardians are just Users with role='guardian'
                // Linking happens later in Guardian_Patient_Link
                return res.status(201).json({ message: 'Guardian registered successfully', user_id: userId });
            } else {
                return res.status(201).json({ message: 'User registered successfully', user_id: userId });
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Unexpected server error" });
    }
};

// 🔑 Login user
export const loginUser = (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ error: "Missing required fields: email, password" });
    }

    const sql = 'SELECT * FROM Users WHERE email = ?';

    try {
        db.query(sql, [email], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

            const user = results[0];
            const isValidPassword = bcrypt.compareSync(password, user.password_hash);
            if (!isValidPassword) return res.status(401).json({ error: 'Invalid email or password' });

            const token = jwt.sign(
                { user_id: user.user_id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Fetch role-specific profile
            let profileSql;
            if (user.role === 'patient') {
                profileSql = `
                    SELECT p.patient_id, u.name AS patient_name, u.email,
                           p.date_of_birth, p.gender, p.blood_group, p.medical_history
                    FROM Patients p
                    JOIN Users u ON p.user_id = u.user_id
                    WHERE p.user_id = ?
                `;
            } else if (user.role === 'doctor') {
                profileSql = `
                    SELECT d.doctor_id, u.name AS doctor_name, u.email,
                           d.specialization, d.hospital_name, d.consultation_fee
                    FROM Doctors d
                    JOIN Users u ON d.user_id = u.user_id
                    WHERE d.user_id = ?
                `;
            } else if (user.role === 'guardian') {
                profileSql = `
                    SELECT u.name AS guardian_name, u.email, gpl.relationship,
                           p.patient_id, p.medical_history
                    FROM Guardian_Patient_Link gpl
                    JOIN Users u ON gpl.guardian_id = u.user_id
                    JOIN Patients p ON gpl.patient_id = p.patient_id
                    WHERE gpl.guardian_id = ?
                `;
            }

            if (profileSql) {
                db.query(profileSql, [user.user_id], (err2, profileResults) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    return res.json({
                        message: 'Login successful',
                        token,
                        user: {
                            id: user.user_id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            profile: profileResults[0] || null
                        }
                    });
                });
            } else {
                return res.json({
                    message: 'Login successful',
                    token,
                    user: {
                        id: user.user_id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Unexpected server error" });
    }
};
