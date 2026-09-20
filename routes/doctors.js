import express from 'express';
import { 
    addDoctor, 
    getDoctors, 
    getMyDoctorProfile, 
    updateDoctorProfile, 
    getDoctorById 
} from '../controllers/doctorsController.js';
import { allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', allowRoles('doctor'), getMyDoctorProfile);
router.put('/profile', allowRoles('doctor'), updateDoctorProfile);
router.post('/add', addDoctor);
router.get('/', getDoctors);
router.get('/:id', getDoctorById);

export default router;
