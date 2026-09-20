"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/authContext";

export default function DashboardPage() {
    const router = useRouter();
    const { user, role, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        if (user && role && ["patient", "doctor", "guardian"].includes(role)) {
            router.replace(`/${role}`);
        } else {
            router.replace("/login");
        }
    }, [user, role, isLoading, router]);

    return (
        <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4">
            <div className="text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--brand)]" />
                <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Opening your healthcare workspace...
                </p>
            </div>
        </div>
    );
}
