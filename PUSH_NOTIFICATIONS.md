# Mobile medicine notifications

1. Run both SQL migrations against the MediConnect database:
   - `database/001_add_phone_number.sql`
   - `database/002_add_push_notifications.sql`
2. Generate a VAPID key pair from the repository root:
   `npx web-push generate-vapid-keys`
3. Add the generated public and private keys to the backend `.env` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Set `VAPID_SUBJECT` to a `mailto:` address.
4. Copy the public key to `mediconnect-frontend/.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
5. Start the API and frontend. Sign in as a patient, open the patient dashboard, and tap `Enable notifications`.

The API checks due reminders every 30 seconds and sends one push notification per reminder per calendar day. The phone must allow notifications, and production mobile browsers require HTTPS. Localhost is allowed for development. iPhone users should open the HTTPS site in Safari and add it to the Home Screen before enabling notifications.
