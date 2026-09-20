import express from 'express';
import { 
    addPatient, 
    getMyPatientProfile, 
    updatePatientProfile, 
    getDoctorPatients, 
    getPatientById 
} from '../controllers/patientsController.js';
import { allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', allowRoles('patient'), getMyPatientProfile);
router.put('/profile', allowRoles('patient'), updatePatientProfile);
router.post('/add', addPatient);
router.get('/doctor-patients', allowRoles('doctor'), getDoctorPatients);
router.get('/', allowRoles('doctor'), getDoctorPatients);
router.get('/:id', getPatientById);

export default router;
