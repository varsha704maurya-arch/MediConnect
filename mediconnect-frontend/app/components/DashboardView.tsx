"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";

type DashboardItem = {
    title: string;
    detail: string;
    status?: string;
    tone?: "teal" | "amber" | "slate";
};

type DashboardViewProps = {
    role: "Patient" | "Doctor" | "Guardian";
    eyebrow: string;
    title: string;
    intro: string;
    metric: { value: string; label: string; change: string };
    items: DashboardItem[];
    sideTitle: string;
    sideItems: DashboardItem[];
};

type Doctor = { doctor_id: number; doctor_name: string; specialization: string; hospital_name: string };
type PatientProfile = { patient_id: number; patient_name: string; patient_email?: string; date_of_birth?: string; gender?: string; blood_group?: string; medical_history?: string; relationship?: string };
type Reminder = { reminder_id: number; reminder_time: string; taken: boolean; medicine_name: string; dosage: string; instructions?: string };

function urlBase64ToUint8Array(value: string) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

const emptySubscribe = () => () => undefined;
const getServerRole = () => null;
const getBrowserRole = () => typeof window === "undefined" ? null : localStorage.getItem("role");

const toneClasses = {
    teal: "bg-[#e7f5f1] text-[#167d72]",
    amber: "bg-[#fff4df] text-[#a46613]",
    slate: "bg-[#eef2f3] text-[#60716f]",
};

function ItemRow({ item }: { item: DashboardItem }) {
    return (
        <li className="flex items-start justify-between gap-4 border-b border-[var(--line)] py-4 last:border-0 last:pb-0">
            <div>
                <p className="font-medium text-[#26403c]">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{item.detail}</p>
            </div>
            {item.status && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[item.tone ?? "slate"]}`}>{item.status}</span>}
        </li>
    );
}

export default function DashboardView({ role, eyebrow, title, intro, metric, items, sideTitle, sideItems }: DashboardViewProps) {
    const router = useRouter();
    const storedRole = useSyncExternalStore(emptySubscribe, getBrowserRole, getServerRole);
    const sessionReady = storedRole === role.toLowerCase();
    const [showBooking, setShowBooking] = useState(false);
    const [showMedication, setShowMedication] = useState(false);
    const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [bookingMessage, setBookingMessage] = useState("");
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [nearby, setNearby] = useState<{ name: string; directions_url: string }[]>([]);
    const [patientProfiles, setPatientProfiles] = useState<PatientProfile[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [notificationState, setNotificationState] = useState<"unsupported" | "default" | "granted" | "denied">("unsupported");
    const [reminderMessage, setReminderMessage] = useState("");
    const [medicationMessage, setMedicationMessage] = useState("");

    const isPatient = role === "Patient";
    const isDoctor = role === "Doctor";

    useEffect(() => {
        const storedRole = localStorage.getItem("role");
        const expectedRole = role.toLowerCase();
        if (storedRole !== expectedRole) {
            router.replace(storedRole && ["patient", "doctor", "guardian"].includes(storedRole) ? `/${storedRole}` : "/login");
            return;
        }
    }, [role, router]);

    useEffect(() => {
        if (!isPatient) return;
        apiRequest<Doctor[]>("/doctors").then((data) => { setDoctors(data); setSelectedDoctor(String(data[0]?.doctor_id || "")); }).catch(() => setDoctors([]));
    }, [isPatient]);

    useEffect(() => {
        if (!isPatient) return;
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const patientId = user.profile?.patient_id;
        if (!patientId) return;
        apiRequest<Reminder[]>(`/reminders/patient/${patientId}`).then(setReminders).catch(() => setReminders([]));
    }, [isPatient]);

    useEffect(() => {
        if (isPatient) return;
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const request = isDoctor ? apiRequest<PatientProfile[]>("/patients") : apiRequest<PatientProfile[]>(`/guardians/${user.id}/patients`);
        request.then(setPatientProfiles).catch(() => setPatientProfiles([]));
    }, [isDoctor, isPatient]);

    async function markTaken(reminder: Reminder) {
        try {
            await apiRequest(`/reminders/${reminder.reminder_id}/taken`, { method: "PUT" });
            setReminders((current) => current.map((item) => item.reminder_id === reminder.reminder_id ? { ...item, taken: true } : item));
        } catch (error) {
            setReminderMessage(error instanceof Error ? error.message : "Unable to update this dose.");
        }
    }

    async function enableNotifications() {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
            setNotificationState("unsupported");
            setReminderMessage("Push notifications need HTTPS, a supported mobile browser, and server notification keys.");
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            setNotificationState(permission);
            setReminderMessage("Allow notifications in your browser settings to receive medicine reminders.");
            return;
        }
        try {
            const registration = await navigator.serviceWorker.register("/sw.js");
            const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
            await apiRequest("/notifications/push-subscription", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
            setNotificationState("granted");
            setReminderMessage("Notifications are enabled on this device.");
        } catch (error) {
            setReminderMessage(error instanceof Error ? error.message : "Unable to enable notifications on this device.");
        }
    }

    function findNearbyCare() {
        setLocationState("loading");
        if (!navigator.geolocation) {
            setLocationState("error");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => apiRequest<{ hospitals: { name: string; directions_url: string }[] }>(`/maps/nearby?lat=${position.coords.latitude}&lng=${position.coords.longitude}`).then((data) => { setNearby(data.hospitals || []); setLocationState("ready"); }).catch(() => setLocationState("error")),
            () => setLocationState("error"),
            { enableHighAccuracy: true, timeout: 8000 },
        );
    }

    function submitBooking(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        apiRequest("/appointments/book", { method: "POST", body: JSON.stringify({ patient_id: user.profile?.patient_id, doctor_id: Number(selectedDoctor), appointment_date: form.get("appointment_date"), consultation_type: form.get("consultation_type"), notes: form.get("reason") }) }).then(() => setBookingMessage("Appointment request saved. We will confirm the time shortly.")).catch((error: Error) => setBookingMessage(error.message));
    }

    async function submitMedication(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        try {
            await apiRequest("/prescriptions/patient-medication", {
                method: "POST",
                body: JSON.stringify({
                    doctor_id: Number(selectedDoctor),
                    medicine_name: form.get("medicine_name"),
                    dosage: form.get("dosage"),
                    reminder_time: form.get("reminder_time"),
                    duration_days: form.get("duration_days") || null,
                    instructions: form.get("instructions"),
                }),
            });
            const updated = await apiRequest<Reminder[]>(`/reminders/patient/${user.profile?.patient_id}`);
            setReminders(updated);
            setMedicationMessage("Medication and reminder added.");
            event.currentTarget.reset();
        } catch (error) {
            setMedicationMessage(error instanceof Error ? error.message : "Unable to add this medication.");
        }
    }

    if (!sessionReady) return <div className="flex min-h-[calc(100vh-73px)] items-center justify-center text-sm font-semibold text-[var(--ink-muted)]">Loading your workspace...</div>;

    return (
        <div className="relative overflow-hidden">
            <div className="soft-grid pointer-events-none absolute inset-x-0 top-0 h-80 opacity-60" />
            <div className="relative mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
                <div className="rise-in mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">{eyebrow} / {role}</p>
                        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-[#18302d] sm:text-4xl">{title}</h1>
                        <p className="mt-3 max-w-xl text-base leading-7 text-[var(--ink-muted)]">{intro}</p>
                    </div>
                    <a href="/login" className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[#31504b] shadow-sm transition hover:border-[#a8d8d0] hover:bg-[#f8fcfb]">Switch account</a>
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                    <section className="rise-in rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_14px_40px_rgba(26,65,59,0.06)] sm:p-8" aria-labelledby="overview-title">
                        <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-semibold text-[var(--ink-muted)]">Today&apos;s overview</p><h2 id="overview-title" className="mt-1 text-2xl font-semibold text-[#18302d]">{metric.value}</h2></div>
                            <span className="rounded-full bg-[#e7f5f1] px-3 py-1.5 text-xs font-bold text-[var(--brand)]">{metric.change}</span>
                        </div>
                        <p className="mt-1 text-sm text-[var(--ink-muted)]">{metric.label}</p>
                        <div className="mt-8 h-2 overflow-hidden rounded-full bg-[#edf3f1]"><div className="h-full w-[72%] rounded-full bg-[var(--brand)]" /></div>
                        <ul className="mt-4 divide-y divide-[var(--line)]">{(reminders.length ? reminders.slice(0, 2).map((reminder) => ({ title: reminder.medicine_name, detail: `${reminder.dosage} · ${reminder.reminder_time.slice(0, 5)}`, status: reminder.taken ? "Taken" : "Scheduled", tone: reminder.taken ? "teal" as const : "amber" as const })) : items).map((item) => <ItemRow key={`${item.title}-${item.detail}`} item={item} />)}</ul>
                        {isPatient && <div className="mt-6 rounded-xl border border-[#cfe7e1] bg-[#f3fbf8] p-4">
                            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#183b36]">Medication check-in</p><p className="mt-1 text-xs text-[var(--ink-muted)]">Tap taken after each dose. Unconfirmed doses become missed after 2 hours.</p></div><span className="text-2xl" aria-hidden="true">&#10003;</span></div>
                            <div className="mt-4 flex flex-wrap gap-2">{reminders.slice(0, 2).map((reminder) => <button key={reminder.reminder_id} type="button" disabled={reminder.taken} onClick={() => markTaken(reminder)} className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--brand-deep)] disabled:cursor-default disabled:bg-[#a8c8c2]">{reminder.taken ? `${reminder.medicine_name} taken` : `Mark ${reminder.medicine_name} taken`}</button>)}<button type="button" onClick={() => { setShowMedication(true); setMedicationMessage(""); }} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold text-[#31504b]">Add medication</button><button type="button" onClick={enableNotifications} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold text-[#31504b]">{notificationState === "granted" ? "Notifications on" : "Enable notifications"}</button></div>
                            {reminderMessage && <p role="alert" className="mt-3 text-xs font-semibold text-[#a44735]">{reminderMessage}</p>}
                        </div>}
                    </section>

                    <section className="rise-in rounded-2xl border border-[var(--line)] bg-[#183b36] p-6 text-white shadow-[0_14px_40px_rgba(26,65,59,0.12)] sm:p-8" style={{ animationDelay: "100ms" }}>
                        <p className="text-sm font-semibold text-[#a9d9d0]">Your care team</p>
                        <h2 className="mt-1 text-2xl font-semibold">Connected care, one view.</h2>
                        <p className="mt-3 text-sm leading-6 text-[#c5ded9]">Keep the people involved in your care up to date with less back and forth.</p>
                        <button type="button" onClick={isPatient ? () => setShowBooking(true) : undefined} className="mt-8 rounded-lg bg-[#e9a84a] px-4 py-2.5 text-sm font-bold text-[#3d2a0e] transition hover:bg-[#f2b962]">{isPatient ? "Book an appointment" : isDoctor ? "Review patient profiles" : "Monitor linked patient"}</button>
                    </section>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <section className="rise-in rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_14px_40px_rgba(26,65,59,0.06)] sm:p-8" style={{ animationDelay: "150ms" }}>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{sideTitle}</h2><button className="text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-deep)]">View all</button></div>
                        <ul className="mt-3"><ItemRow item={sideItems[0]} /><ItemRow item={sideItems[1]} /></ul>
                    </section>
                    <section id="nearby-care" className="rise-in rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_14px_40px_rgba(26,65,59,0.06)] sm:p-8" style={{ animationDelay: "200ms" }}>
                        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Quick actions</h2><span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">Shortcuts</span></div>
                        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={isPatient ? () => setShowBooking(true) : undefined} className="rounded-xl border border-[var(--line)] p-4 text-left text-sm font-semibold transition hover:border-[#a8d8d0] hover:bg-[#f8fcfb]">{isDoctor ? "Open schedule" : isPatient ? "Book appointment" : "Linked patients"}</button><a href="#records" className="rounded-xl border border-[var(--line)] p-4 text-sm font-semibold transition hover:border-[#a8d8d0] hover:bg-[#f8fcfb]">{isDoctor ? "Patient profiles" : isPatient ? "Open records" : "Medication status"}</a></div>
                        <div className="mt-5 border-t border-[var(--line)] pt-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Hospitals near me</p><p className="mt-1 text-xs text-[var(--ink-muted)]">Find clinics and hospitals within 5 km.</p></div><button type="button" onClick={findNearbyCare} className="rounded-lg bg-[#183b36] px-3 py-2 text-xs font-bold text-white">{locationState === "loading" ? "Finding..." : "Locate"}</button></div>{locationState === "ready" && <div className="mt-3 space-y-2">{nearby.slice(0, 3).map((place) => <a key={place.directions_url} href={place.directions_url} target="_blank" rel="noreferrer" className="block text-xs font-semibold text-[var(--brand)]">{place.name} &rarr;</a>)}</div>}{locationState === "error" && <p className="mt-3 text-xs font-semibold text-[#a44735]">Please allow location access to find nearby care.</p>}</div>
                    </section>
                </div>
                {!isPatient && <section className="rise-in mt-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_14px_40px_rgba(26,65,59,0.06)] sm:p-8" aria-labelledby="patient-profiles-title">
                    <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">{isDoctor ? "Clinical context" : "Shared care"}</p><h2 id="patient-profiles-title" className="mt-1 text-xl font-semibold">{isDoctor ? "Patient profiles" : "Linked patient profiles"}</h2></div><span className="rounded-full bg-[#e7f5f1] px-3 py-1.5 text-xs font-bold text-[var(--brand)]">{patientProfiles.length} connected</span></div>
                    {patientProfiles.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{patientProfiles.map((patient) => <article key={patient.patient_id} className="rounded-xl border border-[var(--line)] bg-[#fbfdfc] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[#18302d]">{patient.patient_name}</h3><p className="mt-1 text-xs text-[var(--ink-muted)]">{patient.patient_email || "Profile connected"}{patient.relationship ? ` · ${patient.relationship}` : ""}</p></div><span className="rounded-full bg-[#eef2f3] px-2.5 py-1 text-xs font-semibold text-[#60716f]">{patient.blood_group || "Blood group pending"}</span></div><p className="mt-3 text-sm text-[#31504b]">{patient.medical_history || "No medical history added yet."}</p><p className="mt-3 text-xs text-[var(--ink-muted)]">{patient.gender || "Gender pending"}{patient.date_of_birth ? ` · DOB ${patient.date_of_birth}` : ""}</p></article>)}</div> : <p className="mt-5 rounded-lg bg-[#f3fbf8] p-4 text-sm text-[var(--ink-muted)]">No linked patient profiles are available yet.</p>}
                </section>}
            </div>
            {showBooking && <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#18302d]/35 px-5" role="dialog" aria-modal="true" aria-labelledby="booking-title">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Care access</p><h2 id="booking-title" className="mt-2 text-2xl font-semibold">Request an appointment</h2></div><button type="button" onClick={() => { setShowBooking(false); setBookingMessage(""); }} aria-label="Close appointment dialog" className="text-2xl leading-none text-[var(--ink-muted)]">&times;</button></div>
                    <form onSubmit={submitBooking} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Doctor<select required value={selectedDoctor} onChange={(event) => setSelectedDoctor(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 font-normal">{doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name} · {doctor.specialization}</option>)}</select></label><label className="block text-sm font-semibold">Consultation type<select required name="consultation_type" className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 font-normal"><option value="online">Online consultation</option><option value="offline">Offline consultation</option></select></label><label className="block text-sm font-semibold">Preferred date<input required name="appointment_date" type="datetime-local" className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] px-3 font-normal" /></label><label className="block text-sm font-semibold">Reason for visit<textarea required name="reason" rows={3} placeholder="Briefly describe what you need help with" className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 font-normal outline-none focus:border-[var(--brand)]" /></label><button disabled={!selectedDoctor} className="h-11 w-full rounded-lg bg-[var(--brand)] text-sm font-bold text-white transition hover:bg-[var(--brand-deep)] disabled:opacity-50">Send request</button>{bookingMessage && <p className="rounded-lg bg-[#e7f5f1] px-3 py-2 text-sm font-semibold text-[var(--brand-deep)]">{bookingMessage}</p>}</form>
                </div>
            </div>}
            {showMedication && <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#18302d]/35 px-5" role="dialog" aria-modal="true" aria-labelledby="medication-title">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Medication plan</p><h2 id="medication-title" className="mt-2 text-2xl font-semibold">Add medication</h2></div><button type="button" onClick={() => setShowMedication(false)} aria-label="Close medication dialog" className="text-2xl leading-none text-[var(--ink-muted)]">&times;</button></div>
                    <form onSubmit={submitMedication} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Doctor<select required value={selectedDoctor} onChange={(event) => setSelectedDoctor(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 font-normal">{doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name} · {doctor.specialization}</option>)}</select></label><label className="block text-sm font-semibold">Medicine name<input required name="medicine_name" placeholder="e.g. Metformin" className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] px-3 font-normal" /></label><label className="block text-sm font-semibold">Dosage<input required name="dosage" placeholder="e.g. 500 mg" className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] px-3 font-normal" /></label><label className="block text-sm font-semibold">Reminder time<input required name="reminder_time" type="time" className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] px-3 font-normal" /></label><label className="block text-sm font-semibold">Duration in days<input name="duration_days" type="number" min="1" placeholder="Optional" className="mt-2 h-11 w-full rounded-lg border border-[var(--line)] px-3 font-normal" /></label><label className="block text-sm font-semibold">Instructions<textarea name="instructions" rows={2} placeholder="Optional instructions" className="mt-2 w-full rounded-lg border border-[var(--line)] p-3 font-normal" /></label><button disabled={!selectedDoctor} className="h-11 w-full rounded-lg bg-[var(--brand)] text-sm font-bold text-white transition hover:bg-[var(--brand-deep)] disabled:opacity-50">Save medication</button>{medicationMessage && <p className="rounded-lg bg-[#e7f5f1] px-3 py-2 text-sm font-semibold text-[var(--brand-deep)]">{medicationMessage}</p>}</form>
                </div>
            </div>}
        </div>
    );
}