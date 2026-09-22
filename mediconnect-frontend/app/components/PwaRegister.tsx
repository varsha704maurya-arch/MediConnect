"use client";

import { useEffect } from "react";

export default function PwaRegister() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("MediConnect PWA Service Worker active with scope:", registration.scope);
                })
                .catch((err) => {
                    console.warn("MediConnect Service Worker registration failed:", err);
                });
        }
    }, []);

    return null;
}
