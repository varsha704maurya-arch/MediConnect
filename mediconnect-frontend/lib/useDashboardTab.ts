"use client";

import { useCallback, useEffect, useState } from "react";

export function useDashboardTab<T extends string>(validTabs: readonly T[], defaultTab: T) {
    const [activeTab, setActiveTab] = useState<T>(defaultTab);

    useEffect(() => {
        const applyHash = () => {
            const hash = window.location.hash.replace("#", "") as T;
            if (validTabs.includes(hash)) {
                setActiveTab(hash);
            }
        };

        applyHash();
        window.addEventListener("hashchange", applyHash);
        return () => window.removeEventListener("hashchange", applyHash);
    }, [validTabs]);

    const selectTab = useCallback((tab: T) => {
        setActiveTab(tab);
        if (typeof window !== "undefined") {
            window.history.replaceState(null, "", `#${tab}`);
        }
    }, []);

    return [activeTab, selectTab] as const;
}
