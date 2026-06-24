import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "@/lib/authService";
import { sessionStore } from "@/data/sessionStore";
import { stationsCache } from "@/data/stationsCache";
import { brandingStore } from "@/data/brandingStore";
import { stationsApi, ApiStationFull } from "@/lib/stationsApi";
import type { Role } from "@/data/sessionStore";
import type { SessionUser } from "@/data/sessionStore";
import { ApiError, setAccessToken, setActiveStationId } from "@/lib/api";

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

// After setting a user, enforce that non-admins are locked to their home station.
// If homeLocation is unset but only one station exists, lock to that station.
function enforceLocationScope(user: SessionUser, stations: ApiStationFull[] = []) {
  if (user.permissions.includes("stations.view")) {
    // Admin-level user — default to global view; no station filter
    setActiveStationId(null);
    return;
  }
  if (user.homeLocation) {
    // homeLocation is a station ID — lock to it and inject into API calls
    const station = stations.find(s => s.id === user.homeLocation);
    sessionStore.switchLocation(station?.name ?? user.homeLocation);
    setActiveStationId(user.homeLocation);
  } else if (stations.length === 1) {
    // Single-station deployment: lock non-admin to the only station
    sessionStore.switchLocation(stations[0].name);
    setActiveStationId(stations[0].id);
  }
}

// Fetch the station list into the cache and return it (best-effort).
async function loadStations(): Promise<ApiStationFull[]> {
  try {
    const res = await stationsApi.list();
    const list = res.data ?? [];
    stationsCache.set(list);
    return list;
  } catch {
    return [];
  }
}

// Fetch account branding into the store (best-effort — SuperAdmin has no account).
async function loadBranding() {
  try {
    const data = await authService.getMyAccount();
    brandingStore.set(data);
  } catch {
    // SuperAdmin or network error — leave existing cached branding
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = useCallback(async (silent = false) => {
    if (!silent) {
      try { await authService.logout(); } catch { /* best-effort */ }
    }
    setAccessToken(null);
    setActiveStationId(null);
    sessionStore.reset();
    stationsCache.clear();
    brandingStore.reset();
    setIsAuthenticated(false);
  }, []);

  // Attempt silent refresh on mount to restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "https://isms-backend-production.up.railway.app/api/v1"}/auth/refresh`,
          { method: "POST", credentials: "include" },
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.accessToken) {
            setAccessToken(data.data.accessToken);
            const user = await authService.getMe();
            sessionStore.setUser(user);
            const stations = await loadStations();
            enforceLocationScope(user, stations);
            await loadBranding();
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
      const stations = await loadStations();
      enforceLocationScope(res.data.user, stations);
      await loadBranding();
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
      // Reload stations — role change may alter what the user can see
      const stations = await loadStations();
      enforceLocationScope(res.data.user, stations);
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
