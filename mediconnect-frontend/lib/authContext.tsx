"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "./api";

export type UserRole = "patient" | "doctor" | "guardian" | "admin";

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    phone_number?: string | null;
    role: UserRole;
    profile?: Record<string, unknown> | null;
};

type AuthContextType = {
    user: AuthUser | null;
    token: string | null;
    isLoading: boolean;
    role: UserRole | null;
    login: (token: string, user: AuthUser) => void;
    logout: () => void;
    refreshUser: () => Promise<AuthUser | null>;
    setSessionUser: (user: AuthUser, token?: string) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(() => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("user");
        }
        setToken(null);
        setUser(null);
        router.push("/login");
    }, [router]);

    const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
        if (typeof window === "undefined") {
            setIsLoading(false);
            return null;
        }

        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            setUser(null);
            setToken(null);
            setIsLoading(false);
            return null;
        }

        try {
            const data = await apiRequest<{ user: AuthUser }>("/users/me");
            setUser(data.user);
            setToken(storedToken);
            localStorage.setItem("role", data.user.role);
            localStorage.setItem("user", JSON.stringify(data.user));
            return data.user;
        } catch (error) {
            console.warn("Session validation failed:", error);
            logout();
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        if (storedToken && storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setToken(storedToken);
            } catch {
                // Ignore parse errors
            }
        }
        refreshUser();
    }, [refreshUser]);

    const login = useCallback((newToken: string, newUser: AuthUser) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("token", newToken);
            localStorage.setItem("role", newUser.role);
            localStorage.setItem("user", JSON.stringify(newUser));
        }
        setToken(newToken);
        setUser(newUser);
        router.push(`/${newUser.role}`);
    }, [router]);

    const setSessionUser = useCallback((updatedUser: AuthUser, newToken?: string) => {
        if (typeof window !== "undefined") {
            if (newToken) {
                localStorage.setItem("token", newToken);
                setToken(newToken);
            }
            localStorage.setItem("role", updatedUser.role);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }
        setUser(updatedUser);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                role: user?.role || null,
                login,
                logout,
                refreshUser,
                setSessionUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
