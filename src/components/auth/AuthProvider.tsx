import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "@/lib/authService";
import { sessionStore } from "@/data/sessionStore";
import type { Role } from "@/data/sessionStore";
import { ApiError, setAccessToken } from "@/lib/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async (silent = false) => {
    if (!silent) {
      try { await authService.logout(); } catch { /* best-effort */ }
    }
    setAccessToken(null);
    sessionStore.reset();
    setIsAuthenticated(false);
  }, []);

  // Attempt silent refresh on mount to restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/auth/refresh`,
          { method: "POST", credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.accessToken) {
            setAccessToken(data.data.accessToken);
            const user = await authService.getMe();
            sessionStore.setUser(user);
            setIsAuthenticated(true);
          }
        }
      } catch {
        // No valid session — will show login
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Listen for auth:logout events fired by the API client on unrecoverable 401
  useEffect(() => {
    const handler = () => handleLogout(true);
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [handleLogout]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await authService.login(email, password);
      sessionStore.setUser(res.data.user);
      setIsAuthenticated(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(() => handleLogout(false), [handleLogout]);

  const switchRole = useCallback(async (role: Role) => {
    try {
      const res = await authService.switchRole(role);
      sessionStore.setUser(res.data.user);
      sessionStore.switchRole(role);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to switch role.";
      setError(msg);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      login,
      logout,
      switchRole,
      error,
      clearError: () => setError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
