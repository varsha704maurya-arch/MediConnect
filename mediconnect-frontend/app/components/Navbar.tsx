"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import NotificationBell from "./NotificationBell";
import { Activity, User, LogOut, Menu, X, Shield, Stethoscope, HeartHandshake } from "lucide-react";

export default function Navbar() {
    const { user, role, logout } = useAuth();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const getRoleBadge = () => {
        switch (role) {
            case "doctor":
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
                        <Stethoscope className="h-3 w-3" /> Doctor
                    </span>
                );
            case "guardian":
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        <HeartHandshake className="h-3 w-3" /> Guardian
                    </span>
                );
            case "patient":
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <Shield className="h-3 w-3" /> Patient
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
                {/* Brand Logo */}
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2.5 group" aria-label="MediConnect Home">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-sm transition group-hover:bg-[var(--brand-deep)]">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                                Medi<span className="text-[var(--brand)]">Connect</span>
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                                Healthcare Platform
                            </span>
                        </div>
                    </Link>

                    {/* Navigation links for logged in role */}
                    <nav className="hidden md:flex items-center gap-1">
                        {role && (
                            <Link
                                href={`/${role}`}
                                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                    pathname === `/${role}`
                                        ? "bg-teal-50 text-[var(--brand-deep)]"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                Dashboard
                            </Link>
                        )}
                        <Link
                            href="/nearby"
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                                pathname === "/nearby"
                                    ? "bg-teal-50 text-[var(--brand-deep)]"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Nearby Care (5 km)
                        </Link>
                        {role === "patient" && (
                            <>
                                <a
                                    href="/patient#appointments"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Appointments
                                </a>
                                <a
                                    href="/patient#medicines"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Medicines
                                </a>
                                <a
                                    href="/patient#records"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Medical Records
                                </a>
                                <a
                                    href="/patient#profile"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Profile
                                </a>
                            </>
                        )}
                        {role === "doctor" && (
                            <>
                                <a
                                    href="/doctor#schedule"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Consultations
                                </a>
                                <a
                                    href="/doctor#patients"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Patient Directory
                                </a>
                            </>
                        )}
                        {role === "guardian" && (
                            <>
                                <a
                                    href="/guardian#patients"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Linked Patients
                                </a>
                                <a
                                    href="/guardian#medications"
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                                >
                                    Medication Monitor
                                </a>
                            </>
                        )}
                    </nav>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <Link
                                href="/select-role"
                                className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                                title="Switch between Patient, Doctor, and Guardian"
                            >
                                Switch Role
                            </Link>
                            <NotificationBell />
                            <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3">
                                {getRoleBadge()}
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-slate-800 leading-tight">
                                        {user.name}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 leading-none">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={logout}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-rose-600 transition cursor-pointer"
                                title="Sign out"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Sign out</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                href="/nearby"
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                                Nearby (5 km)
                            </Link>
                            <Link
                                href="/login"
                                className="rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition"
                            >
                                Sign in
                            </Link>
                        </div>
                    )}


                    {/* Mobile Hamburger */}
                    {user && (
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && user && (
                <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800">{user.name}</span>
                        {getRoleBadge()}
                    </div>
                    <Link
                        href={`/${role}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/nearby"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100"
                    >
                        Nearby Care (5 km)
                    </Link>
                    <Link
                        href="/select-role"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                        Switch Role / Workspace
                    </Link>

                    {role === "patient" && (
                        <>
                            <a
                                href="/patient#appointments"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Appointments
                            </a>
                            <a
                                href="/patient#medicines"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Medicines
                            </a>
                            <a
                                href="/patient#records"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Medical Records
                            </a>
                            <a
                                href="/patient#profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Profile
                            </a>
                        </>
                    )}
                    {role === "doctor" && (
                        <>
                            <a
                                href="/doctor#schedule"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Consultation Schedule
                            </a>
                            <a
                                href="/doctor#patients"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Patient List
                            </a>
                        </>
                    )}
                    {role === "guardian" && (
                        <>
                            <a
                                href="/guardian#patients"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Linked Patients
                            </a>
                            <a
                                href="/guardian#medications"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Medication Monitor
                            </a>
                        </>
                    )}
                </div>
            )}
        </header>
    );
}
