"use client";

import React, { useState, useEffect, Suspense, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, UserRole } from "../../lib/authContext";
import { apiRequest } from "../../lib/api";
import {
    Shield,
    Stethoscope,
    HeartHandshake,
    CheckCircle2,
    ArrowRight,
    Building2,
    DollarSign,
    Sparkles,
    AlertCircle,
    Activity
} from "lucide-react";

function SelectRoleContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login, setSessionUser } = useAuth();

    const [selectedRole, setSelectedRole] = useState<UserRole>("patient");
    const [isGoogleOAuth, setIsGoogleOAuth] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Doctor profile inputs if doctor role is chosen
    const [specialization, setSpecialization] = useState("General Medicine");
    const [hospitalName, setHospitalName] = useState("Central City Hospital");
    const [consultationFee, setConsultationFee] = useState("50");

    // Handle token from Google callback or query param
    useEffect(() => {
        const token = searchParams.get("token");
        const roleParam = searchParams.get("role") as UserRole | null;
        const isGoogle = searchParams.get("isGoogle");

        if (isGoogle) setIsGoogleOAuth(true);

        if (token) {
            localStorage.setItem("token", token);
            if (roleParam && ["patient", "doctor", "guardian"].includes(roleParam)) {
                setSelectedRole(roleParam);
            }
        }
    }, [searchParams]);

    async function handleConfirmRole(e?: FormEvent) {
        if (e) e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) {
                router.replace("/login");
                return;
            }

            const bodyPayload: Record<string, unknown> = {
                role: selectedRole,
            };

            if (selectedRole === "doctor") {
                bodyPayload.specialization = specialization.trim();
                bodyPayload.hospital_name = hospitalName.trim();
                bodyPayload.consultation_fee = Number(consultationFee) || 50;
            }

            const data = await apiRequest<{
                message: string;
                token: string;
                user: {
                    id: number;
                    name: string;
                    email: string;
                    phone_number?: string | null;
                    role: UserRole;
                    profile?: Record<string, unknown> | null;
                };
            }>("/users/select-role", {
                method: "POST",
                body: JSON.stringify(bodyPayload),
            });

            if (data.token && data.user) {
                login(data.token, data.user);
                setSessionUser(data.user, data.token);
            } else {
                router.push(`/${selectedRole}`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to set role. Please try again.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="relative min-h-[calc(100vh-73px)] flex items-center justify-center px-4 py-12">
            <div className="soft-grid pointer-events-none absolute inset-0 opacity-40" />

            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-2xl z-10">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-bold text-[var(--brand)] border border-teal-200/60 mb-3">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isGoogleOAuth ? "Google Account Connected" : "MediConnect Role Selection"}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                        {user?.name ? `Welcome, ${user.name}` : "Select Your Workspace"}
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                        Choose how you would like to use MediConnect today. Each role gives you dedicated clinical tools and features.
                    </p>
                </div>

                {error && (
                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                )}

                {/* 3 Role Cards */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {/* Patient Card */}
                    <button
                        type="button"
                        onClick={() => setSelectedRole("patient")}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                            selectedRole === "patient"
                                ? "border-[var(--brand)] bg-teal-50/50 shadow-md ring-2 ring-[var(--brand)]"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                    >
                        <div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs mb-3">
                                <Shield className="h-6 w-6" />
                            </div>
                            <h3 className="font-extrabold text-sm text-slate-900">Patient</h3>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                                Book online/offline consultations, set 2-min repeating medicine reminders, and upload past records.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                            {selectedRole === "patient" ? (
                                <span className="inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" /> Selected
                                </span>
                            ) : (
                                <span className="text-slate-400 group-hover:text-slate-600">Select &rarr;</span>
                            )}
                        </div>
                    </button>

                    {/* Doctor Card */}
                    <button
                        type="button"
                        onClick={() => setSelectedRole("doctor")}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                            selectedRole === "doctor"
                                ? "border-[var(--brand)] bg-teal-50/50 shadow-md ring-2 ring-[var(--brand)]"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                    >
                        <div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-xs mb-3">
                                <Stethoscope className="h-6 w-6" />
                            </div>
                            <h3 className="font-extrabold text-sm text-slate-900">Doctor</h3>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                                Create your clinical practice profile, manage appointments, and view patient health improvement.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-teal-700">
                            {selectedRole === "doctor" ? (
                                <span className="inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" /> Selected
                                </span>
                            ) : (
                                <span className="text-slate-400 group-hover:text-slate-600">Select &rarr;</span>
                            )}
                        </div>
                    </button>

                    {/* Guardian Card */}
                    <button
                        type="button"
                        onClick={() => setSelectedRole("guardian")}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${
                            selectedRole === "guardian"
                                ? "border-[var(--brand)] bg-teal-50/50 shadow-md ring-2 ring-[var(--brand)]"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                    >
                        <div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shadow-xs mb-3">
                                <HeartHandshake className="h-6 w-6" />
                            </div>
                            <h3 className="font-extrabold text-sm text-slate-900">Guardian</h3>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                                Monitor family medicine compliance and receive 2-minute escalation alerts until taken.
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                            {selectedRole === "guardian" ? (
                                <span className="inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" /> Selected
                                </span>
                            ) : (
                                <span className="text-slate-400 group-hover:text-slate-600">Select &rarr;</span>
                            )}
                        </div>
                    </button>
                </div>

                {/* Doctor Setup Form (expands when Doctor is selected) */}
                {selectedRole === "doctor" && (
                    <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/40 p-5 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-900 mb-3 uppercase tracking-wider">
                            <Stethoscope className="h-4 w-4 text-[var(--brand)]" />
                            <span>Create Your Doctor Profile</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700">Specialization</label>
                                <input
                                    required
                                    value={specialization}
                                    onChange={(e) => setSpecialization(e.target.value)}
                                    placeholder="e.g. Cardiologist, General Physician"
                                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700">Hospital / Clinic</label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                                        <Building2 className="h-3.5 w-3.5" />
                                    </span>
                                    <input
                                        required
                                        value={hospitalName}
                                        onChange={(e) => setHospitalName(e.target.value)}
                                        placeholder="e.g. St. Jude Hospital"
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700">Consultation Fee ($)</label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                                        <DollarSign className="h-3.5 w-3.5" />
                                    </span>
                                    <input
                                        required
                                        type="number"
                                        value={consultationFee}
                                        onChange={(e) => setConsultationFee(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 focus:border-[var(--brand)] focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Continue button */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
                    <p className="text-xs text-slate-400">
                        You can switch workspaces or change roles anytime in your profile settings.
                    </p>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleConfirmRole()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-deep)] hover:scale-102 active:scale-98 disabled:opacity-60 cursor-pointer w-full sm:w-auto"
                    >
                        <span>{isLoading ? "Setting up workspace..." : `Enter as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}</span>
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SelectRolePage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
                    <Activity className="h-8 w-8 animate-spin text-[var(--brand)]" />
                </div>
            }
        >
            <SelectRoleContent />
        </Suspense>
    );
}
