import express from "express";
import {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    createNotification,
    savePushSubscription,
    removePushSubscription
} from "../controllers/notificationsController.js";

const router = express.Router();

router.get("/my", getUserNotifications);
router.get("/", getUserNotifications);
router.get("/:userId", getUserNotifications);
router.put("/read-all", markAllNotificationsRead);
router.put("/:id/read", markNotificationRead);
router.post("/", createNotification);
router.post("/push-subscription", savePushSubscription);
router.delete("/push-subscription", removePushSubscription);

export default router;
