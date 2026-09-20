import express from 'express';
import {
    addReminder,
    getRemindersByPatient,
    getActiveDueReminders,
    getRemindersByGuardian,
    markReminderTaken
} from '../controllers/remindersController.js';

const router = express.Router();

router.get('/due', getActiveDueReminders);
router.post('/add', addReminder);
router.get('/patient/:patient_id', getRemindersByPatient);
router.get('/guardian/:guardian_id', getRemindersByGuardian);
router.get('/guardian', getRemindersByGuardian);
router.put('/:reminder_id/taken', markReminderTaken);

export default router;
