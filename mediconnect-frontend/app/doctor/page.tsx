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
    Users,
    FileText,
    Pill,
    Video,
    Building2,
    Clock,
    Plus,
    Download,
    AlertCircle,
    CheckCircle2,
    Stethoscope,
    Activity,
    ClipboardList
} from "lucide-react";

type DoctorProfile = {
    doctor_id: number;
    user_id: number;
    doctor_name: string;
    email: string;
    phone_number?: string;
    specialization: string;
    hospital_name: string;
    consultation_fee: number;
};

type DoctorAppointment = {
    appointment_id: number;
    appointment_date: string;
    status: "booked" | "completed" | "cancelled";
    mode: "online" | "offline";
    notes?: string;
    patient_id: number;
    patient_name: string;
    patient_email: string;
    patient_phone?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    medical_history?: string;
};

type DoctorPatient = {
    patient_id: number;
    patient_name: string;
    patient_email: string;
    patient_phone?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    medical_history?: string;
    total_appointments: number;
    last_appointment_date?: string;
};

type DoctorPrescription = {
    prescription_id: number;
    medicine_name: string;
    dosage: string;
    duration_days?: number;
    instructions?: string;
    patient_name: string;
    patient_email: string;
    reminder_time?: string;
};

type PatientMedicalRecord = {
    record_id: number;
    title: string;
    record_type: string;
    file_url: string;
    notes?: string;
    created_at: string;
};

type PatientReminder = {
    reminder_id: number;
    medicine_name: string;
    dosage: string;
    reminder_time: string;
    taken: boolean;
    taken_at?: string;
    status: string;
};

export default function DoctorDashboard() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();

    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
    const [patients, setPatients] = useState<DoctorPatient[]>([]);
    const [prescriptions, setPrescriptions] = useState<DoctorPrescription[]>([]);
    const [activeTab, setActiveTab] = useState<"schedule" | "patients" | "prescriptions" | "settings">("schedule");
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal states
    const [rxModalOpen, setRxModalOpen] = useState(false);
    const [selectedPatientForRx, setSelectedPatientForRx] = useState<number | null>(null);
    const [selectedPatientRecords, setSelectedPatientRecords] = useState<PatientMedicalRecord[] | null>(null);
    const [selectedPatientReminders, setSelectedPatientReminders] = useState<PatientReminder[] | null>(null);
    const [selectedPatientPrescriptions, setSelectedPatientPrescriptions] = useState<DoctorPrescription[] | null>(null);
    const [viewingPatientName, setViewingPatientName] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [consultationApt, setConsultationApt] = useState<DoctorAppointment | null>(null);

    // Prescription form
    const [rxMedicine, setRxMedicine] = useState("");
    const [rxDosage, setRxDosage] = useState("");
    const [rxDuration, setRxDuration] = useState("");
    const [rxTime, setRxTime] = useState("08:00");
    const [rxInstructions, setRxInstructions] = useState("");

    // Practice Settings form
    const [specInput, setSpecInput] = useState("");
    const [hospitalInput, setHospitalInput] = useState("");
    const [feeInput, setFeeInput] = useState("");

    // Role protection
    useEffect(() => {
        if (authLoading) return;
        if (!user || role !== "doctor") {
            router.replace(user && role ? `/${role}` : "/login");
        }
    }, [user, role, authLoading, router]);

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setBannerMessage({ type, text });
        setTimeout(() => setBannerMessage(null), 5000);
    };

    const loadData = useCallback(async () => {
        if (!user || role !== "doctor") return;
        try {
            const [docProf, aptList, patList] = await Promise.all([
                apiRequest<DoctorProfile>("/doctors/me").catch(() => null),
                apiRequest<DoctorAppointment[]>("/appointments").catch(() => []),
                apiRequest<DoctorPatient[]>("/patients/doctor-patients").catch(() => []),
            ]);

            setProfile(docProf);
            setAppointments(aptList || []);
            setPatients(patList || []);

            if (docProf) {
                setSpecInput(docProf.specialization || "");
                setHospitalInput(docProf.hospital_name || "");
                setFeeInput(String(docProf.consultation_fee || 0));

                const rxList = await apiRequest<DoctorPrescription[]>(`/prescriptions/doctor/${docProf.doctor_id}`).catch(() => []);
                setPrescriptions(rxList || []);
            }
        } catch (err: unknown) {
            console.error("Error loading doctor data:", err);
        } finally {
            setIsLoadingData(false);
        }
    }, [user, role]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateAppointmentStatus = async (appointmentId: number, newStatus: "completed" | "cancelled") => {
        try {
            await apiRequest(`/appointments/${appointmentId}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus }),
            });
            showToast(`Appointment marked as ${newStatus}.`);
            setAppointments((prev) =>
                prev.map((a) => (a.appointment_id === appointmentId ? { ...a, status: newStatus } : a))
            );
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to update status";
            showToast(msg, "error");
        }
    };

    const handleCreatePrescription = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedPatientForRx || !rxMedicine || !rxDosage) {
            showToast("Please fill all required prescription fields", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest("/prescriptions/add", {
                method: "POST",
                body: JSON.stringify({
                    patient_id: selectedPatientForRx,
                    medicine_name: rxMedicine.trim(),
                    dosage: rxDosage.trim(),
                    duration_days: rxDuration ? Number(rxDuration) : null,
                    reminder_time: rxTime,
                    instructions: rxInstructions.trim(),
                }),
            });

            showToast("Prescription issued and medicine reminder synced to patient!");
            setRxModalOpen(false);
            setRxMedicine("");
            setRxDosage("");
            setRxDuration("");
            setRxInstructions("");

            if (profile?.doctor_id) {
                const updated = await apiRequest<DoctorPrescription[]>(`/prescriptions/doctor/${profile.doctor_id}`);
                setPrescriptions(updated || []);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to issue prescription";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewPatientRecords = async (patientId: number, patientName: string) => {
        try {
            setViewingPatientName(patientName);
            const [records, rems, prescs] = await Promise.all([
                apiRequest<PatientMedicalRecord[]>(`/medical-records/patient/${patientId}`).catch(() => []),
                apiRequest<PatientReminder[]>(`/reminders/patient/${patientId}`).catch(() => []),
                apiRequest<DoctorPrescription[]>(`/prescriptions/patient/${patientId}`).catch(() => []),
            ]);
            setSelectedPatientRecords(records || []);
            setSelectedPatientReminders(rems || []);
            setSelectedPatientPrescriptions(prescs || []);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to load patient records";
            showToast(msg, "error");
        }
    };

    const handleSaveSettings = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await apiRequest<{ message: string; profile: DoctorProfile }>("/doctors/profile", {
                method: "PUT",
                body: JSON.stringify({
                    specialization: specInput.trim(),
                    hospital_name: hospitalInput.trim(),
                    consultation_fee: Number(feeInput),
                }),
            });
            showToast("Clinical practice details updated.");
            setProfile(res.profile);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Update failed";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || isLoadingData) {
        return <DashboardSkeleton />;
    }

    const onlineCount = appointments.filter((a) => a.mode === "online").length;
    const offlineCount = appointments.filter((a) => a.mode === "offline").length;
    const bookedCount = appointments.filter((a) => a.status === "booked").length;

    // Health improvement tracker calculations for viewing modal
    const totalPatientDoses = selectedPatientReminders?.length || 0;
    const takenPatientDoses = selectedPatientReminders?.filter((r) => r.taken).length || 0;
    const patientAdherence = totalPatientDoses > 0 ? Math.round((takenPatientDoses / totalPatientDoses) * 100) : 100;

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

            {/* Sub-header */}
            <div className="bg-white border-b border-slate-200/80">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                                    <Stethoscope className="h-3 w-3" /> Clinical Practice
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                    {profile?.hospital_name || "Hospital Clinic"}
                                </span>
                            </div>
                            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                Dr. {profile?.doctor_name || user?.name}
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                {profile?.specialization || "General Medicine"} · Fee: ${profile?.consultation_fee || 0}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (patients.length > 0) {
                                        setSelectedPatientForRx(patients[0].patient_id);
                                    }
                                    setRxModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                Write Prescription
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mt-6 flex overflow-x-auto space-x-1 border-b border-slate-200 pb-px text-xs font-bold scrollbar-none">
                        {[
                            { id: "schedule" as const, label: `Appointments (${appointments.length})` },
                            { id: "patients" as const, label: `My Patients (${patients.length})` },
                            { id: "prescriptions" as const, label: `Prescriptions Issued (${prescriptions.length})` },
                            { id: "settings" as const, label: "Practice Settings" },
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

            {/* Content Body */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* Stats row */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Consultations</span>
                        <p className="mt-2 text-3xl font-black text-slate-900">{appointments.length}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{bookedCount} pending visits</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Online Consultations</span>
                        <p className="mt-2 text-3xl font-black text-teal-700">{onlineCount}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Virtual video visits</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Offline Consultations</span>
                        <p className="mt-2 text-3xl font-black text-indigo-700">{offlineCount}</p>
                        <p className="mt-1 text-[11px] text-slate-500">In-clinic consultations</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Patients Treated</span>
                        <p className="mt-2 text-3xl font-black text-slate-900">{patients.length}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Authorized clinical profiles</p>
                    </div>
                </div>

                {/* SCHEDULE TAB */}
                {activeTab === "schedule" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900">Consultation Schedule</h2>
                        {appointments.length === 0 ? (
                            <EmptyState
                                title="No scheduled appointments"
                                description="You currently have no patient appointments booked."
                                icon={Calendar}
                            />
                        ) : (
                            <div className="grid gap-4">
                                {appointments.map((apt) => (
                                    <div
                                        key={apt.appointment_id}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                                {apt.mode === "online" ? <Video className="h-6 w-6 text-teal-600" /> : <Building2 className="h-6 w-6 text-indigo-600" />}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={apt.mode} />
                                                    <StatusBadge status={apt.status} />
                                                    {apt.blood_group && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                            {apt.blood_group}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="mt-1 text-base font-bold text-slate-900">
                                                    {apt.patient_name}
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    {apt.patient_email} {apt.patient_phone ? `· ${apt.patient_phone}` : ""}
                                                    {apt.gender ? ` · ${apt.gender}` : ""}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                    {new Date(apt.appointment_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                                </p>

                                                {apt.notes && (
                                                    <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                        Patient Symptoms: &ldquo;{apt.notes}&rdquo;
                                                    </p>
                                                )}

                                                {apt.medical_history && (
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        Medical History: {apt.medical_history}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                                            {/* Online consultation room launcher */}
                                            {apt.mode === "online" && apt.status !== "cancelled" && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConsultationApt(apt)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition cursor-pointer"
                                                >
                                                    <Video className="h-3.5 w-3.5" />
                                                    Join Consultation Room
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedPatientForRx(apt.patient_id);
                                                    setRxModalOpen(true);
                                                }}
                                                className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-bold text-[var(--brand-deep)] border border-teal-200 hover:bg-teal-100 transition cursor-pointer"
                                            >
                                                + Prescribe
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleViewPatientRecords(apt.patient_id, apt.patient_name)}
                                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                            >
                                                Past Records & Adherence
                                            </button>

                                            {apt.status === "booked" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateAppointmentStatus(apt.appointment_id, "completed")}
                                                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                                                    >
                                                        Mark Complete
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateAppointmentStatus(apt.appointment_id, "cancelled")}
                                                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PATIENTS TAB */}
                {activeTab === "patients" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900">Authorized Patient Directory</h2>
                        {patients.length === 0 ? (
                            <EmptyState
                                title="No patient profiles yet"
                                description="Patients who schedule consultations with you will automatically be linked here."
                                icon={Users}
                            />
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {patients.map((pat) => (
                                    <div key={pat.patient_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900">{pat.patient_name}</h3>
                                                <p className="text-xs text-slate-500">{pat.patient_email}</p>
                                                {pat.patient_phone && <p className="text-xs text-slate-500">{pat.patient_phone}</p>}
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                                {pat.blood_group || "Blood Group N/A"}
                                            </span>
                                        </div>

                                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                                            <span className="font-bold text-slate-700 block mb-1">Medical Background:</span>
                                            {pat.medical_history || "No medical history recorded by patient."}
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                            <span className="text-[11px] text-slate-400 font-semibold">
                                                {pat.total_appointments} total consultations
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewPatientRecords(pat.patient_id, pat.patient_name)}
                                                    className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
                                                >
                                                    View Documents & Adherence
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPatientForRx(pat.patient_id);
                                                        setRxModalOpen(true);
                                                    }}
                                                    className="rounded-lg bg-[var(--brand)] px-3 py-1 text-xs font-bold text-white hover:bg-[var(--brand-deep)] transition cursor-pointer"
                                                >
                                                    Prescribe
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PRESCRIPTIONS TAB */}
                {activeTab === "prescriptions" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900">Prescriptions Issued</h2>
                            <button
                                type="button"
                                onClick={() => {
                                    if (patients.length > 0) setSelectedPatientForRx(patients[0].patient_id);
                                    setRxModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                Write Prescription
                            </button>
                        </div>

                        {prescriptions.length === 0 ? (
                            <EmptyState
                                title="No prescriptions issued"
                                description="You have not created any medication orders for patients yet."
                                icon={Pill}
                            />
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {prescriptions.map((rx) => (
                                    <div key={rx.prescription_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 text-sm">{rx.medicine_name}</span>
                                            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                                                Rx #{rx.prescription_id}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">Dosage: {rx.dosage}</p>
                                        <p className="text-xs text-slate-500">Patient: {rx.patient_name} ({rx.patient_email})</p>
                                        {rx.duration_days && <p className="text-xs text-slate-500">Duration: {rx.duration_days} days</p>}
                                        {rx.reminder_time && <p className="text-xs text-slate-500">Reminder Synced: {rx.reminder_time.slice(0, 5)}</p>}
                                        {rx.instructions && (
                                            <p className="mt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                Instructions: {rx.instructions}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === "settings" && (
                    <div className="space-y-6 max-w-2xl">
                        <h2 className="text-xl font-bold text-slate-900">Clinical Profile & Settings</h2>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                            <form onSubmit={handleSaveSettings} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Specialization</label>
                                    <input
                                        required
                                        value={specInput}
                                        onChange={(e) => setSpecInput(e.target.value)}
                                        placeholder="e.g. Cardiology, Neurology, General Medicine"
                                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Hospital / Clinic Affiliation</label>
                                    <input
                                        required
                                        value={hospitalInput}
                                        onChange={(e) => setHospitalInput(e.target.value)}
                                        placeholder="e.g. St. Jude Hospital, Central Clinic"
                                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700">Consultation Fee ($)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={feeInput}
                                        onChange={(e) => setFeeInput(e.target.value)}
                                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                                >
                                    {isSubmitting ? "Saving..." : "Update Practice Details"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* 5 km Care Finder for Doctor referral & directions */}
                <div className="pt-4 border-t border-slate-200">
                    <NearbyHealthcare />
                </div>
            </div>

            {/* Write Prescription Modal */}
            <Modal
                isOpen={rxModalOpen}
                onClose={() => setRxModalOpen(false)}
                title="Write Medical Prescription"
                description="Issue an authoritative prescription that automatically configures medication reminders for the patient."
            >
                <form onSubmit={handleCreatePrescription} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700">Patient</label>
                        <select
                            required
                            value={selectedPatientForRx || ""}
                            onChange={(e) => setSelectedPatientForRx(Number(e.target.value))}
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        >
                            {patients.map((p) => (
                                <option key={p.patient_id} value={p.patient_id}>
                                    {p.patient_name} ({p.patient_email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Medicine Name</label>
                        <input
                            required
                            value={rxMedicine}
                            onChange={(e) => setRxMedicine(e.target.value)}
                            placeholder="e.g. Amoxicillin, Metformin"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Dosage</label>
                            <input
                                required
                                value={rxDosage}
                                onChange={(e) => setRxDosage(e.target.value)}
                                placeholder="e.g. 500mg once daily"
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Reminder Time</label>
                            <input
                                required
                                type="time"
                                value={rxTime}
                                onChange={(e) => setRxTime(e.target.value)}
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Duration (in days)</label>
                        <input
                            type="number"
                            min="1"
                            value={rxDuration}
                            onChange={(e) => setRxDuration(e.target.value)}
                            placeholder="e.g. 14"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Instructions</label>
                        <textarea
                            rows={2}
                            value={rxInstructions}
                            onChange={(e) => setRxInstructions(e.target.value)}
                            placeholder="e.g. Take with food. Do not skip doses."
                            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setRxModalOpen(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Issuing..." : "Issue Prescription"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Patient Records & Health Improvement Tracker Modal */}
            <Modal
                isOpen={selectedPatientRecords !== null}
                onClose={() => {
                    setSelectedPatientRecords(null);
                    setSelectedPatientReminders(null);
                    setSelectedPatientPrescriptions(null);
                }}
                title={`Patient Profile & Medical History: ${viewingPatientName}`}
                description="Review clinical documents, test reports, and track medicine adherence improvements."
                maxWidth="lg"
            >
                <div className="space-y-6">
                    {/* Health Improvement Tracker Card */}
                    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-teal-50/30 p-5 shadow-xs">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
                                    <Activity className="h-4 w-4" />
                                </span>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Health & Adherence Improvement Tracker</h4>
                                    <p className="text-[11px] text-slate-500">Real-time medication compliance rate</p>
                                </div>
                            </div>

                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                    patientAdherence >= 80
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : patientAdherence >= 50
                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                        : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {patientAdherence >= 80 ? "Excellent Adherence" : patientAdherence >= 50 ? "Moderate Adherence" : "At Risk / Needs Attention"}
                            </span>
                        </div>

                        <div className="mt-4">
                            <div className="flex items-baseline justify-between text-xs mb-1.5">
                                <span className="font-semibold text-slate-600">Medication Completion</span>
                                <span className="font-extrabold text-slate-900 text-sm">{patientAdherence}%</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        patientAdherence >= 80 ? "bg-emerald-500" : patientAdherence >= 50 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${patientAdherence}%` }}
                                />
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500">
                                {takenPatientDoses} of {totalPatientDoses} doses marked as taken by patient or guardian.
                            </p>
                        </div>
                    </div>

                    {/* Prescriptions on File */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Prescriptions Issued ({selectedPatientPrescriptions?.length || 0})
                        </h4>
                        {selectedPatientPrescriptions && selectedPatientPrescriptions.length === 0 ? (
                            <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl">No active prescriptions issued yet.</p>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {selectedPatientPrescriptions?.map((p) => (
                                    <div key={p.prescription_id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 text-xs">{p.medicine_name}</span>
                                            <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-bold">
                                                {p.reminder_time?.slice(0, 5) || "Daily"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{p.dosage}</p>
                                        {p.instructions && <p className="text-[10px] text-slate-400 mt-1 italic">{p.instructions}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Uploaded Documents & Past Records */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Uploaded Documents, Past Reports & Prescriptions ({selectedPatientRecords?.length || 0})
                        </h4>
                        {selectedPatientRecords && selectedPatientRecords.length === 0 ? (
                            <p className="text-xs text-slate-500 py-6 text-center">
                                No past medical records or documents uploaded by this patient yet.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                                {selectedPatientRecords?.map((rec) => (
                                    <div key={rec.record_id} className="py-3 flex items-center justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[var(--brand)] mt-0.5">
                                                {rec.record_type === "prescription" ? <ClipboardList className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{rec.title}</span>
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                                                        {rec.record_type}
                                                    </span>
                                                </div>
                                                {rec.notes && <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{rec.notes}</p>}
                                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                                    Added {new Date(rec.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        {rec.file_url && rec.file_url !== "text_entry_only" && (
                                            <button
                                                type="button"
                                                onClick={() => apiDownload(`/medical-records/${rec.record_id}/download`, rec.title)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                            >
                                                <Download className="h-3 w-3" />
                                                Download
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Online Consultation Room Modal */}
            {consultationApt && (
                <ConsultationRoomModal
                    isOpen={consultationApt !== null}
                    onClose={() => setConsultationApt(null)}
                    appointmentId={consultationApt.appointment_id}
                    partnerName={consultationApt.patient_name}
                    partnerRole="Patient"
                    specializationOrHistory={consultationApt.medical_history || `Blood Group: ${consultationApt.blood_group || "N/A"}`}
                    appointmentDate={consultationApt.appointment_date}
                    notes={consultationApt.notes}
                />
            )}
        </div>
    );
}
