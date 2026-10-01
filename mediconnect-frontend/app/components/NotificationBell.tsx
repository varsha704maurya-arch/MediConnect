"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Pill, Calendar, AlertTriangle, Info } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../lib/authContext";

type NotificationItem = {
    notification_id: number;
    user_id: number;
    message: string;
    type: "appointment" | "prescription" | "reminder" | "system";
    status: "unread" | "read";
    created_at: string;
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pushSupported] = useState(() => {
        if (typeof window === "undefined") return false;
        return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    });
    const [pushSubscribed, setPushSubscribed] = useState(false);
    const [isSubscribingPush, setIsSubscribingPush] = useState(false);
    const [pushMessage, setPushMessage] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;
        let isMounted = true;

        const loadNotifications = async () => {
            try {
                const data = await apiRequest<NotificationItem[]>("/notifications/my");
                if (isMounted) setNotifications(data || []);
            } catch {
                // Fail silently on polling
            }
        };

        loadNotifications();
        const interval = setInterval(loadNotifications, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user]);

    // Check push notification current subscription
    useEffect(() => {
        if (typeof window === "undefined" || !pushSupported) return;
        if (Notification.permission === "granted") {
            navigator.serviceWorker.ready.then((reg) => {
                reg.pushManager.getSubscription().then((sub) => {
                    if (sub) setPushSubscribed(true);
                });
            }).catch(() => {});
        }
    }, [pushSupported]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const subscribeToPush = async () => {
        if (!pushSupported) {
            setPushMessage("Push notifications not supported on this browser.");
            return;
        }

        setIsSubscribingPush(true);
        setPushMessage(null);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                setPushMessage("Notification permission denied in browser.");
                return;
            }

            const keyData = await apiRequest<{ vapidPublicKey?: string; key?: string }>("/notifications/vapid-public-key");
            const publicKey = keyData.vapidPublicKey || keyData.key;
            if (!publicKey) {
                setPushMessage("Push notification server key not configured.");
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey),
                });
            }

            await apiRequest("/notifications/subscribe", {
                method: "POST",
                body: JSON.stringify(subscription.toJSON()),
            });

            setPushSubscribed(true);
            setPushMessage("Device subscribed to push reminders!");
            setTimeout(() => setPushMessage(null), 4000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to subscribe to push notifications";
            setPushMessage(msg);
        } finally {
            setIsSubscribingPush(false);
        }
    };

    const unreadCount = notifications.filter((n) => n.status === "unread").length;

    const markAsRead = async (id: number) => {
        try {
            await apiRequest(`/notifications/${id}/read`, { method: "PUT" });
            setNotifications((prev) =>
                prev.map((n) => (n.notification_id === id ? { ...n, status: "read" } : n))
            );
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        try {
            setIsLoading(true);
            await apiRequest("/notifications/read-all", { method: "PUT" });
            setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "reminder":
                return <Pill className="h-4 w-4 text-emerald-600" />;
            case "appointment":
                return <Calendar className="h-4 w-4 text-teal-600" />;
            case "prescription":
                return <Info className="h-4 w-4 text-blue-600" />;
            default:
                return <AlertTriangle className="h-4 w-4 text-amber-600" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition focus:outline-none"
                aria-label="View notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={markAllAsRead}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:text-[var(--brand-deep)] transition"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Push Notifications Enable / Status Card */}
                    <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-200/80 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${pushSubscribed ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
                                <span className="text-[11px] font-semibold text-slate-700">
                                    {pushSubscribed ? "Push alerts active on device" : "Device Push Reminders"}
                                </span>
                            </div>
                            {!pushSubscribed && (
                                <button
                                    type="button"
                                    disabled={isSubscribingPush}
                                    onClick={subscribeToPush}
                                    className="rounded-lg bg-[var(--brand)] px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-[var(--brand-deep)] disabled:opacity-60 cursor-pointer"
                                >
                                    {isSubscribingPush ? "Enabling..." : "Enable"}
                                </button>
                            )}
                        </div>
                        {pushMessage && (
                            <p className="mt-1 text-[10px] text-teal-700 font-medium">{pushMessage}</p>
                        )}
                    </div>

                    <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                No notifications right now.
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.notification_id}
                                    className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition ${
                                        item.status === "unread" ? "bg-teal-50/40" : "hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs border border-slate-200/60">
                                            {getIcon(item.type)}
                                        </div>
                                        <div>
                                            <p className={`text-xs ${item.status === "unread" ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                                                {item.message}
                                            </p>
                                            <span className="mt-1 block text-[10px] text-slate-400">
                                                {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                                            </span>
                                        </div>
                                    </div>
                                    {item.status === "unread" && (
                                        <button
                                            type="button"
                                            onClick={() => markAsRead(item.notification_id)}
                                            title="Mark as read"
                                            className="shrink-0 text-slate-400 hover:text-teal-600 transition p-1"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
