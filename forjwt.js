import express from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { addPrescription, getPrescriptionsByPatient } from '../controllers/prescriptionsController.js';

const router = express.Router();

// Protected route: only logged-in users can add prescriptions
router.post('/prescriptions/add', authenticateJWT, addPrescription);

// Protected route: only logged-in users can view prescriptions
router.get('/prescriptions/patient/:patient_id', authenticateJWT, getPrescriptionsByPatient);

export default router;
