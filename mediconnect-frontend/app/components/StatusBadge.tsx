import React from "react";
import { Video, Building2, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";

type BadgeType = "online" | "offline" | "booked" | "completed" | "cancelled" | "taken" | "due" | "scheduled";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
    const normalized = (status || "").toLowerCase().trim() as BadgeType;

    switch (normalized) {
        case "online":
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 border border-teal-200/80 ${className}`}>
                    <Video className="h-3.5 w-3.5 text-teal-600" />
                    ONLINE CONSULTATION
                </span>
            );
        case "offline":
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/80 ${className}`}>
                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                    OFFLINE CONSULTATION
                </span>
            );
        case "taken":
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 ${className}`}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Taken
                </span>
            );
        case "due":
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300 animate-pulse ${className}`}>
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    Due Now
                </span>
            );
        case "completed":
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 ${className}`}>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Completed
                </span>
            );
        case "cancelled":
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200 ${className}`}>
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    Cancelled
                </span>
            );
        case "booked":
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 ${className}`}>
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    Confirmed
                </span>
            );
        case "scheduled":
        default:
            return (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 ${className}`}>
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    {status || "Scheduled"}
                </span>
            );
    }
}
