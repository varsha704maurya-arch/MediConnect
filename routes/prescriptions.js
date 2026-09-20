import express from 'express';
import { addPrescription, addPatientMedication, getPrescriptionsByPatient, getPrescriptionsByDoctor }
    from '../controllers/prescriptionsController.js';

const router = express.Router();

// Root GET route for browser testing
router.get('/', (req, res) => {
    res.json({ message: 'Prescriptions root route working' });
});

router.post('/add', addPrescription);
router.post('/patient-medication', addPatientMedication);
router.get('/patient/:patient_id', getPrescriptionsByPatient);
router.get('/doctor/:doctor_id', getPrescriptionsByDoctor);

export default router;
