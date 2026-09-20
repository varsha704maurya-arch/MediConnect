"use client";

import React, { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL, apiRequest } from "../../lib/api";
import { useAuth, UserRole, AuthUser } from "../../lib/authContext";
import {
    Shield,
    Stethoscope,
    HeartHandshake,
    Eye,
    EyeOff,
    Lock,
    Mail,
    User,
    Phone,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Activity
} from "lucide-react";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login } = useAuth();

    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<UserRole>("patient");
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in, redirect to respective dashboard
    useEffect(() => {
        if (user && user.role) {
            router.replace(`/${user.role}`);
        }
    }, [user, router]);

    // Handle Google OAuth callback parameters
    useEffect(() => {
        const token = searchParams.get("token");
        const googleRole = searchParams.get("role") as UserRole | null;
        if (!token) return;

        localStorage.setItem("token", token);
        router.replace(`/select-role?token=${encodeURIComponent(token)}&role=${encodeURIComponent(googleRole || "patient")}&isGoogle=1`);
    }, [searchParams, router]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccessMsg("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/users/${mode === "signin" ? "login" : "register"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone_number: phoneNumber.trim() || undefined,
                    password,
                    role,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error ?? `Unable to ${mode === "signin" ? "sign in" : "create your account"}.`);
            }

            if (mode === "signup") {
                setMode("signin");
                setSuccessMsg("Account created successfully! Please sign in with your credentials.");
                setPassword("");
                return;
            }

            login(data.token, data.user);
        } catch (submitError: unknown) {
            const message = submitError instanceof Error ? submitError.message : "Unable to proceed. Please try again.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    // Google Quick Demo Sign-In (Allows instant test flow into /select-role)
    async function handleGoogleDemoSignIn(demoRole?: UserRole) {
        setError("");
        setIsLoading(true);
        try {
            const data = await apiRequest<{
                message: string;
                token: string;
                user: AuthUser;
            }>("/users/google-demo", {
                method: "POST",
                body: JSON.stringify({
                    email: "google.user@example.com",
                    name: "Alex Rivera",
                    role: demoRole || "patient",
                }),
            });

            if (data.token) {
                localStorage.setItem("token", data.token);
                router.push(`/select-role?token=${encodeURIComponent(data.token)}&isGoogle=1`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Google Demo Sign-In failed.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="relative flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
            <div className="soft-grid pointer-events-none absolute inset-0 opacity-40" />

            <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl sm:p-9 z-10">
                <div className="text-center">
                    <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand)] border border-teal-200/60">
                        {mode === "signin" ? "Secure Portal" : "Join MediConnect"}
                    </span>
                    <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                        {mode === "signin" ? "Welcome back" : "Create your workspace"}
                    </h1>
                    <p className="mt-2 text-xs sm:text-sm text-slate-500">
                        {mode === "signin"
                            ? "Sign in to access your appointments, medications, and healthcare records."
                            : "Connect seamlessly with doctors, patients, and family members."}
                    </p>
                </div>

                {/* Tab switcher */}
                <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => {
                            setMode("signin");
                            setError("");
                            setSuccessMsg("");
                        }}
                        className={`rounded-lg py-2.5 transition ${
                            mode === "signin"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode("signup");
                            setError("");
                            setSuccessMsg("");
                        }}
                        className={`rounded-lg py-2.5 transition ${
                            mode === "signup"
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        Create Account
                    </button>
                </div>

                {successMsg && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {error && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Google Sign-in buttons */}
                <div className="mt-6 space-y-2.5">
                    <a
                        href={`${API_URL}/users/google`}
                        className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
                    >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                            />
                        </svg>
                        <span>Continue with Google</span>
                    </a>

                    <button
                        type="button"
                        onClick={() => handleGoogleDemoSignIn()}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-50/70 border border-teal-200/80 px-3 text-xs font-bold text-[var(--brand-deep)] transition hover:bg-teal-100 cursor-pointer"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
                        <span>Google Quick Sign-In (Test Role Selection Flow)</span>
                    </button>
                </div>

                <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span>Or sign in with email</span>
                    <span className="h-px flex-1 bg-slate-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            {mode === "signup" ? "Select Your Role" : "Continue as"}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setRole("patient")}
                                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                                    role === "patient"
                                        ? "border-[var(--brand)] bg-teal-50/50 text-[var(--brand-deep)] ring-1 ring-[var(--brand)] font-bold"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <Shield className="h-4 w-4 mb-1" />
                                <span className="text-xs">Patient</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("doctor")}
                                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                                    role === "doctor"
                                        ? "border-[var(--brand)] bg-teal-50/50 text-[var(--brand-deep)] ring-1 ring-[var(--brand)] font-bold"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <Stethoscope className="h-4 w-4 mb-1" />
                                <span className="text-xs">Doctor</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("guardian")}
                                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                                    role === "guardian"
                                        ? "border-[var(--brand)] bg-teal-50/50 text-[var(--brand-deep)] ring-1 ring-[var(--brand)] font-bold"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                <HeartHandshake className="h-4 w-4 mb-1" />
                                <span className="text-xs">Guardian</span>
                            </button>
                        </div>
                    </div>

                    {mode === "signup" && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700">Full Name</label>
                            <div className="relative mt-1.5">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <User className="h-4 w-4" />
                                </span>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Jane Doe"
                                    className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                                />
                            </div>
                        </div>
                    )}

                    {mode === "signup" && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700">
                                Phone Number <span className="font-normal text-slate-400">(for medicine alerts)</span>
                            </label>
                            <div className="relative mt-1.5">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Phone className="h-4 w-4" />
                                </span>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+1 555 123 4567"
                                    className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Email Address</label>
                        <div className="relative mt-1.5">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <Mail className="h-4 w-4" />
                            </span>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700">Password</label>
                        <div className="relative mt-1.5">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <Lock className="h-4 w-4" />
                            </span>
                            <input
                                required
                                minLength={6}
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 h-11 w-full rounded-xl bg-[var(--brand)] text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand-deep)] disabled:opacity-60 cursor-pointer"
                    >
                        {isLoading ? "Validating credentials..." : mode === "signin" ? "Sign In Securely" : "Create Account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-[11px] text-slate-400">
                    Protected by MediConnect Healthcare Security.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
                    <Activity className="h-8 w-8 animate-spin text-[var(--brand)]" />
                </div>
            }
        >
            <LoginContent />
        </Suspense>
    );
}
