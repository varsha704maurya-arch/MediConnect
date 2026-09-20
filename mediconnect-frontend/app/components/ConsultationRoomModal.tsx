"use client";

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../lib/authContext";
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    Send,
    MessageSquare,
    User,
    Shield,
    Stethoscope,
    Clock,
    Sparkles,
    Maximize2,
    X,
    FileText
} from "lucide-react";

type ChatMessage = {
    message_id: number;
    appointment_id: number;
    sender_id: number;
    sender_role: "patient" | "doctor";
    sender_name: string;
    message: string;
    created_at: string;
};

type ConsultationRoomModalProps = {
    isOpen: boolean;
    onClose: () => void;
    appointmentId: number;
    partnerName: string;
    partnerRole: "Doctor" | "Patient";
    specializationOrHistory?: string;
    appointmentDate?: string;
    notes?: string;
};

export default function ConsultationRoomModal({
    isOpen,
    onClose,
    appointmentId,
    partnerName,
    partnerRole,
    specializationOrHistory,
    appointmentDate,
    notes,
}: ConsultationRoomModalProps) {
    const { user, role } = useAuth();

    // Call controls state
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callSeconds, setCallSeconds] = useState(0);
    const [activeTab, setActiveTab] = useState<"call" | "chat">("call");

    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Call timer
    useEffect(() => {
        if (!isOpen) {
            setCallSeconds(0);
            return;
        }
        const timer = setInterval(() => {
            setCallSeconds((s) => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen]);

    // Format timer
    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remaining = secs % 60;
        return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
    };

    // Load messages and poll
    useEffect(() => {
        if (!isOpen || !appointmentId) return;

        const loadMessages = async () => {
            try {
                const data = await apiRequest<ChatMessage[]>(`/appointments/${appointmentId}/messages`);
                setMessages(data || []);
            } catch {
                // quiet poll
            }
        };

        loadMessages();
        const poll = setInterval(loadMessages, 3500);
        return () => clearInterval(poll);
    }, [isOpen, appointmentId]);

    // Auto scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, activeTab]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const newMsg = await apiRequest<ChatMessage>(`/appointments/${appointmentId}/messages`, {
                method: "POST",
                body: JSON.stringify({ message: inputMessage.trim() }),
            });
            setMessages((prev) => [...prev, newMsg]);
            setInputMessage("");
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="relative flex flex-col w-full max-w-5xl h-[90vh] max-h-[750px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 text-white">
                    <div className="flex items-center gap-3">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                    Online Consultation Room
                                </h3>
                                <span className="rounded-full bg-teal-900/60 px-2 py-0.5 text-[10px] font-bold text-teal-300 border border-teal-700/50">
                                    {partnerRole === "Doctor" ? "Clinician Consultation" : "Patient Session"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Connected with {partnerName} · {specializationOrHistory || "Consultation in progress"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-mono font-bold text-emerald-400 border border-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{formatTime(callSeconds)}</span>
                        </div>

                        {/* Switch view buttons on mobile */}
                        <div className="flex lg:hidden rounded-lg bg-slate-800 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab("call")}
                                className={`px-2.5 py-1 rounded-md font-bold transition ${activeTab === "call" ? "bg-teal-600 text-white" : "text-slate-400"}`}
                            >
                                Call
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("chat")}
                                className={`px-2.5 py-1 rounded-md font-bold transition ${activeTab === "chat" ? "bg-teal-600 text-white" : "text-slate-400"}`}
                            >
                                Chat ({messages.length})
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content: Video Feed + Live Chat */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
                    {/* VIDEO CALL AREA */}
                    <div className={`relative flex flex-col justify-between bg-slate-950 p-4 sm:p-6 ${activeTab === "call" ? "flex" : "hidden lg:flex"}`}>
                        {/* Remote Participant Video Box */}
                        <div className="relative flex-1 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center text-center p-6">
                            {/* Ambient animated ring */}
                            <div className="absolute inset-0 bg-radial from-teal-900/10 via-transparent to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-2xl ring-4 ring-teal-500/20 mb-4 animate-pulse">
                                    {partnerRole === "Doctor" ? <Stethoscope className="h-12 w-12" /> : <User className="h-12 w-12" />}
                                    <span className="absolute bottom-0 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                                </div>
                                <h4 className="text-lg sm:text-xl font-extrabold text-white">
                                    {partnerName}
                                </h4>
                                <span className="text-xs text-teal-400 font-semibold mt-1">
                                    {partnerRole === "Doctor" ? "Licensed Physician · Live HD Audio & Video" : "Verified Patient · Session Active"}
                                </span>

                                {/* Simulated Audio wave visualizer */}
                                <div className="mt-5 flex items-center gap-1">
                                    {[16, 28, 44, 20, 36, 48, 24, 38, 18, 30].map((h, i) => (
                                        <div
                                            key={i}
                                            className="w-1 rounded-full bg-teal-400/80 animate-pulse"
                                            style={{
                                                height: `${h}px`,
                                                animationDuration: `${0.6 + (i % 5) * 0.2}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Patient notes indicator */}
                            {notes && (
                                <div className="absolute bottom-4 left-4 right-4 z-10 mx-auto max-w-lg rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-xs text-slate-300 text-left backdrop-blur-xs">
                                    <span className="font-bold text-teal-400 block mb-0.5">Consultation Notes:</span>
                                    {notes}
                                </div>
                            )}

                            {/* Local Self-preview PIP Box */}
                            <div className="absolute top-4 right-4 h-24 w-32 sm:h-28 sm:w-40 rounded-xl bg-slate-800 border-2 border-slate-700/80 shadow-xl overflow-hidden flex flex-col items-center justify-center p-2 z-20">
                                {isVideoOff ? (
                                    <div className="flex flex-col items-center text-slate-400 text-[10px]">
                                        <VideoOff className="h-5 w-5 mb-1 text-slate-500" />
                                        <span>Camera Off</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-white text-[10px]">
                                        <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center font-bold text-xs mb-1">
                                            {user?.name ? user.name[0].toUpperCase() : "ME"}
                                        </div>
                                        <span className="font-semibold">{user?.name || "You"} (Live)</span>
                                    </div>
                                )}
                                <span className="absolute bottom-1 right-2 text-[9px] font-mono text-emerald-400 font-bold">HD</span>
                            </div>
                        </div>

                        {/* Call Action Bar Controls */}
                        <div className="mt-4 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMuted(!isMuted)}
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition shadow-lg ${
                                    isMuted
                                        ? "bg-rose-600 text-white hover:bg-rose-700"
                                        : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                                }`}
                                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                            >
                                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsVideoOff(!isVideoOff)}
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition shadow-lg ${
                                    isVideoOff
                                        ? "bg-rose-600 text-white hover:bg-rose-700"
                                        : "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                                }`}
                                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                            >
                                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-12 px-6 items-center justify-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg transition"
                                title="Leave Consultation"
                            >
                                <PhoneOff className="h-5 w-5" />
                                <span>End Call</span>
                            </button>
                        </div>
                    </div>

                    {/* LIVE CONSULTATION CHAT */}
                    <div className={`flex flex-col bg-slate-900 border-l border-slate-800 overflow-hidden ${activeTab === "chat" ? "flex" : "hidden lg:flex"}`}>
                        <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                                <MessageSquare className="h-4 w-4 text-[var(--brand)]" />
                                <span>Consultation Chat</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Encrypted Clinical Log</span>
                        </div>

                        {/* Message list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                                    <MessageSquare className="h-8 w-8 mb-2 text-slate-600" />
                                    <p className="text-xs font-bold text-slate-400">No messages sent yet</p>
                                    <p className="text-[11px] text-slate-600 mt-1">
                                        Type a message below to chat during the consultation.
                                    </p>
                                </div>
                            ) : (
                                messages.map((m) => {
                                    const isMe = m.sender_id === user?.id;
                                    return (
                                        <div
                                            key={m.message_id}
                                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {isMe ? "You" : m.sender_name}
                                                </span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                                                    m.sender_role === "doctor"
                                                        ? "bg-teal-900/60 text-teal-300 border border-teal-700/50"
                                                        : "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
                                                }`}>
                                                    {m.sender_role}
                                                </span>
                                                <span className="text-[9px] text-slate-500">
                                                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                                                    isMe
                                                        ? "bg-[var(--brand)] text-white rounded-tr-none"
                                                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60"
                                                }`}
                                            >
                                                {m.message}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat input */}
                        <form onSubmit={handleSendMessage} className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2">
                            <input
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type clinical remarks, symptoms, or instructions..."
                                className="flex-1 h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim() || isSending}
                                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-[var(--brand)] text-white hover:bg-[var(--brand-deep)] transition disabled:opacity-40 cursor-pointer"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
