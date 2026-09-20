-- Safe backwards-compatible migration for MediConnect repeated reminders & escalation
ALTER TABLE Medicine_Reminders
    ADD COLUMN IF NOT EXISTS last_notified_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS escalated_to_guardian TINYINT(1) DEFAULT 0;

-- Add reminder and appointment indexes needed for efficient due-check + escalation queries
CREATE INDEX IF NOT EXISTS idx_medicine_reminders_patient_taken
    ON Medicine_Reminders (patient_id, taken);

CREATE INDEX IF NOT EXISTS idx_medicine_reminders_guardian_id
    ON Medicine_Reminders (guardian_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_doctor_date
    ON Appointments (patient_id, doctor_id, appointment_date);
