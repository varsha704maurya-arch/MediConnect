"use client";

import React from "react";
import NearbyHealthcare from "../components/NearbyHealthcare";
import { MapPin, Stethoscope, Shield } from "lucide-react";
import Link from "next/link";

export default function NearbyHealthcarePage() {
    return (
        <div className="relative min-h-screen pb-16">
            {/* Header banner */}
            <div className="bg-white border-b border-slate-200/80">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-[var(--brand)] border border-teal-200/80">
                                    <MapPin className="h-3.5 w-3.5" /> Emergency & Clinic Locator
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                    Radius: 5 km
                                </span>
                            </div>
                            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                Hospitals & Clinics Near You
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
                                If you are new to this location or need emergency care, find verified hospitals, multi-specialty clinics, and healthcare centers within 5 km with instant directions.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link
                                href="/patient"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
                            >
                                <Shield className="h-4 w-4 text-[var(--brand)]" />
                                Patient Portal
                            </Link>
                            <Link
                                href="/doctor"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[var(--brand-deep)] transition"
                            >
                                <Stethoscope className="h-4 w-4" />
                                Doctor Portal
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <NearbyHealthcare />
            </div>
        </div>
    );
}
