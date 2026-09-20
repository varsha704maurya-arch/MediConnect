import webpush from "web-push";
import dotenv from "dotenv";
import db from "../db/connection.js";

dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const pushConfigured = Boolean(vapidPublicKey && vapidPrivateKey && process.env.VAPID_SUBJECT);

if (pushConfigured) {
    try {
        webpush.setVapidDetails(process.env.VAPID_SUBJECT, vapidPublicKey, vapidPrivateKey);
    } catch (err) {
        console.error("VAPID setup warning:", err.message);
    }
}

export function isPushConfigured() {
    return pushConfigured;
}

export async function sendWebPush(userId, payload) {
    if (!pushConfigured) return false;
    try {
        const [subscriptions] = await db.query(
            "SELECT subscription_id, endpoint, p256dh, auth FROM notification_subscriptions WHERE user_id = ?",
            [userId]
        );
        let delivered = false;
        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    },
                    JSON.stringify(payload)
                );
                delivered = true;
            } catch (error) {
                if (error.statusCode === 404 || error.statusCode === 410) {
                    await db.query("DELETE FROM notification_subscriptions WHERE subscription_id = ?", [sub.subscription_id]);
                }
            }
        }
        return delivered;
    } catch (err) {
        console.error(`Error sending webpush to user ${userId}:`, err.message);
        return false;
    }
}

export async function createInAppNotification(userId, message, type = "reminder", channel = "in_app") {
    try {
        const [result] = await db.query(
            "INSERT INTO notifications (user_id, message, type, channel, status, sent_at) VALUES (?, ?, ?, ?, 'unread', NOW())",
            [userId, message, type, channel]
        );
        return result.insertId;
    } catch (err) {
        console.error("Error creating in-app notification:", err.message);
        return null;
    }
}

export async function getLinkedGuardians(patientId, explicitGuardianId = null) {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT u.user_id, u.name, u.email
            FROM Users u
            JOIN Guardian_Patient_Link gpl ON u.user_id = gpl.guardian_id
            WHERE gpl.patient_id = ?
            UNION
            SELECT u.user_id, u.name, u.email
            FROM Users u
            WHERE u.user_id = ? AND u.role = 'guardian'
        `, [patientId, explicitGuardianId || 0]);
        return rows;
    } catch (err) {
        console.error("Error fetching linked guardians:", err.message);
        return [];
    }
}

/**
 * Authoritative Medicine Reminder & 2-Minute Escalation Scheduler
 * 1. Resets taken status on daily rollover for recurring reminders.
 * 2. Checks due reminders (reminder_time <= CURTIME() and taken = 0).
 * 3. Sends first notification to patient.
 * 4. Repeats every 2 minutes if patient has not clicked TAKEN.
 * 5. Notifies linked guardians if patient fails to acknowledge.
 */
export async function sendDueReminderNotifications() {
    try {
        // Daily rollover reset: if notified_date is before today, reset for the new day
        await db.query(`
            UPDATE Medicine_Reminders
            SET taken = 0, taken_at = NULL, notification_sent = 0, escalated_to_guardian = 0, last_notified_at = NULL
            WHERE notified_date IS NOT NULL AND notified_date < CURDATE()
        `);

        // Fetch due and unacknowledged reminders
        // Condition: taken = 0 AND reminder_time <= CURTIME()
        // And either:
        // A) Not notified today yet (notified_date IS NULL OR notified_date < CURDATE() OR notification_sent = 0)
        // B) Repeated reminder due (notified_date = CURDATE() AND notification_sent = 1 AND TIMESTAMPDIFF(SECOND, last_notified_at, NOW()) >= 120)
        const [reminders] = await db.query(`
            SELECT 
                r.reminder_id, 
                r.reminder_time, 
                r.taken, 
                r.notification_sent, 
                r.notified_date, 
                r.last_notified_at,
                r.escalated_to_guardian,
                r.guardian_id,
                r.patient_id,
                COALESCE(p.medicine_name, 'Prescribed Medicine') AS medicine_name, 
                COALESCE(p.dosage, 'As directed') AS dosage, 
                COALESCE(p.instructions, '') AS instructions,
                pt.user_id AS patient_user_id,
                pu.name AS patient_name
            FROM Medicine_Reminders r
            LEFT JOIN Prescriptions p ON r.prescription_id = p.prescription_id
            JOIN Patients pt ON r.patient_id = pt.patient_id
            JOIN Users pu ON pt.user_id = pu.user_id
            WHERE r.taken = 0
              AND r.reminder_time <= CURTIME()
              AND (
                  r.notified_date IS NULL 
                  OR r.notified_date < CURDATE() 
                  OR r.notification_sent = 0
                  OR (r.last_notified_at IS NOT NULL AND TIMESTAMPDIFF(SECOND, r.last_notified_at, NOW()) >= 120)
              )
        `);

        for (const reminder of reminders) {
            const isFirstNotification = !reminder.notification_sent || reminder.notified_date !== new Date().toISOString().slice(0, 10);
            const timeFormatted = reminder.reminder_time ? String(reminder.reminder_time).slice(0, 5) : "";

            if (isFirstNotification) {
                // 1. Initial reminder to patient
                const patientMsg = `Time for your medicine: ${reminder.medicine_name} (${reminder.dosage}) is scheduled for ${timeFormatted}.`;
                await createInAppNotification(reminder.patient_user_id, patientMsg, "reminder");
                await sendWebPush(reminder.patient_user_id, {
                    title: `Medicine Reminder: ${reminder.medicine_name}`,
                    body: `${reminder.dosage} is due now. Tap to confirm.`,
                    reminderId: reminder.reminder_id,
                });

                await db.query(
                    `UPDATE Medicine_Reminders 
                     SET notified_date = CURDATE(), notification_sent = 1, last_notified_at = NOW() 
                     WHERE reminder_id = ?`,
                    [reminder.reminder_id]
                );
            } else {
                // 2. Repeated reminder (every 2 minutes)
                const repeatMsg = `REMINDER: Please take ${reminder.medicine_name} (${reminder.dosage}). Scheduled for ${timeFormatted}.`;
                await createInAppNotification(reminder.patient_user_id, repeatMsg, "reminder");
                await sendWebPush(reminder.patient_user_id, {
                    title: `Repeated Reminder: ${reminder.medicine_name}`,
                    body: `Please take your ${reminder.dosage} dose and confirm.`,
                    reminderId: reminder.reminder_id,
                });

                // 3. Escalate to Guardian(s)
                const guardians = await getLinkedGuardians(reminder.patient_id, reminder.guardian_id);
                for (const guardian of guardians) {
                    const guardianMsg = `ALERT: ${reminder.patient_name} has not yet acknowledged scheduled medicine: ${reminder.medicine_name} (${reminder.dosage}) due at ${timeFormatted}.`;
                    await createInAppNotification(guardian.user_id, guardianMsg, "reminder");
                    await sendWebPush(guardian.user_id, {
                        title: `MediConnect Alert: Unacknowledged Medicine`,
                        body: guardianMsg,
                        patientId: reminder.patient_id,
                        reminderId: reminder.reminder_id,
                    });
                }

                await db.query(
                    `UPDATE Medicine_Reminders 
                     SET last_notified_at = NOW(), escalated_to_guardian = 1 
                     WHERE reminder_id = ?`,
                    [reminder.reminder_id]
                );
            }
        }
    } catch (error) {
        console.error("sendDueReminderNotifications error:", error.message);
    }
}

/**
 * Authoritatively record a dose as taken in MySQL and notify linked parties.
 */
export async function recordDoseTaken(reminderId, actingUserId) {
    const [reminders] = await db.query(`
        SELECT 
            r.reminder_id, 
            r.patient_id,
            r.reminder_time,
            r.guardian_id,
            COALESCE(p.medicine_name, 'Prescribed Medicine') AS medicine_name,
            COALESCE(p.dosage, 'As directed') AS dosage,
            pt.user_id AS patient_user_id,
            pu.name AS patient_name
        FROM Medicine_Reminders r
        LEFT JOIN Prescriptions p ON r.prescription_id = p.prescription_id
        JOIN Patients pt ON r.patient_id = pt.patient_id
        JOIN Users pu ON pt.user_id = pu.user_id
        WHERE r.reminder_id = ?
    `, [reminderId]);

    if (!reminders.length) {
        throw new Error("Reminder not found");
    }

    const reminder = reminders[0];
    const isPatientOwner = actingUserId === reminder.patient_user_id;
    if (!isPatientOwner) {
        const [links] = await db.query(
            "SELECT link_id FROM Guardian_Patient_Link WHERE guardian_id = ? AND patient_id = ?",
            [actingUserId, reminder.patient_id]
        );
        if (!links.length) {
            throw new Error("You are not authorized to confirm this dose");
        }
    }

    // Mark taken in MySQL
    await db.query(`
        UPDATE Medicine_Reminders 
        SET taken = 1, taken_at = NOW(), notification_sent = 0, escalated_to_guardian = 0
        WHERE reminder_id = ?
    `, [reminderId]);

    // Send confirmation in-app notification to patient
    await createInAppNotification(
        reminder.patient_user_id,
        `Dose confirmed: ${reminder.medicine_name} (${reminder.dosage}) recorded as taken.`,
        "reminder"
    );

    // Notify linked guardians that the dose was taken
    const guardians = await getLinkedGuardians(reminder.patient_id, reminder.guardian_id);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    for (const guardian of guardians) {
        const guardianMsg = `${reminder.patient_name} has taken ${reminder.medicine_name} (${reminder.dosage}) at ${nowStr}.`;
        await createInAppNotification(guardian.user_id, guardianMsg, "reminder");
        await sendWebPush(guardian.user_id, {
            title: "Medicine Taken",
            body: guardianMsg,
            patientId: reminder.patient_id,
            reminderId: reminder.reminder_id,
        });
    }

    return {
        reminder_id: reminder.reminder_id,
        taken: true,
        taken_at: new Date().toISOString(),
        medicine_name: reminder.medicine_name
    };
}
