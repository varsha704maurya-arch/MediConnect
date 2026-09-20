"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pill, Check, Clock, BellRing, AlertTriangle, ArrowRight } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../lib/authContext";

type DueReminder = {
    reminder_id: number;
    reminder_time: string;
    taken: boolean;
    medicine_name: string;
    dosage: string;
    instructions?: string;
};

type GuardianReminder = {
    reminder_id: number;
    reminder_time: string;
    taken: boolean;
    escalated_to_guardian?: boolean;
    medicine_name: string;
    dosage: string;
    patient_name: string;
    status: string;
};

export default function ActiveReminderBanner({ onDoseTaken }: { onDoseTaken?: () => void }) {
    const { user, role } = useAuth();
    const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
    const [guardianAlerts, setGuardianAlerts] = useState<GuardianReminder[]>([]);
    const [isUpdating, setIsUpdating] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const checkDueReminders = useCallback(async () => {
        if (!user) return;

        if (role === "patient") {
            try {
                const data = await apiRequest<DueReminder[]>("/reminders/due");
                setDueReminders(data || []);
            } catch {
                // quiet poll
            }
        } else if (role === "guardian") {
            try {
                const data = await apiRequest<GuardianReminder[]>("/guardians/reminders");
                const unacknowledged = (data || []).filter(
                    (r) => !r.taken && (r.escalated_to_guardian || r.status === "due")
                );
                setGuardianAlerts(unacknowledged);
            } catch {
                // quiet poll
            }
        }
    }, [user, role]);

    useEffect(() => {
        if (role !== "patient" && role !== "guardian") return;
        checkDueReminders();
        const interval = setInterval(checkDueReminders, 12000); // poll every 12 seconds
        return () => clearInterval(interval);
    }, [role, checkDueReminders]);

    const handleMarkTaken = async (reminder: DueReminder) => {
        try {
            setIsUpdating(reminder.reminder_id);
            await apiRequest(`/reminders/${reminder.reminder_id}/taken`, { method: "PUT" });
            setFeedback(`✅ ${reminder.medicine_name} recorded as taken!`);
            setDueReminders((prev) => prev.filter((r) => r.reminder_id !== reminder.reminder_id));
            if (onDoseTaken) onDoseTaken();
            setTimeout(() => setFeedback(null), 4000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to mark as taken";
            setFeedback(`❌ ${message}`);
        } finally {
            setIsUpdating(null);
        }
    };

    if (role !== "patient" && role !== "guardian") return null;

    if (feedback && dueReminders.length === 0) {
        return (
            <div className="bg-emerald-600 text-white px-4 py-2.5 text-center text-xs font-bold transition animate-in fade-in">
                {feedback}
            </div>
        );
    }

    // GUARDIAN VIEW
    if (role === "guardian" && guardianAlerts.length > 0) {
        const alert = guardianAlerts[0];
        return (
            <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 text-white shadow-md animate-pulse">
                <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white">
                            <BellRing className="h-5 w-5" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950">
                                    <AlertTriangle className="h-3 w-3" /> Guardian Alert
                                </span>
                                <span className="text-xs text-amber-100 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Repeating 2-min alerts active
                                </span>
                            </div>
                            <p className="text-sm font-bold tracking-tight mt-0.5">
                                <strong className="underline decoration-amber-300">{alert.patient_name}</strong> has not taken{" "}
                                <span className="underline decoration-amber-300">{alert.medicine_name}</span> ({alert.dosage}) due at{" "}
                                {alert.reminder_time ? alert.reminder_time.slice(0, 5) : "now"}.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {guardianAlerts.length > 1 && (
                            <span className="hidden sm:inline text-xs text-amber-200">
                                +{guardianAlerts.length - 1} more unacknowledged
                            </span>
                        )}
                        <Link
                            href="/guardian"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-950 shadow-sm transition hover:bg-amber-50"
                        >
                            <span>Open Caregiver Monitor</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // PATIENT VIEW
    if (role === "patient" && dueReminders.length > 0) {
        const current = dueReminders[0];
        return (
            <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-600 via-emerald-700 to-teal-800 text-white shadow-md">
                <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white animate-bounce">
                            <Pill className="h-5 w-5" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950">
                                    <BellRing className="h-3 w-3" /> Due Now
                                </span>
                                <span className="text-xs text-emerald-100 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Scheduled at {current.reminder_time ? current.reminder_time.slice(0, 5) : "Today"} · Repeats every 2 min
                                </span>
                            </div>
                            <p className="text-sm font-bold tracking-tight mt-0.5">
                                Time to take: <span className="underline decoration-amber-300">{current.medicine_name}</span> ({current.dosage})
                                {current.instructions ? ` — ${current.instructions}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {dueReminders.length > 1 && (
                            <span className="hidden sm:inline text-xs text-emerald-200">
                                +{dueReminders.length - 1} more pending
                            </span>
                        )}
                        <button
                            type="button"
                            disabled={isUpdating === current.reminder_id}
                            onClick={() => handleMarkTaken(current)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-900 shadow-sm transition hover:bg-emerald-50 hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer"
                        >
                            <Check className="h-4 w-4 text-emerald-600" />
                            {isUpdating === current.reminder_id ? "Saving..." : "TAKEN"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
