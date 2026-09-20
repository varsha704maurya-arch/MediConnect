import React from "react";

export function CardSkeleton() {
    return (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-xs animate-pulse">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="mt-4 h-8 w-2/3 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <div className="flex items-center justify-between border-b border-slate-100 py-4 animate-pulse">
            <div className="space-y-2">
                <div className="h-4 w-48 rounded bg-slate-200" />
                <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-6 px-5 py-10">
            <div className="h-8 w-64 rounded bg-slate-200 animate-pulse" />
            <div className="grid gap-5 md:grid-cols-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
            </div>
        </div>
    );
}
