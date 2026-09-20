import React from "react";
import { FolderOpen, LucideIcon } from "lucide-react";

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    title,
    description,
    icon: Icon = FolderOpen,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs border border-slate-200">
                <Icon className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500 leading-relaxed">{description}</p>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--brand-deep)] focus:outline-none"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
