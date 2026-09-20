"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const roleLabels = { patient: "Patient", doctor: "Doctor", guardian: "Guardian" } as const;
const emptySubscribe = () => () => undefined;
const getServerRole = () => null;
const getBrowserRole = () => {
    const storedRole = localStorage.getItem("role");
    return storedRole && storedRole in roleLabels ? storedRole as keyof typeof roleLabels : null;
};

export default function RoleHeader() {
    const role = useSyncExternalStore(emptySubscribe, getBrowserRole, getServerRole);
    const router = useRouter();

    function signOut() {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        router.replace("/login");
    }

    return (
        <nav className="flex flex-wrap items-center justify-end gap-1 text-xs font-medium text-[var(--ink-muted)] sm:text-sm" aria-label="Primary navigation">
            {role && <Link href={`/${role}`} className="rounded-lg px-2 py-2 transition hover:bg-[#edf6f3] hover:text-[var(--brand-deep)] sm:px-3">{roleLabels[role]} dashboard</Link>}
            {role && <a href="#nearby-care" className="rounded-lg px-2 py-2 transition hover:bg-[#edf6f3] hover:text-[var(--brand-deep)] sm:px-3">Nearby care</a>}
            {role ? <button type="button" onClick={signOut} className="ml-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-white transition hover:bg-[var(--brand-deep)] sm:ml-2 sm:px-4">Sign out</button> : <Link href="/login" className="ml-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-white transition hover:bg-[var(--brand-deep)] sm:ml-2 sm:px-4">Sign in</Link>}
        </nav>
    );
}
