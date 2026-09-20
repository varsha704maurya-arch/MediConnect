import express from 'express';
import { bookAppointment, getAppointments, updateAppointmentStatus, getAppointmentMessages, sendAppointmentMessage } from '../controllers/appointmentsController.js';

const router = express.Router();

router.post('/book', bookAppointment);
router.get('/', getAppointments);
router.put('/:appointment_id/status', updateAppointmentStatus);
router.get('/:appointment_id/messages', getAppointmentMessages);
router.post('/:appointment_id/messages', sendAppointmentMessage);

export default router;

