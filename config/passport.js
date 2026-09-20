import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import db from "../db/connection.js";

// Utility: find or create user
async function findOrCreateUser(email, name, role = "patient") {
    if (!email || !name) throw new Error("Missing required fields: email, name");
    const [rows] = await db.query("SELECT * FROM Users WHERE email = ?", [email]);
    if (rows.length > 0) return rows[0];
    const [result] = await db.query("INSERT INTO Users (name, email, role) VALUES (?, ?, ?)", [name, email, role]);
    if (role === "patient") await db.query("INSERT INTO Patients (user_id, date_of_birth, gender, blood_group, medical_history) VALUES (?, ?, ?, ?, ?)", [result.insertId, null, null, null, ""]);
    return { user_id: result.insertId, name, email, role };
}

// Debug check
console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Google Redirect URI:", process.env.GOOGLE_REDIRECT_URI);

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_REDIRECT_URI,
            scope: ["profile", "email"], // ✅ force scope
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                if (!profile.emails || profile.emails.length === 0) {
                    return done(new Error("No email found in Google profile"), null);
                }

                const email = profile.emails[0].value;
                const name = profile.displayName || "Unknown User";
                const user = await findOrCreateUser(email, name, "patient");
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// Serialize/Deserialize (optional but good practice)
passport.serializeUser((user, done) => {
    done(null, user.user_id);
});

passport.deserializeUser((id, done) => {
    db.query("SELECT * FROM Users WHERE user_id = ?", [id], (err, rows) => {
        if (err) return done(err);
        done(null, rows[0]);
    });
});

export default passport;
