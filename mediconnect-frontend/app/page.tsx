import Link from "next/link";
import {
    Stethoscope,
    Pill,
    HeartHandshake,
    Video,
    Building2,
    Clock,
    MapPin,
    Shield,
    CheckCircle2,
    ArrowRight,
    FileText,
    Activity,
    Lock
} from "lucide-react";

export default function Home() {
    return (
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
            {/* Hero Background Grid */}
            <div className="soft-grid pointer-events-none absolute inset-0 h-[40rem] opacity-70" />

            {/* HERO SECTION */}
            <main className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                    <section className="rise-in">
                        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1 text-xs font-bold text-teal-800 backdrop-blur-xs">
                            <Shield className="h-3.5 w-3.5 text-[var(--brand)]" />
                            <span>Comprehensive Healthcare Ecosystem</span>
                        </div>

                        <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                            Healthcare connected between <span className="text-[var(--brand)]">Patients</span>, <span className="text-teal-700">Doctors</span> & <span className="text-amber-700">Guardians</span>.
                        </h1>

                        <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600">
                            Book online video consultations or offline hospital visits. Paste prescriptions, upload clinical reports, track medicine schedules with 2-minute repeating alerts, and locate healthcare within 5 km.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3.5">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-deep)] hover:shadow-lg"
                            >
                                <span>Get Started with Google</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/select-role"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
                            >
                                Choose Workspace Role
                            </Link>
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-200/80 pt-8 text-slate-600">
                            <div>
                                <strong className="block text-2xl sm:text-3xl font-extrabold text-slate-900">3 Roles</strong>
                                <span className="text-xs sm:text-sm">Patient, Doctor, Guardian</span>
                            </div>
                            <div>
                                <strong className="block text-2xl sm:text-3xl font-extrabold text-teal-700">2 min</strong>
                                <span className="text-xs sm:text-sm">Repeating alerts until taken</span>
                            </div>
                            <div>
                                <strong className="block text-2xl sm:text-3xl font-extrabold text-slate-900">5 km</strong>
                                <span className="text-xs sm:text-sm">GPS hospital & clinic finder</span>
                            </div>
                        </div>
                    </section>

                    {/* Interactive Showcase Card */}
                    <section className="rise-in relative" style={{ animationDelay: "120ms" }} aria-label="MediConnect overview">
                        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_24px_70px_rgba(26,65,59,0.12)]">
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">Live Session Preview</span>
                                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">Online Consultation Room</h3>
                                </div>
                                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                            </div>

                            {/* Simulated Live Call Banner */}
                            <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-6 text-white shadow-inner">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
                                            <Stethoscope className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-teal-300 font-semibold">Attending Doctor</p>
                                            <p className="text-base font-extrabold">Dr. Sarah Jenkins</p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30">
                                        04:18 HD
                                    </span>
                                </div>

                                <div className="mt-5 rounded-xl bg-slate-800/80 border border-slate-700/60 p-3 text-xs text-slate-300">
                                    <span className="text-teal-400 font-bold block mb-0.5">Live Consultation Chat:</span>
                                    &ldquo;Prescription added to your records. Follow-up scheduled for next week.&rdquo;
                                </div>
                            </div>

                            {/* Side by side cards */}
                            <div className="mt-5 grid grid-cols-2 gap-3.5">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                                        <Clock className="h-4 w-4" />
                                        <span>Medicine Alert</span>
                                    </div>
                                    <p className="mt-2 text-sm font-bold text-slate-900">Metformin 500mg</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Repeating every 2 min until TAKEN</p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
                                        <MapPin className="h-4 w-4" />
                                        <span>Nearby Care</span>
                                    </div>
                                    <p className="mt-2 text-sm font-bold text-slate-900">City General Hospital</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">1.2 km away · Directions ready</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* THE 3 WORKSPACE PERSPECTIVES */}
                <section className="mt-24 border-t border-slate-200/80 pt-16">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">Tailored Workspaces</span>
                        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                            Designed for Every Member of Care
                        </h2>
                        <p className="mt-3 text-sm sm:text-base text-slate-600">
                            Whether you are a patient receiving treatment, a doctor conducting consultations, or a guardian monitoring family members.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-8 md:grid-cols-3">
                        {/* Patient Card */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                            <div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-[var(--brand)]">
                                    <Pill className="h-6 w-6" />
                                </div>
                                <h3 className="mt-5 text-xl font-bold text-slate-900">Patient Workspace</h3>
                                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Book online and offline consultations. Paste prescriptions, upload lab reports, confirm medicine doses as taken, and track your health progress.
                                </p>
                                <ul className="mt-4 space-y-2 text-xs text-slate-700 font-medium">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Join online consultation room with video & chat</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Paste prescriptions & upload past test reports</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>2-minute persistent medication reminders</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                href="/patient"
                                className="mt-6 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
                            >
                                <span>Patient Portal</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {/* Doctor Card */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                            <div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                                    <Stethoscope className="h-6 w-6" />
                                </div>
                                <h3 className="mt-5 text-xl font-bold text-slate-900">Doctor Workspace</h3>
                                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Manage scheduled appointments, host real-time virtual consultations, inspect patient histories, and issue prescriptions with auto-synced reminders.
                                </p>
                                <ul className="mt-4 space-y-2 text-xs text-slate-700 font-medium">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Virtual consultation room with encrypted chat</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Inspect patient medical history & past reports</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Health & medication adherence improvement tracker</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                href="/doctor"
                                className="mt-6 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
                            >
                                <span>Doctor Portal</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {/* Guardian Card */}
                        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                            <div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                                    <HeartHandshake className="h-6 w-6" />
                                </div>
                                <h3 className="mt-5 text-xl font-bold text-slate-900">Guardian Workspace</h3>
                                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    Monitor family members and dependents. Receive urgent escalation alerts when a dose is not taken, and view overall family compliance.
                                </p>
                                <ul className="mt-4 space-y-2 text-xs text-slate-700 font-medium">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Automatic 2-minute escalation for unconfirmed doses</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>Live family medication adherence percentage</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span>5 km nearest emergency hospital navigation</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                href="/guardian"
                                className="mt-6 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition"
                            >
                                <span>Guardian Portal</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 5 KM HEALTHCARE FINDER TEASER */}
                <section className="mt-24 rounded-3xl bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 p-8 sm:p-12 text-white shadow-xl">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-bold text-teal-300 border border-teal-500/30">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Geolocation Enabled</span>
                        </div>
                        <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight">
                            Find Hospitals, Clinics & Emergency Care Within 5 km
                        </h2>
                        <p className="mt-4 text-xs sm:text-base text-slate-300 leading-relaxed">
                            Need immediate attention or an offline specialist? MediConnect instantly finds medical centers within 5 kilometers of your real-time coordinates, with direct turn-by-turn Google Maps navigation.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <Link
                                href="/nearby"
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[var(--brand-deep)] transition"
                            >
                                <MapPin className="h-4 w-4" />
                                <span>Open 5 km Locator</span>
                            </Link>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                            >
                                <span>Sign In with Google</span>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
