"use client";

import React, { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { apiRequest, apiDownload } from "../../lib/api";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { DashboardSkeleton } from "../components/LoadingSkeleton";
import NearbyHealthcare from "../components/NearbyHealthcare";
import ConsultationRoomModal from "../components/ConsultationRoomModal";
import {
    Calendar,
    Pill,
    FileText,
    Plus,
    Check,
    Download,
    Trash2,
    Clock,
    Video,
    Building2,
    AlertCircle,
    CheckCircle2,
    Shield,
    FilePlus2,
    ClipboardList
} from "lucide-react";

type PatientProfile = {
    patient_id: number;
    user_id: number;
    name: string;
    email: string;
    phone_number?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    medical_history?: string;
};

type Appointment = {
    appointment_id: number;
    appointment_date: string;
    status: string;
    mode: "online" | "offline";
    notes?: string;
    doctor_id: number;
    doctor_name: string;
    specialization: string;
    hospital_name: string;
    consultation_fee: number;
};

type Reminder = {
    reminder_id: number;
    reminder_time: string;
    taken: boolean;
    taken_at?: string;
    medicine_name: string;
    dosage: string;
    instructions?: string;
    status: string;
};

type Prescription = {
    prescription_id: number;
    medicine_name: string;
    dosage: string;
    duration_days?: number;
    instructions?: string;
    doctor_name?: string;
    specialization?: string;
    hospital_name?: string;
    reminder_time?: string;
};

type MedicalRecord = {
    record_id: number;
    title: string;
    record_type: "report" | "prescription" | "lab_result" | "scan" | "other";
    file_url: string;
    notes?: string;
    created_at: string;
    uploader_name: string;
};

type Doctor = {
    doctor_id: number;
    doctor_name: string;
    specialization: string;
    hospital_name: string;
    consultation_fee: number;
};

export default function PatientDashboard() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();

    // Data states
    const [profile, setProfile] = useState<PatientProfile | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "medicines" | "records" | "profile">("overview");

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal states
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [medicationModalOpen, setMedicationModalOpen] = useState(false);
    const [recordModalOpen, setRecordModalOpen] = useState(false);
    const [pasteModalOpen, setPasteModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [consultationApt, setConsultationApt] = useState<Appointment | null>(null);

    // Form inputs: Booking
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
    const [consultationType, setConsultationType] = useState<"online" | "offline">("online");
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentReason, setAppointmentReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Medication Form
    const [medName, setMedName] = useState("");
    const [medDosage, setMedDosage] = useState("");
    const [medTime, setMedTime] = useState("");
    const [medDuration, setMedDuration] = useState("");
    const [medInstructions, setMedInstructions] = useState("");

    // Record Upload Form
    const [recordTitle, setRecordTitle] = useState("");
    const [recordType, setRecordType] = useState<"report" | "prescription" | "lab_result" | "scan" | "other">("report");
    const [recordNotes, setRecordNotes] = useState("");
    const [recordFile, setRecordFile] = useState<File | null>(null);

    // Paste Prescription Form
    const [pasteTitle, setPasteTitle] = useState("");
    const [pasteDoctorName, setPasteDoctorName] = useState("");
    const [pastePrescriptionText, setPastePrescriptionText] = useState("");
    const [pasteCreateReminder, setPasteCreateReminder] = useState(false);
    const [pasteMedName, setPasteMedName] = useState("");
    const [pasteMedDosage, setPasteMedDosage] = useState("");
    const [pasteMedTime, setPasteMedTime] = useState("08:00");

    // Profile Form
    const [editBloodGroup, setEditBloodGroup] = useState("");
    const [editGender, setEditGender] = useState("");
    const [editDob, setEditDob] = useState("");
    const [editHistory, setEditHistory] = useState("");
    const [editPhone, setEditPhone] = useState("");

    // Role protection
    useEffect(() => {
        if (authLoading) return;
        if (!user || role !== "patient") {
            router.replace(user && role ? `/${role}` : "/login");
        }
    }, [user, role, authLoading, router]);

    // Load patient data
    const loadAllData = useCallback(async () => {
        if (!user || role !== "patient") return;
        try {
            const [profData, aptData, docData, recData] = await Promise.all([
                apiRequest<PatientProfile>("/patients/me").catch(() => null),
                apiRequest<Appointment[]>("/appointments").catch(() => []),
                apiRequest<Doctor[]>("/doctors").catch(() => []),
                apiRequest<MedicalRecord[]>("/medical-records/my").catch(() => []),
            ]);

            setProfile(profData);
            setAppointments(aptData || []);
            setDoctors(docData || []);
            if (docData && docData.length > 0 && !selectedDoctorId) {
                setSelectedDoctorId(String(docData[0].doctor_id));
            }
            setMedicalRecords(recData || []);

            if (profData?.patient_id) {
                const [remData, presData] = await Promise.all([
                    apiRequest<Reminder[]>(`/reminders/patient/${profData.patient_id}`).catch(() => []),
                    apiRequest<Prescription[]>(`/prescriptions/patient/${profData.patient_id}`).catch(() => []),
                ]);
                setReminders(remData || []);
                setPrescriptions(presData || []);

                // Seed profile form
                setEditBloodGroup(profData.blood_group || "");
                setEditGender(profData.gender || "");
                setEditDob(profData.date_of_birth ? profData.date_of_birth.slice(0, 10) : "");
                setEditHistory(profData.medical_history || "");
                setEditPhone(profData.phone_number || "");
            }
        } catch (err: unknown) {
            console.error("Error loading patient data:", err);
        } finally {
            setIsLoadingData(false);
        }
    }, [user, role, selectedDoctorId]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setBannerMessage({ type, text });
        setTimeout(() => setBannerMessage(null), 5000);
    };

    // Mark Dose as Taken
    const handleMarkTaken = async (reminder: Reminder) => {
        try {
            await apiRequest(`/reminders/${reminder.reminder_id}/taken`, { method: "PUT" });
            showToast(`Recorded ${reminder.medicine_name} as taken.`);
            setReminders((prev) =>
                prev.map((r) =>
                    r.reminder_id === reminder.reminder_id ? { ...r, taken: true, status: "taken", taken_at: new Date().toISOString() } : r
                )
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to mark medicine as taken";
            showToast(msg, "error");
        }
    };

    // Book Appointment
    const handleBookAppointment = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedDoctorId || !appointmentDate) {
            showToast("Please select a doctor and date/time", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest("/appointments/book", {
                method: "POST",
                body: JSON.stringify({
                    doctor_id: Number(selectedDoctorId),
                    appointment_date: appointmentDate,
                    consultation_type: consultationType,
                    notes: appointmentReason.trim(),
                }),
            });

            showToast(`Appointment booked successfully (${consultationType.toUpperCase()} consultation).`);
            setBookingModalOpen(false);
            setAppointmentDate("");
            setAppointmentReason("");
            // Refresh appointments
            const updated = await apiRequest<Appointment[]>("/appointments");
            setAppointments(updated || []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Booking failed";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cancel Appointment
    const handleCancelAppointment = async (appointmentId: number) => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;
        try {
            await apiRequest(`/appointments/${appointmentId}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: "cancelled" }),
            });
            showToast("Appointment cancelled.");
            setAppointments((prev) =>
                prev.map((a) => (a.appointment_id === appointmentId ? { ...a, status: "cancelled" } : a))
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Could not cancel appointment";
            showToast(msg, "error");
        }
    };

    // Add Medication
    const handleAddMedication = async (e: FormEvent) => {
        e.preventDefault();
        if (!medName || !medDosage || !medTime) {
            showToast("Medicine name, dosage, and time are required", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest("/prescriptions/patient-medication", {
                method: "POST",
                body: JSON.stringify({
                    medicine_name: medName.trim(),
                    dosage: medDosage.trim(),
                    reminder_time: medTime,
                    duration_days: medDuration ? Number(medDuration) : null,
                    instructions: medInstructions.trim(),
                }),
            });

            showToast("Medication and reminder schedule saved.");
            setMedicationModalOpen(false);
            setMedName("");
            setMedDosage("");
            setMedTime("");
            setMedDuration("");
            setMedInstructions("");

            if (profile?.patient_id) {
                const [remData, presData] = await Promise.all([
                    apiRequest<Reminder[]>(`/reminders/patient/${profile.patient_id}`),
                    apiRequest<Prescription[]>(`/prescriptions/patient/${profile.patient_id}`),
                ]);
                setReminders(remData || []);
                setPrescriptions(presData || []);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to add medication";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Upload Medical Record
    const handleUploadRecord = async (e: FormEvent) => {
        e.preventDefault();
        if (!recordTitle) {
            showToast("Please provide a title for the record", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", recordTitle.trim());
            formData.append("record_type", recordType);
            formData.append("notes", recordNotes.trim());
            if (recordFile) {
                formData.append("file", recordFile);
            }

            await apiRequest("/medical-records/upload", {
                method: "POST",
                body: formData,
            });

            showToast("Medical record uploaded successfully.");
            setRecordModalOpen(false);
            setRecordTitle("");
            setRecordNotes("");
            setRecordFile(null);

            const recData = await apiRequest<MedicalRecord[]>("/medical-records/my");
            setMedicalRecords(recData || []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to upload document";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Paste Prescription Direct Entry
    const handlePastePrescription = async (e: FormEvent) => {
        e.preventDefault();
        if (!pastePrescriptionText.trim()) {
            showToast("Please paste or enter your prescription text", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", pasteTitle.trim() || "Pasted Prescription");
            formData.append("record_type", "prescription");
            formData.append(
                "notes",
                `Doctor / Clinic: ${pasteDoctorName.trim() || "Attending Physician"}\n\nPrescription Content:\n${pastePrescriptionText.trim()}`
            );

            await apiRequest("/medical-records/upload", {
                method: "POST",
                body: formData,
            });

            // If user also wants to configure an active daily reminder for the medicine
            if (pasteCreateReminder && pasteMedName.trim() && pasteMedDosage.trim() && pasteMedTime) {
                await apiRequest("/prescriptions/patient-medication", {
                    method: "POST",
                    body: JSON.stringify({
                        medicine_name: pasteMedName.trim(),
                        dosage: pasteMedDosage.trim(),
                        reminder_time: pasteMedTime,
                        instructions: `From prescription: ${pasteTitle.trim() || "Pasted Prescription"}`,
                    }),
                });
            }

            showToast("Prescription recorded and saved to your health records!");
            setPasteModalOpen(false);
            setPasteTitle("");
            setPasteDoctorName("");
            setPastePrescriptionText("");
            setPasteCreateReminder(false);
            setPasteMedName("");
            setPasteMedDosage("");
            setPasteMedTime("08:00");

            const [recData, remData] = await Promise.all([
                apiRequest<MedicalRecord[]>("/medical-records/my").catch(() => []),
                profile?.patient_id ? apiRequest<Reminder[]>(`/reminders/patient/${profile.patient_id}`).catch(() => []) : [],
            ]);
            setMedicalRecords(recData || []);
            if (remData) setReminders(remData);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to save prescription";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Medical Record
    const handleDeleteRecord = async (recordId: number) => {
        if (!confirm("Are you sure you want to delete this medical record?")) return;
        try {
            await apiRequest(`/medical-records/${recordId}`, { method: "DELETE" });
            showToast("Record deleted.");
            setMedicalRecords((prev) => prev.filter((r) => r.record_id !== recordId));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to delete record";
            showToast(msg, "error");
        }
    };

    // Update Profile
    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await apiRequest<{ message: string; profile: PatientProfile }>("/patients/profile", {
                method: "PUT",
                body: JSON.stringify({
                    date_of_birth: editDob || null,
                    gender: editGender || null,
                    blood_group: editBloodGroup || null,
                    medical_history: editHistory.trim(),
                    phone_number: editPhone.trim() || null,
                }),
            });
            showToast("Health profile updated successfully.");
            setProfile(res.profile);
            setProfileModalOpen(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to update profile";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || isLoadingData) {
        return <DashboardSkeleton />;
    }

    // Calculations
    const takenDosesCount = reminders.filter((r) => r.taken).length;
    const totalDosesCount = reminders.length;
    const adherenceRate = totalDosesCount > 0 ? Math.round((takenDosesCount / totalDosesCount) * 100) : 100;
    const upcomingApt = appointments.find((a) => a.status === "booked" && new Date(a.appointment_date) >= new Date());

    return (
        <div className="relative min-h-screen pb-16">
            {bannerMessage && (
                <div
                    className={`fixed top-16 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-lg transition-all animate-in slide-in-from-top-4 ${bannerMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                >
                    {bannerMessage.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <span>{bannerMessage.text}</span>
                </div>
            )}

            {/* Sub-header Banner */}
            <div className="bg-white border-b border-slate-200/80">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                                    <Shield className="h-3 w-3" /> Patient Portal
                                </span>
                                {profile?.blood_group && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                        Blood Group: {profile.blood_group}
                                    </span>
                                )}
                            </div>
                            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                Welcome back, {profile?.name || user?.name}
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                Manage daily medication reminders, online & offline consultations, and clinical records.
                            </p>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setBookingModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--brand-deep)] cursor-pointer"
                            >
                                <Calendar className="h-4 w-4" />
                                Book Consultation
                            </button>
                            <button
                                type="button"
                                onClick={() => setPasteModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs font-bold text-teal-800 shadow-xs transition hover:bg-teal-100 cursor-pointer"
                            >
                                <ClipboardList className="h-4 w-4 text-[var(--brand)]" />
                                Paste Prescription
                            </button>
                            <button
                                type="button"
                                onClick={() => setMedicationModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer"
                            >
                                <Plus className="h-4 w-4 text-[var(--brand)]" />
                                Add Medicine
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecordModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer"
                            >
                                <FilePlus2 className="h-4 w-4 text-[var(--brand)]" />
                                Upload Report
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mt-6 flex overflow-x-auto space-x-1 border-b border-slate-200 pb-px text-xs font-bold scrollbar-none">
                        {[
                            { id: "overview" as const, label: "Overview" },
                            { id: "appointments" as const, label: `Appointments (${appointments.length})` },
                            { id: "medicines" as const, label: `Medicines (${reminders.length})` },
                            { id: "records" as const, label: `Medical Records (${medicalRecords.length})` },
                            { id: "profile" as const, label: "Health Profile" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 rounded-t-lg px-4 py-2.5 transition border-b-2 ${activeTab === tab.id
                                        ? "border-[var(--brand)] text-[var(--brand-deep)] bg-teal-50/40"
                                        : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* ================= OVERVIEW TAB ================= */}
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Metrics Grid */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Medication Adherence
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                        <Pill className="h-4 w-4" />
                                    </span>
                                </div>
                                <p className="mt-3 text-3xl font-black text-slate-900">{adherenceRate}%</p>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${adherenceRate}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-[11px] text-slate-500 font-medium">
                                    {takenDosesCount} of {totalDosesCount} scheduled doses taken today
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Active Prescriptions
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                                        <FileText className="h-4 w-4" />
                                    </span>
                                </div>
                                <p className="mt-3 text-3xl font-black text-slate-900">{prescriptions.length}</p>
                                <p className="mt-2 text-[11px] text-slate-500 font-medium">
                                    Prescriptions on record
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Consultations
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <Calendar className="h-4 w-4" />
                                    </span>
                                </div>
                                <p className="mt-3 text-3xl font-black text-slate-900">{appointments.length}</p>
                                <p className="mt-2 text-[11px] text-slate-500 font-medium">
                                    {appointments.filter((a) => a.status === "booked").length} upcoming visits
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Health Documents
                                    </span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                        <FileText className="h-4 w-4" />
                                    </span>
                                </div>
                                <p className="mt-3 text-3xl font-black text-slate-900">{medicalRecords.length}</p>
                                <p className="mt-2 text-[11px] text-slate-500 font-medium">
                                    Reports, scans, & past records
                                </p>
                            </div>
                        </div>

                        {/* Next Upcoming Consultation Banner */}
                        {upcomingApt && (
                            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 to-white p-6 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-xs">
                                            {upcomingApt.mode === "online" ? <Video className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Next Consultation</span>
                                                <StatusBadge status={upcomingApt.mode} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mt-1">
                                                {upcomingApt.doctor_name} · {upcomingApt.specialization}
                                            </h3>
                                            <p className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                                                <span>{upcomingApt.hospital_name}</span>
                                                <span>·</span>
                                                <span className="font-semibold text-slate-900">
                                                    {new Date(upcomingApt.appointment_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                                </span>
                                            </p>
                                            {upcomingApt.notes && (
                                                <p className="mt-2 text-xs text-slate-500 italic bg-white/80 rounded-lg p-2 border border-slate-200/60">
                                                    Reason: &ldquo;{upcomingApt.notes}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        {upcomingApt.mode === "online" ? (
                                            <button
                                                type="button"
                                                onClick={() => setConsultationApt(upcomingApt)}
                                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                                            >
                                                <Video className="h-4 w-4" /> Join Online Consultation
                                            </button>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs">
                                                <Building2 className="h-4 w-4" /> Hospital Visit Scheduled
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Today's Medication Overview */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Today&apos;s Medicine Schedule</h2>
                                    <p className="text-xs text-slate-500">
                                        Confirm doses as taken. 2-minute repeated notifications repeat until confirmed.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPasteModalOpen(true)}
                                        className="text-xs font-bold text-teal-700 hover:text-teal-900 transition"
                                    >
                                        + Paste Prescription
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMedicationModalOpen(true)}
                                        className="text-xs font-bold text-[var(--brand)] hover:text-[var(--brand-deep)] transition"
                                    >
                                        + Add Medicine
                                    </button>
                                </div>
                            </div>

                            {reminders.length === 0 ? (
                                <div className="py-8">
                                    <EmptyState
                                        title="No medicines scheduled today"
                                        description="You have not added any daily medication reminders yet. Add one to receive timely alerts."
                                        icon={Pill}
                                        actionLabel="Add Medication"
                                        onAction={() => setMedicationModalOpen(true)}
                                    />
                                </div>
                            ) : (
                                <div className="mt-4 divide-y divide-slate-100">
                                    {reminders.map((reminder) => (
                                        <div
                                            key={reminder.reminder_id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${reminder.taken ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                                    <Pill className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-sm">{reminder.medicine_name}</span>
                                                        <StatusBadge status={reminder.status} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {reminder.dosage} · Scheduled for {reminder.reminder_time.slice(0, 5)}
                                                        {reminder.instructions ? ` · ${reminder.instructions}` : ""}
                                                    </p>
                                                    {reminder.taken && reminder.taken_at && (
                                                        <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                                                            ✓ Marked taken at {new Date(reminder.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                <button
                                                    type="button"
                                                    disabled={reminder.taken}
                                                    onClick={() => handleMarkTaken(reminder)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--brand-deep)] disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    {reminder.taken ? "Taken" : "Mark Taken"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5 km Care Finder */}
                        <NearbyHealthcare />
                    </div>
                )}

                {/* ================= APPOINTMENTS TAB ================= */}
                {activeTab === "appointments" && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Consultation History & Bookings</h2>
                                <p className="text-xs text-slate-500">
                                    Review all scheduled online video/chat consultations and offline clinic visits.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setBookingModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                            >
                                <Calendar className="h-4 w-4" />
                                Book Consultation
                            </button>
                        </div>

                        {appointments.length === 0 ? (
                            <EmptyState
                                title="No consultations found"
                                description="You have not booked any consultations yet. Schedule an appointment with a licensed doctor."
                                icon={Calendar}
                                actionLabel="Book Appointment"
                                onAction={() => setBookingModalOpen(true)}
                            />
                        ) : (
                            <div className="grid gap-4">
                                {appointments.map((apt) => (
                                    <div
                                        key={apt.appointment_id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                                {apt.mode === "online" ? <Video className="h-5 w-5 text-teal-600" /> : <Building2 className="h-5 w-5 text-indigo-600" />}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={apt.mode} />
                                                    <StatusBadge status={apt.status} />
                                                </div>
                                                <h3 className="mt-1 text-base font-bold text-slate-900">
                                                    {apt.doctor_name}
                                                </h3>
                                                <p className="text-xs text-slate-600">
                                                    {apt.specialization} · {apt.hospital_name}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                    {new Date(apt.appointment_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                                </p>
                                                {apt.notes && (
                                                    <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        Notes: {apt.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                                            {apt.mode === "online" && apt.status === "booked" && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConsultationApt(apt)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition cursor-pointer"
                                                >
                                                    <Video className="h-3.5 w-3.5" />
                                                    Join Consultation Room
                                                </button>
                                            )}
                                            {apt.status === "booked" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelAppointment(apt.appointment_id)}
                                                    className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                                >
                                                    Cancel Visit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ================= MEDICINES TAB ================= */}
                {activeTab === "medicines" && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Medication Management & Prescriptions</h2>
                                <p className="text-xs text-slate-500">
                                    Schedule daily medications, paste prescriptions directly, and track clinician orders.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPasteModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 shadow-xs hover:bg-teal-100 transition cursor-pointer"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    Paste Prescription
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMedicationModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Medicine
                                </button>
                            </div>
                        </div>

                        {/* Reminders List */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                                Daily Reminders & Doses (2-Min Escalation)
                            </h3>
                            {reminders.length === 0 ? (
                                <div className="py-6">
                                    <EmptyState
                                        title="No active reminders"
                                        description="You have not set up any medication schedules."
                                        icon={Pill}
                                        actionLabel="Add Medication"
                                        onAction={() => setMedicationModalOpen(true)}
                                    />
                                </div>
                            ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {reminders.map((reminder) => (
                                        <div
                                            key={reminder.reminder_id}
                                            className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 flex items-start justify-between gap-3"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 text-sm">{reminder.medicine_name}</span>
                                                    <StatusBadge status={reminder.status} />
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1">Dosage: {reminder.dosage}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Time: {reminder.reminder_time.slice(0, 5)}
                                                    {reminder.instructions ? ` · ${reminder.instructions}` : ""}
                                                </p>
                                                {reminder.taken && reminder.taken_at && (
                                                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                                                        Taken at {new Date(reminder.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                disabled={reminder.taken}
                                                onClick={() => handleMarkTaken(reminder)}
                                                className="shrink-0 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--brand-deep)] disabled:opacity-40 cursor-pointer"
                                            >
                                                {reminder.taken ? "Taken" : "TAKEN"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Prescriptions List */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                                Clinician Prescriptions
                            </h3>
                            {prescriptions.length === 0 ? (
                                <div className="py-6">
                                    <EmptyState
                                        title="No clinician prescriptions on file"
                                        description="When your consulting doctor issues a prescription, or when you paste your prescription, it will appear in your records."
                                        icon={FileText}
                                    />
                                </div>
                            ) : (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {prescriptions.map((rx) => (
                                        <div key={rx.prescription_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-900 text-sm">{rx.medicine_name}</span>
                                                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                                                    Prescription #{rx.prescription_id}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1">Dosage: {rx.dosage}</p>
                                            {rx.duration_days && <p className="text-xs text-slate-500">Duration: {rx.duration_days} days</p>}
                                            {rx.doctor_name && (
                                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                                    Issued by: {rx.doctor_name} ({rx.specialization || "General Medicine"})
                                                </p>
                                            )}
                                            {rx.instructions && (
                                                <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                                                    Instructions: {rx.instructions}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ================= RECORDS TAB ================= */}
                {activeTab === "records" && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Medical Reports, Past Records & Prescriptions</h2>
                                <p className="text-xs text-slate-500">
                                    Paste your prescription notes directly or upload lab tests, scan PDFs, and past health history.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPasteModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-800 shadow-xs hover:bg-teal-100 transition cursor-pointer"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    Paste Prescription
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecordModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Upload Report
                                </button>
                            </div>
                        </div>

                        {medicalRecords.length === 0 ? (
                            <EmptyState
                                title="No medical records uploaded"
                                description="You can paste your doctor's prescription or upload lab results, PDF reports, and scan images."
                                icon={FileText}
                                actionLabel="Paste Prescription"
                                onAction={() => setPasteModalOpen(true)}
                            />
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                                <div className="divide-y divide-slate-100">
                                    {medicalRecords.map((record) => (
                                        <div
                                            key={record.record_id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/50 transition"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[var(--brand)]">
                                                    {record.record_type === "prescription" ? (
                                                        <ClipboardList className="h-5 w-5" />
                                                    ) : (
                                                        <FileText className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-900 text-sm">{record.title}</h4>
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                                                            {record.record_type}
                                                        </span>
                                                    </div>
                                                    {record.notes && (
                                                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{record.notes}</p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Added on {new Date(record.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                {record.file_url && record.file_url !== "text_entry_only" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => apiDownload(`/medical-records/${record.record_id}/download`, record.title)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                                                    >
                                                        <Download className="h-3.5 w-3.5 text-slate-500" />
                                                        Download
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRecord(record.record_id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ================= PROFILE TAB ================= */}
                {activeTab === "profile" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Health Profile & Medical History</h2>
                                <p className="text-xs text-slate-500">
                                    Your verified baseline medical information shared with attending physicians.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setProfileModalOpen(true)}
                                className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                            >
                                Edit Profile
                            </button>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 border-b border-slate-100 pb-6">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</span>
                                    <p className="mt-1 text-base font-bold text-slate-900">{profile?.name || user?.name}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</span>
                                    <p className="mt-1 text-base font-bold text-slate-900">{profile?.email || user?.email}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</span>
                                    <p className="mt-1 text-base font-bold text-slate-900">{profile?.phone_number || "Not provided"}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Blood Group</span>
                                    <p className="mt-1 text-base font-bold text-slate-900">{profile?.blood_group || "Not recorded"}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Date of Birth</span>
                                    <p className="mt-1 text-base font-bold text-slate-900">
                                        {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Not recorded"}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gender</span>
                                    <p className="mt-1 text-base font-bold text-slate-900 capitalize">{profile?.gender || "Not recorded"}</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Medical History & Allergies</span>
                                <div className="mt-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {profile?.medical_history || "No prior medical history, chronic conditions, or allergies recorded."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ================= MODALS ================= */}

            {/* Book Appointment Modal */}
            <Modal
                isOpen={bookingModalOpen}
                onClose={() => setBookingModalOpen(false)}
                title="Schedule Doctor Consultation"
                description="Book an Online Consultation (Video & Live Chat) or Offline Hospital Visit."
            >
                <form onSubmit={handleBookAppointment} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700">Select Doctor</label>
                        <select
                            required
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        >
                            {doctors.map((doc) => (
                                <option key={doc.doctor_id} value={doc.doctor_id}>
                                    {doc.doctor_name} · {doc.specialization} ({doc.hospital_name}) - ${doc.consultation_fee}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Consultation Type</label>
                        <div className="mt-1.5 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setConsultationType("online")}
                                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${consultationType === "online"
                                        ? "border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <Video className="h-4 w-4 text-teal-600" />
                                ONLINE (Video & Chat)
                            </button>
                            <button
                                type="button"
                                onClick={() => setConsultationType("offline")}
                                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition cursor-pointer ${consultationType === "offline"
                                        ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <Building2 className="h-4 w-4 text-indigo-600" />
                                OFFLINE (Clinic Visit)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Appointment Date & Time</label>
                        <input
                            required
                            type="datetime-local"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Reason for Visit / Symptoms</label>
                        <textarea
                            rows={3}
                            value={appointmentReason}
                            onChange={(e) => setAppointmentReason(e.target.value)}
                            placeholder="Briefly describe your symptoms or reason for consulting the doctor..."
                            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setBookingModalOpen(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Booking..." : "Confirm Booking"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Paste Prescription Modal */}
            <Modal
                isOpen={pasteModalOpen}
                onClose={() => setPasteModalOpen(false)}
                title="Paste Doctor's Prescription"
                description="Paste the text or notes of your prescription to store in your verified records and optionally set up reminders."
            >
                <form onSubmit={handlePastePrescription} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700">Prescription Title / Condition</label>
                        <input
                            required
                            value={pasteTitle}
                            onChange={(e) => setPasteTitle(e.target.value)}
                            placeholder="e.g. Hypertension Prescription, Fever & Cough Rx"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Doctor / Hospital Name (Optional)</label>
                        <input
                            value={pasteDoctorName}
                            onChange={(e) => setPasteDoctorName(e.target.value)}
                            placeholder="e.g. Dr. Jane Smith - City Care Hospital"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Prescription Text / Medications Prescribed</label>
                        <textarea
                            required
                            rows={4}
                            value={pastePrescriptionText}
                            onChange={(e) => setPastePrescriptionText(e.target.value)}
                            placeholder="Paste your doctor's exact prescription text, medications, dosage instructions, and follow-up notes here..."
                            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    {/* Optional automated reminder creation */}
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={pasteCreateReminder}
                                onChange={(e) => setPasteCreateReminder(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-[var(--brand)] focus:ring-[var(--brand)]"
                            />
                            <span className="text-xs font-bold text-teal-900">
                                Also schedule a daily medication reminder from this prescription
                            </span>
                        </label>

                        {pasteCreateReminder && (
                            <div className="mt-3 space-y-3 pt-3 border-t border-teal-200/60">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700">Medicine Name</label>
                                    <input
                                        required={pasteCreateReminder}
                                        value={pasteMedName}
                                        onChange={(e) => setPasteMedName(e.target.value)}
                                        placeholder="e.g. Amlodipine"
                                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700">Dosage</label>
                                        <input
                                            required={pasteCreateReminder}
                                            value={pasteMedDosage}
                                            onChange={(e) => setPasteMedDosage(e.target.value)}
                                            placeholder="e.g. 5mg daily"
                                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700">Reminder Time</label>
                                        <input
                                            required={pasteCreateReminder}
                                            type="time"
                                            value={pasteMedTime}
                                            onChange={(e) => setPasteMedTime(e.target.value)}
                                            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setPasteModalOpen(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Saving..." : "Save Prescription"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Add Medication Modal */}
            <Modal
                isOpen={medicationModalOpen}
                onClose={() => setMedicationModalOpen(false)}
                title="Add Medication Schedule"
                description="Set up automatic reminders that repeat every 2 minutes until marked TAKEN."
            >
                <form onSubmit={handleAddMedication} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700">Medicine Name</label>
                        <input
                            required
                            value={medName}
                            onChange={(e) => setMedName(e.target.value)}
                            placeholder="e.g. Paracetamol, Metformin"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Dosage</label>
                            <input
                                required
                                value={medDosage}
                                onChange={(e) => setMedDosage(e.target.value)}
                                placeholder="e.g. 500mg, 1 tablet"
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Reminder Time</label>
                            <input
                                required
                                type="time"
                                value={medTime}
                                onChange={(e) => setMedTime(e.target.value)}
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Duration in Days (Optional)</label>
                        <input
                            type="number"
                            min="1"
                            value={medDuration}
                            onChange={(e) => setMedDuration(e.target.value)}
                            placeholder="e.g. 7"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Special Instructions</label>
                        <input
                            value={medInstructions}
                            onChange={(e) => setMedInstructions(e.target.value)}
                            placeholder="e.g. Take after breakfast with water"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setMedicationModalOpen(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Saving..." : "Save Medicine"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Upload Medical Record Modal */}
            <Modal
                isOpen={recordModalOpen}
                onClose={() => setRecordModalOpen(false)}
                title="Upload Medical Report"
                description="Securely upload PDF or image reports (Lab results, Scans, External Prescriptions)."
            >
                <form onSubmit={handleUploadRecord} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700">Document Title</label>
                        <input
                            required
                            value={recordTitle}
                            onChange={(e) => setRecordTitle(e.target.value)}
                            placeholder="e.g. Blood Panel Results, Chest X-Ray"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Record Type</label>
                        <select
                            value={recordType}
                            onChange={(e) => setRecordType(e.target.value as "report" | "prescription" | "lab_result" | "scan" | "other")}
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        >
                            <option value="report">Clinical Report</option>
                            <option value="lab_result">Lab Result</option>
                            <option value="scan">Scan / Radiology</option>
                            <option value="prescription">External Prescription</option>
                            <option value="other">Other Document</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Select File (PDF, PNG, JPG)</label>
                        <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            onChange={(e) => setRecordFile(e.target.files ? e.target.files[0] : null)}
                            className="mt-1.5 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-[var(--brand)] hover:file:bg-teal-100"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Clinical Notes (Optional)</label>
                        <textarea
                            rows={3}
                            value={recordNotes}
                            onChange={(e) => setRecordNotes(e.target.value)}
                            placeholder="Enter any doctor remarks or test takeaways..."
                            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setRecordModalOpen(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Uploading..." : "Save Record"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                title="Update Health Profile"
                description="Keep your clinical details current for attending doctors."
            >
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Blood Group</label>
                            <input
                                value={editBloodGroup}
                                onChange={(e) => setEditBloodGroup(e.target.value)}
                                placeholder="e.g. O+, A-, B+"
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Gender</label>
                            <select
                                value={editGender}
                                onChange={(e) => setEditGender(e.target.value)}
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                            >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Date of Birth</label>
                            <input
                                type="date"
                                value={editDob}
                                onChange={(e) => setEditDob(e.target.value)}
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Phone Number</label>
                            <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="+1 555 123 4567"
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Medical History / Chronic Conditions</label>
                        <textarea
                            rows={3}
                            value={editHistory}
                            onChange={(e) => setEditHistory(e.target.value)}
                            placeholder="Detail any existing medical conditions, past surgeries, or allergies..."
                            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setProfileModalOpen(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Updating..." : "Save Profile"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Online Consultation Room Modal */}
            {consultationApt && (
                <ConsultationRoomModal
                    isOpen={consultationApt !== null}
                    onClose={() => setConsultationApt(null)}
                    appointmentId={consultationApt.appointment_id}
                    partnerName={consultationApt.doctor_name}
                    partnerRole="Doctor"
                    specializationOrHistory={`${consultationApt.specialization} · ${consultationApt.hospital_name}`}
                    appointmentDate={consultationApt.appointment_date}
                    notes={consultationApt.notes}
                />
            )}
        </div>
    );
}
