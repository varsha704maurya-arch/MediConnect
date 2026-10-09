import db from "../db/connection.js";

// 📋 Get all notifications for current authenticated user
export const getUserNotifications = async (req, res) => {
    const userId = req.user.user_id;
    try {
        const [rows] = await db.query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            [userId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ Mark a notification as read (with user verification)
export const markNotificationRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    try {
        const [result] = await db.query(
            "UPDATE notifications SET status = 'read' WHERE notification_id = ? AND user_id = ?",
            [id, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Notification not found or unauthorized" });
        }
        res.json({ message: "Notification marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 📭 Mark all notifications as read
export const markAllNotificationsRead = async (req, res) => {
    const userId = req.user.user_id;
    try {
        await db.query(
            "UPDATE notifications SET status = 'read' WHERE user_id = ? AND status = 'unread'",
            [userId]
        );
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ➕ Create a new notification (Internal/Admin)
export const createNotification = async (req, res) => {
    const { userId, message, type } = req.body;
    const targetUserId = userId || req.user.user_id;
    try {
        await db.query(
            "INSERT INTO notifications (user_id, message, type, channel, status, sent_at) VALUES (?, ?, ?, 'in_app', 'unread', NOW())",
            [targetUserId, message, type || 'system']
        );
        res.json({ message: "Notification created successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🛡️ Helper to ensure subscriptions table exists
async function ensureNotificationSubscriptionsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS notification_subscriptions (
                subscription_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh VARCHAR(255) NOT NULL,
                auth VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user_subs (user_id)
            )
        `);
    } catch {
        // Table may already exist
    }
}

// 🔑 Return VAPID Public Key for client push registration
export const getVapidPublicKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY || "";
    res.json({
        vapidPublicKey: key,
        key: key
    });
};

// 📲 Save push subscription
export const savePushSubscription = async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "A valid push subscription is required" });
    }
    try {
        await ensureNotificationSubscriptionsTable();
        await db.query("DELETE FROM notification_subscriptions WHERE endpoint = ?", [endpoint]);
        await db.query(
            "INSERT INTO notification_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)",
            [req.user.user_id, endpoint, keys.p256dh, keys.auth],
        );
        res.status(201).json({ message: "Push notifications enabled" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🔕 Remove push subscription
export const removePushSubscription = async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "endpoint is required" });
    try {
        await db.query("DELETE FROM notification_subscriptions WHERE user_id = ? AND endpoint = ?", [req.user.user_id, endpoint]);
        res.json({ message: "Push notifications disabled" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
