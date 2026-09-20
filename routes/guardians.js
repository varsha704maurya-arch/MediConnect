import express from 'express';
import {
    linkGuardianToPatient,
    getGuardianPatients,
    unlinkGuardianPatient
} from '../controllers/guardianController.js';
import { getRemindersByGuardian } from '../controllers/remindersController.js';
import { allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.post('/link', allowRoles('guardian', 'admin'), linkGuardianToPatient);
router.delete('/link/:link_id', allowRoles('guardian', 'admin'), unlinkGuardianPatient);
router.get('/my/patients', allowRoles('guardian'), getGuardianPatients);
router.get('/:guardian_id/patients', getGuardianPatients);
router.get('/:guardian_id/reminders', getRemindersByGuardian);
router.get('/reminders', allowRoles('guardian'), getRemindersByGuardian);

export default router;
