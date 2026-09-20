import express from 'express';
import { 
    uploadMedicalRecord, 
    getPatientMedicalRecords, 
    downloadMedicalRecord, 
    deleteMedicalRecord,
    uploadMiddleware
} from '../controllers/medicalRecordsController.js';

const router = express.Router();

router.post('/upload', uploadMiddleware.single('file'), uploadMedicalRecord);
router.get('/patient/:patient_id', getPatientMedicalRecords);
router.get('/my', getPatientMedicalRecords);
router.get('/:record_id/download', downloadMedicalRecord);
router.delete('/:record_id', deleteMedicalRecord);

export default router;
