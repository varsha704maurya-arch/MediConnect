import db from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const validRoles = new Set(['patient', 'doctor', 'guardian']);

function issueSession(user, profile) {
    return {
        token: jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET || 'SECRET_KEY', { expiresIn: '7d' }),
        user: { id: user.user_id, name: user.name, email: user.email, phone_number: user.phone_number || null, role: user.role, profile },
    };
}

export async function getProfile(user) {
    if (user.role === 'patient') {
        const [rows] = await db.query('SELECT patient_id, date_of_birth, gender, blood_group, medical_history FROM Patients WHERE user_id = ?', [user.user_id]);
        return rows[0] || null;
    }
    if (user.role === 'doctor') {
        const [rows] = await db.query('SELECT doctor_id, specialization, hospital_name, consultation_fee FROM Doctors WHERE user_id = ?', [user.user_id]);
        return rows[0] || null;
    }
    if (user.role === 'guardian') {
        const [rows] = await db.query('SELECT COUNT(*) as linked_patients_count FROM Guardian_Patient_Link WHERE guardian_id = ?', [user.user_id]);
        return rows[0] || { linked_patients_count: 0 };
    }
    return null;
}

export const registerUser = async (req, res) => {
    const { name, email, password, role, phone_number } = req.body;
    if (!name || !email || !password || !validRoles.has(role)) {
        return res.status(400).json({ error: 'name, email, password, and a valid role are required' });
    }
    try {
        const [existing] = await db.query('SELECT user_id FROM Users WHERE email = ?', [email.toLowerCase().trim()]);
        if (existing.length) return res.status(409).json({ error: 'An account with this email already exists' });

        const [result] = await db.query(
            'INSERT INTO Users (name, email, password_hash, role, phone_number) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email.toLowerCase().trim(), bcrypt.hashSync(password, 10), role, phone_number?.trim() || null]
        );

        if (role === 'patient') {
            await db.query('INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history) VALUES (?, ?, ?, ?, ?)', [result.insertId, null, null, null, '']);
        } else if (role === 'doctor') {
            await db.query('INSERT INTO Doctors (user_id, specialization, hospital_name, consultation_fee) VALUES (?, ?, ?, ?)', [result.insertId, 'General Medicine', 'General Hospital', 50.00]);
        }
        res.status(201).json({ message: 'Account created successfully', user_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const loginUser = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    try {
        const [rows] = await db.query('SELECT user_id, name, email, password_hash, role, phone_number FROM Users WHERE email = ?', [email.toLowerCase().trim()]);
        const user = rows[0];
        if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        if (role && validRoles.has(role) && user.role !== role) {
            return res.status(401).json({ error: `This account is registered as a ${user.role}, not as a ${role}.` });
        }
        const profile = await getProfile(user);
        res.json({ message: 'Login successful', ...issueSession(user, profile) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT user_id, name, email, phone_number, role, email_verified, phone_verified, created_at FROM Users WHERE user_id = ?', [req.user.user_id]);
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        const user = rows[0];
        const profile = await getProfile(user);
        res.json({
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                role: user.role,
                profile,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const selectUserRole = async (req, res) => {
    const { role, specialization, hospital_name, consultation_fee } = req.body;
    if (!validRoles.has(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'patient', 'doctor', or 'guardian'." });
    }

    try {
        const userId = req.user.user_id;

        // Update role in Users table
        await db.query('UPDATE Users SET role = ? WHERE user_id = ?', [role, userId]);

        if (role === 'patient') {
            const [pRows] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [userId]);
            if (!pRows.length) {
                await db.query('INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history) VALUES (?, null, null, null, "")', [userId]);
            }
        } else if (role === 'doctor') {
            const [dRows] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [userId]);
            const spec = specialization?.trim() || 'General Medicine';
            const hosp = hospital_name?.trim() || 'General Hospital';
            const fee = Number(consultation_fee) || 50.00;

            if (!dRows.length) {
                await db.query('INSERT INTO Doctors (user_id, specialization, hospital_name, consultation_fee) VALUES (?, ?, ?, ?)', [userId, spec, hosp, fee]);
            } else {
                await db.query('UPDATE Doctors SET specialization = COALESCE(?, specialization), hospital_name = COALESCE(?, hospital_name), consultation_fee = COALESCE(?, consultation_fee) WHERE user_id = ?', [spec, hosp, fee, userId]);
            }
        }

        const [rows] = await db.query('SELECT user_id, name, email, phone_number, role FROM Users WHERE user_id = ?', [userId]);
        const updatedUser = rows[0];
        const profile = await getProfile(updatedUser);

        res.json({
            message: `Role set to ${role} successfully`,
            ...issueSession(updatedUser, profile)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const googleDemoAuth = async (req, res) => {
    const { email, name, role } = req.body;
    const targetEmail = (email || 'google.user@example.com').toLowerCase().trim();
    const targetName = (name || 'Google User').trim();
    const targetRole = validRoles.has(role) ? role : 'patient';

    try {
        let [rows] = await db.query('SELECT user_id, name, email, phone_number, role FROM Users WHERE email = ?', [targetEmail]);
        let user;

        if (!rows.length) {
            const [result] = await db.query(
                'INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [targetName, targetEmail, bcrypt.hashSync('google-oauth-demo-pwd', 10), targetRole]
            );
            const userId = result.insertId;

            if (targetRole === 'patient') {
                await db.query('INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history) VALUES (?, null, null, null, "")', [userId]);
            } else if (targetRole === 'doctor') {
                await db.query('INSERT INTO Doctors (user_id, specialization, hospital_name, consultation_fee) VALUES (?, ?, ?, ?)', [userId, 'General Physician', 'City Central Hospital', 60.00]);
            }

            const [newRows] = await db.query('SELECT user_id, name, email, phone_number, role FROM Users WHERE user_id = ?', [userId]);
            user = newRows[0];
        } else {
            user = rows[0];
            if (role && validRoles.has(role) && user.role !== role) {
                await db.query('UPDATE Users SET role = ? WHERE user_id = ?', [role, user.user_id]);
                user.role = role;
                if (role === 'patient') {
                    const [pRows] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [user.user_id]);
                    if (!pRows.length) await db.query('INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history) VALUES (?, null, null, null, "")', [user.user_id]);
                } else if (role === 'doctor') {
                    const [dRows] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [user.user_id]);
                    if (!dRows.length) await db.query('INSERT INTO Doctors (user_id, specialization, hospital_name, consultation_fee) VALUES (?, "General Medicine", "City Hospital", 50.00)', [user.user_id]);
                }
            }
        }

        const profile = await getProfile(user);
        res.json({
            message: 'Google authentication successful',
            ...issueSession(user, profile)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

