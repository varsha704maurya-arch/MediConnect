"use client";

import React, { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { apiRequest } from "../../lib/api";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { DashboardSkeleton } from "../components/LoadingSkeleton";
import NearbyHealthcare from "../components/NearbyHealthcare";
import {
    HeartHandshake,
    Users,
    Pill,
    AlertTriangle,
    Plus,
    Clock,
    CheckCircle2,
    Trash2,
    BellRing
} from "lucide-react";

type GuardianPatient = {
    link_id: number;
    patient_id: number;
    relationship: string;
    patient_name: string;
    patient_email: string;
    patient_phone?: string;
    date_of_birth?: string;
    gender?: string;
    blood_group?: string;
    medical_history?: string;
    total_medicines: number;
    taken_today: number;
    pending_today: number;
    upcoming_appointments: number;
};

type GuardianReminder = {
    reminder_id: number;
    reminder_time: string;
    taken: boolean;
    taken_at?: string;
    escalated_to_guardian?: boolean;
    medicine_name: string;
    dosage: string;
    instructions?: string;
    patient_name: string;
    patient_id: number;
    relationship: string;
    status: string;
};

export default function GuardianDashboard() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();

    const [patients, setPatients] = useState<GuardianPatient[]>([]);
    const [reminders, setReminders] = useState<GuardianReminder[]>([]);
    const [activeTab, setActiveTab] = useState<"patients" | "medications">("patients");
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Link modal
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [patientEmail, setPatientEmail] = useState("");
    const [relationship, setRelationship] = useState("Parent");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Role protection
    useEffect(() => {
        if (authLoading) return;
        if (!user || role !== "guardian") {
            router.replace(user && role ? `/${role}` : "/login");
        }
    }, [user, role, authLoading, router]);

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setBannerMessage({ type, text });
        setTimeout(() => setBannerMessage(null), 5000);
    };

    const loadData = useCallback(async () => {
        if (!user || role !== "guardian") return;
        try {
            const [patList, remList] = await Promise.all([
                apiRequest<GuardianPatient[]>("/guardians/my/patients").catch(() => []),
                apiRequest<GuardianReminder[]>("/guardians/reminders").catch(() => []),
            ]);
            setPatients(patList || []);
            setReminders(remList || []);
        } catch (err: unknown) {
            console.error("Error loading guardian data:", err);
        } finally {
            setIsLoadingData(false);
        }
    }, [user, role]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 15000); // refresh every 15s for live adherence tracking
        return () => clearInterval(interval);
    }, [loadData]);

    const handleLinkPatient = async (e: FormEvent) => {
        e.preventDefault();
        if (!patientEmail || !relationship) {
            showToast("Please enter patient email and relationship", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiRequest<{ message: string; patient_name?: string }>("/guardians/link", {
                method: "POST",
                body: JSON.stringify({
                    patient_email: patientEmail.trim(),
                    relationship: relationship.trim(),
                }),
            });

            showToast(res.message || `Successfully linked with ${res.patient_name || "patient"}`);
            setLinkModalOpen(false);
            setPatientEmail("");
            setRelationship("Parent");
            loadData();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to link patient";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnlinkPatient = async (linkId: number) => {
        if (!confirm("Are you sure you want to stop monitoring this patient?")) return;
        try {
            await apiRequest(`/guardians/link/${linkId}`, { method: "DELETE" });
            showToast("Patient unlinked.");
            setPatients((prev) => prev.filter((p) => p.link_id !== linkId));
            setReminders((prev) => prev.filter((r) => r.relationship !== ""));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to unlink";
            showToast(msg, "error");
        }
    };

    if (authLoading || isLoadingData) {
        return <DashboardSkeleton />;
    }

    // Identify any overdue or escalated doses across all linked patients
    const urgentReminders = reminders.filter((r) => !r.taken && (r.escalated_to_guardian || r.status === "due"));
    const totalMedicinesCount = reminders.length;
    const takenTodayCount = reminders.filter((r) => r.taken).length;
    const overallAdherence = totalMedicinesCount > 0 ? Math.round((takenTodayCount / totalMedicinesCount) * 100) : 100;

    return (
        <div className="relative min-h-screen pb-16">
            {bannerMessage && (
                <div
                    className={`fixed top-16 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-lg transition-all animate-in slide-in-from-top-4 ${bannerMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                >
                    {bannerMessage.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <span>{bannerMessage.text}</span>
                </div>
            )}

            {/* Sub-header */}
            <div className="bg-white border-b border-slate-200/80">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                                    <HeartHandshake className="h-3 w-3" /> Family Care Portal
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                    {patients.length} Patient{patients.length === 1 ? "" : "s"} Monitored
                                </span>
                            </div>
                            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                Caregiver Workspace: {user?.name}
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-slate-500">
                                Real-time monitoring for your family members&apos; medications, adherence, and nearby care.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setLinkModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                Link Patient
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mt-6 flex overflow-x-auto space-x-1 border-b border-slate-200 pb-px text-xs font-bold scrollbar-none">
                        {[
                            { id: "patients" as const, label: `Monitored Patients (${patients.length})` },
                            { id: "medications" as const, label: `Medication Adherence (${reminders.length})` },
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
                {/* Urgent Escalation Alert Banner */}
                {urgentReminders.length > 0 && (
                    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-5 shadow-sm animate-pulse">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                                <BellRing className="h-5 w-5" />
                            </span>
                            <div>
                                <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                                    Attention Needed: Unacknowledged Medication
                                </h3>
                                <p className="text-xs text-amber-900 mt-1">
                                    The following patient(s) have not confirmed their scheduled medicine. The reminder is repeating every 2 minutes on their device:
                                </p>
                                <ul className="mt-2 space-y-1 text-xs font-semibold text-amber-950">
                                    {urgentReminders.map((r) => (
                                        <li key={r.reminder_id} className="flex items-center gap-2">
                                            <span>•</span>
                                            <span>
                                                <strong>{r.patient_name}</strong>: {r.medicine_name} ({r.dosage}) scheduled for {r.reminder_time.slice(0, 5)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Metrics */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Family Members</span>
                        <p className="mt-2 text-3xl font-black text-slate-900">{patients.length}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Linked under your care</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today&apos;s Family Adherence</span>
                        <p className="mt-2 text-3xl font-black text-emerald-600">{overallAdherence}%</p>
                        <p className="mt-1 text-[11px] text-slate-500">{takenTodayCount} of {totalMedicinesCount} doses completed</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending / Overdue</span>
                        <p className="mt-2 text-3xl font-black text-amber-600">{urgentReminders.length}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Unacknowledged doses</p>
                    </div>
                </div>

                {/* PATIENTS TAB */}
                {activeTab === "patients" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900">Monitored Family Members</h2>
                        {patients.length === 0 ? (
                            <EmptyState
                                title="No patients linked yet"
                                description="Link your family member or patient using their registered MediConnect email address."
                                icon={Users}
                                actionLabel="Link Patient"
                                onAction={() => setLinkModalOpen(true)}
                            />
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {patients.map((p) => {
                                    const patientAdherence = p.total_medicines > 0
                                        ? Math.round((p.taken_today / p.total_medicines) * 100)
                                        : 100;
                                    return (
                                        <div key={p.link_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-base text-slate-900">{p.patient_name}</h3>
                                                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                                                            {p.relationship}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{p.patient_email}</p>
                                                    {p.patient_phone && <p className="text-xs text-slate-500">{p.patient_phone}</p>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUnlinkPatient(p.link_id)}
                                                    className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                                    title="Unlink patient"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                                                <div>
                                                    <span className="text-slate-400 block font-semibold">Today&apos;s Adherence</span>
                                                    <span className="font-bold text-slate-800 text-sm">
                                                        {patientAdherence}% ({p.taken_today}/{p.total_medicines})
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block font-semibold">Blood Group</span>
                                                    <span className="font-bold text-slate-800 text-sm">
                                                        {p.blood_group || "Pending"}
                                                    </span>
                                                </div>
                                            </div>

                                            {p.medical_history && (
                                                <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                    Health Notes: {p.medical_history}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MEDICATIONS TAB */}
                {activeTab === "medications" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-slate-900">Family Medication Monitor</h2>
                        <p className="text-xs text-slate-500">
                            Authoritative status of medications taken vs unacknowledged doses across all linked family members.
                        </p>

                        {reminders.length === 0 ? (
                            <EmptyState
                                title="No medication schedules active"
                                description="Your linked family members do not have any active daily medicine schedules."
                                icon={Pill}
                            />
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs divide-y divide-slate-100">
                                {reminders.map((r) => (
                                    <div
                                        key={r.reminder_id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/50 transition"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${r.taken ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                                <Pill className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 text-sm">{r.medicine_name}</span>
                                                    <StatusBadge status={r.status} />
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                                        {r.patient_name} ({r.relationship})
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {r.dosage} · Scheduled for {r.reminder_time.slice(0, 5)}
                                                    {r.instructions ? ` · ${r.instructions}` : ""}
                                                </p>
                                                {r.taken && r.taken_at ? (
                                                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                                        ✓ Confirmed taken at {new Date(r.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                ) : r.status === "due" ? (
                                                    <p className="text-[10px] text-amber-700 font-bold mt-0.5 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Unacknowledged. Repeating reminder active.
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="self-end sm:self-center">
                                            {r.taken ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Medicine Taken
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                                                    <Clock className="h-3.5 w-3.5" /> Awaiting Patient Confirmation
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 5 km Care Finder for Caregivers */}
                <div className="pt-4 border-t border-slate-200">
                    <NearbyHealthcare />
                </div>
            </div>

            {/* Link Patient Modal */}
            <Modal
                isOpen={linkModalOpen}
                onClose={() => setLinkModalOpen(false)}
                title="Link Family Member / Patient"
                description="Connect with your family member to monitor their medicine adherence and health consultations."
            >
                <form onSubmit={handleLinkPatient} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700">Patient Email Address</label>
                        <input
                            required
                            type="email"
                            value={patientEmail}
                            onChange={(e) => setPatientEmail(e.target.value)}
                            placeholder="patient@example.com"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Your Relationship to Patient</label>
                        <select
                            value={relationship}
                            onChange={(e) => setRelationship(e.target.value)}
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                        >
                            <option value="Parent">Parent</option>
                            <option value="Child / Daughter / Son">Child / Daughter / Son</option>
                            <option value="Spouse / Partner">Spouse / Partner</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Caregiver / Legal Guardian">Caregiver / Legal Guardian</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setLinkModalOpen(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-[var(--brand)] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition disabled:opacity-60 cursor-pointer"
                        >
                            {isSubmitting ? "Linking..." : "Link Patient"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
