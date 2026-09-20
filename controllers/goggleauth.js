import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../db/connection.js';

async function findOrCreateUser(email, name, role = 'patient') {
    return new Promise((resolve, reject) => {
        if (!email || !name) {
            return reject(new Error("Missing required fields: email, name"));
        }

        try {
            db.query("SELECT * FROM Users WHERE email = ?", [email], (err, rows) => {
                if (err) return reject(new Error(err.message));
                if (rows.length > 0) return resolve(rows[0]);

                db.query(
                    "INSERT INTO Users (name, email, role) VALUES (?, ?, ?)",
                    [name, email, role],
                    (err2, result) => {
                        if (err2) return reject(new Error(err2.message));
                        resolve({ user_id: result.insertId, name, email, role });
                    }
                );
            });
        } catch (error) {
            reject(new Error("Unexpected server error"));
        }
    });
}

// Debug check
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Google Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('Google Strategy registered with scope support');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
    scope: ['profile', 'email']   // ✅ force scope here
}, async (accessToken, refreshToken, profile, done) => {
    try {
        if (!profile.emails || profile.emails.length === 0) {
            return done(new Error("No email found in Google profile"), null);
        }

        const email = profile.emails[0].value;
        const name = profile.displayName || "Unknown User";
        const user = await findOrCreateUser(email, name, 'patient');
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));
