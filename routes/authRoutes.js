import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { registerUser, loginUser, getCurrentUser, selectUserRole, googleDemoAuth } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Email/Password routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", requireAuth, getCurrentUser);
router.get("/profile", requireAuth, getCurrentUser);
router.post("/select-role", requireAuth, selectUserRole);
router.post("/google-demo", googleDemoAuth);

// Google OAuth routes
router.get("/google", (req, res, next) => {
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login" }),
    (req, res) => {
        try {
            const token = jwt.sign(
                {
                    user_id: req.user.user_id || req.user.googleId,
                    role: req.user.role || "patient",
                },
                process.env.JWT_SECRET || "SECRET_KEY",
                { expiresIn: "7d" }
            );
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            const role = req.user.role || "patient";
            // Redirect to /select-role so user can confirm or choose their role as Patient, Doctor, or Guardian
            res.redirect(`${frontendUrl}/select-role?token=${encodeURIComponent(token)}&role=${encodeURIComponent(role)}&isGoogle=1`);
        } catch (error) {
            res.status(500).json({ error: "Unexpected server error during Google login" });
        }
    }
);

export default router;

