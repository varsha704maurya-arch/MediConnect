import fs from 'fs';
import path from 'path';
import multer from 'multer';
import db from '../db/connection.js';

// Setup uploads directory
const uploadDir = path.join(process.cwd(), 'uploads', 'medical_records');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `record-${uniqueSuffix}${ext}`);
    }
});

// Allowed file types for medical reports
const allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
]);

export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, PNG, and WebP medical files are permitted'));
        }
    }
});

// ➕ Upload new medical record
export const uploadMedicalRecord = async (req, res) => {
    try {
        let { patient_id, title, record_type, notes } = req.body;

        if (req.user.role === 'patient') {
            const [patients] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
            if (!patients.length) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: "Patient profile not found" });
            }
            patient_id = patients[0].patient_id;
        }

        if (!patient_id || !title) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "Title and patient are required" });
        }

        const validTypes = new Set(['report', 'prescription', 'lab_result', 'scan', 'other']);
        const recordType = validTypes.has(record_type) ? record_type : 'other';

        // file_url stores local relative path or file key
        const fileUrl = req.file ? req.file.filename : 'text_entry_only';

        const sql = `
            INSERT INTO Medical_Records (patient_id, uploaded_by, title, record_type, file_url, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(sql, [
            patient_id,
            req.user.user_id,
            title.trim(),
            recordType,
            fileUrl,
            notes?.trim() || null
        ]);

        res.status(201).json({
            message: "Medical record saved successfully",
            record_id: result.insertId,
            title: title.trim(),
            record_type: recordType
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
};

// 📋 Get records for patient (with strict authorization)
export const getPatientMedicalRecords = async (req, res) => {
    let { patient_id } = req.params;

    if (req.user.role === 'patient') {
        const [patients] = await db.query('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
        if (!patients.length) return res.json([]);
        patient_id = patients[0].patient_id;
    }

    try {
        // Authorization check:
        // 1. If requester is a doctor: must have at least one appointment with this patient
        if (req.user.role === 'doctor') {
            const [docRows] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [req.user.user_id]);
            if (!docRows.length) return res.status(403).json({ error: "Doctor profile not found" });
            const doctorId = docRows[0].doctor_id;

            const [aptRows] = await db.query(
                'SELECT appointment_id FROM Appointments WHERE doctor_id = ? AND patient_id = ?',
                [doctorId, patient_id]
            );
            if (!aptRows.length) {
                return res.status(403).json({ error: "You are not authorized to access this patient's medical records." });
            }
        }

        // 2. If requester is a guardian: must be linked in Guardian_Patient_Link
        if (req.user.role === 'guardian') {
            const [linkRows] = await db.query(
                'SELECT link_id FROM Guardian_Patient_Link WHERE guardian_id = ? AND patient_id = ?',
                [req.user.user_id, patient_id]
            );
            if (!linkRows.length) {
                return res.status(403).json({ error: "Access denied: patient is not linked to your guardian account." });
            }
        }

        const sql = `
            SELECT 
                mr.record_id,
                mr.patient_id,
                mr.uploaded_by,
                mr.title,
                mr.record_type,
                mr.file_url,
                mr.notes,
                mr.created_at,
                u.name AS uploader_name,
                u.role AS uploader_role
            FROM Medical_Records mr
            JOIN Users u ON mr.uploaded_by = u.user_id
            WHERE mr.patient_id = ?
            ORDER BY mr.created_at DESC
        `;

        const [rows] = await db.query(sql, [patient_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 📥 Securely download / view medical record file
export const downloadMedicalRecord = async (req, res) => {
    const { record_id } = req.params;

    try {
        const [rows] = await db.query(`
            SELECT mr.*, p.user_id AS patient_user_id
            FROM Medical_Records mr
            JOIN Patients p ON mr.patient_id = p.patient_id
            WHERE mr.record_id = ?
        `, [record_id]);

        if (!rows.length) return res.status(404).json({ error: "Medical record not found" });
        const record = rows[0];

        // Access check
        const isOwner = req.user.user_id === record.patient_user_id;
        let isAuthorizedDoctor = false;
        let isAuthorizedGuardian = false;

        if (req.user.role === 'doctor') {
            const [docRows] = await db.query('SELECT doctor_id FROM Doctors WHERE user_id = ?', [req.user.user_id]);
            if (docRows.length) {
                const [apts] = await db.query('SELECT appointment_id FROM Appointments WHERE doctor_id = ? AND patient_id = ?', [docRows[0].doctor_id, record.patient_id]);
                if (apts.length) isAuthorizedDoctor = true;
            }
        }

        if (req.user.role === 'guardian') {
            const [links] = await db.query('SELECT link_id FROM Guardian_Patient_Link WHERE guardian_id = ? AND patient_id = ?', [req.user.user_id, record.patient_id]);
            if (links.length) isAuthorizedGuardian = true;
        }

        if (!isOwner && !isAuthorizedDoctor && !isAuthorizedGuardian && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized to access this document" });
        }

        if (!record.file_url || record.file_url === 'text_entry_only') {
            return res.status(404).json({ error: "This record does not contain an uploaded file attachment." });
        }

        // Prevent path traversal
        const safeFilename = path.basename(record.file_url);
        const filePath = path.join(uploadDir, safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File attachment could not be found on server." });
        }

        res.download(filePath, record.title + path.extname(safeFilename));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ Delete medical record
export const deleteMedicalRecord = async (req, res) => {
    const { record_id } = req.params;

    try {
        const [rows] = await db.query(`
            SELECT mr.*, p.user_id AS patient_user_id
            FROM Medical_Records mr
            JOIN Patients p ON mr.patient_id = p.patient_id
            WHERE mr.record_id = ?
        `, [record_id]);

        if (!rows.length) return res.status(404).json({ error: "Record not found" });
        const record = rows[0];

        // Only uploader, patient owner, or admin can delete
        const canDelete = req.user.user_id === record.uploaded_by || req.user.user_id === record.patient_user_id || req.user.role === 'admin';
        if (!canDelete) {
            return res.status(403).json({ error: "You are not authorized to delete this record" });
        }

        if (record.file_url && record.file_url !== 'text_entry_only') {
            const safeFilename = path.basename(record.file_url);
            const filePath = path.join(uploadDir, safeFilename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await db.query('DELETE FROM Medical_Records WHERE record_id = ?', [record_id]);
        res.json({ message: "Medical record deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
