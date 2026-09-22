import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import db from "../db/connection.js";

// Utility: find or create user
async function findOrCreateUser(email, name, role = "patient") {
    if (!email || !name) throw new Error("Missing required fields: email, name");
    const [rows] = await db.query("SELECT * FROM Users WHERE email = ?", [email.toLowerCase().trim()]);
    if (rows.length > 0) return rows[0];

    const fallbackHash = bcrypt.hashSync(`google-oauth-${Date.now()}`, 10);
    const [result] = await db.query(
        "INSERT INTO Users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [name.trim(), email.toLowerCase().trim(), fallbackHash, role]
    );

    if (role === "patient") {
        await db.query(
            "INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history) VALUES (?, null, null, null, '')",
            [result.insertId]
        );
    }
    return { user_id: result.insertId, name: name.trim(), email: email.toLowerCase().trim(), role };
}

const googleClientId = process.env.GOOGLE_CLIENT_ID || "placeholder-google-client-id";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "placeholder-google-client-secret";
const googleCallbackUrl = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/users/google/callback";

passport.use(
    new GoogleStrategy(
        {
            clientID: googleClientId,
            clientSecret: googleClientSecret,
            callbackURL: googleCallbackUrl,
            scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                if (!profile.emails || profile.emails.length === 0) {
                    return done(new Error("No email found in Google profile"), null);
                }

                const email = profile.emails[0].value;
                const name = profile.displayName || "Google User";
                const user = await findOrCreateUser(email, name, "patient");
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// Serialize/Deserialize
passport.serializeUser((user, done) => {
    done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [rows] = await db.query("SELECT * FROM Users WHERE user_id = ?", [id]);
        done(null, rows[0] || null);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
