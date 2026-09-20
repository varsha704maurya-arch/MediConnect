import express from "express";
import dotenv from "dotenv";
import passport from "passport";
import helmet from "helmet";
import cors from "cors";

// Load environment variables
dotenv.config();

// Load Google OAuth strategy
import "./config/passport.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patients.js";
import doctorRoutes from "./routes/doctors.js";
import appointmentRoutes from "./routes/appointments.js";
import prescriptionRoutes from "./routes/prescriptions.js";
import reminderRoutes from "./routes/reminders.js";
import guardianRoutes from "./routes/guardians.js";
import notificationRoutes from "./routes/notifications.js";
import medicalRecordRoutes from "./routes/medicalRecords.js";
import mapRoutes from "./routes/maps.js"; // Hospital locator
import { requireAuth } from "./middleware/auth.js";
import { sendDueReminderNotifications } from "./services/pushNotifications.js";

const app = express();

// Middleware
app.use(express.json());
app.use(passport.initialize());
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Explicit CORS for frontend
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/.test(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true
}));

// Public routes
app.use("/api/users", authRoutes); // login/register/me under /api/users
app.use("/api/auth", authRoutes); // Backward-compatible Google OAuth callback path

// Protected routes
app.use("/api/patients", requireAuth, patientRoutes);
app.use("/api/doctors", requireAuth, doctorRoutes);
app.use("/api/appointments", requireAuth, appointmentRoutes);
app.use("/api/prescriptions", requireAuth, prescriptionRoutes);
app.use("/api/reminders", requireAuth, reminderRoutes);
app.use("/api/guardians", requireAuth, guardianRoutes);
app.use("/api/notifications", requireAuth, notificationRoutes);
app.use("/api/medical-records", requireAuth, medicalRecordRoutes);
app.use("/api/maps", mapRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", service: "medimate-api", timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("❌ API Error:", err.message);
    const status = err.name === 'MulterError' ? 400 : (err.status || 500);
    res.status(status).json({
        error: err.message || "Unexpected server error",
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 MediConnect API running on port ${PORT}`);
    // Run reminder check on startup and then periodically every 20 seconds
    sendDueReminderNotifications().catch((error) => console.error("Reminder scheduler error:", error.message));
    setInterval(() => {
        sendDueReminderNotifications().catch((error) => console.error("Reminder scheduler error:", error.message));
    }, 20000);
});
