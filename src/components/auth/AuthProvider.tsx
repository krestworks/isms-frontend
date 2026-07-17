import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "@/lib/authService";
import { sessionStore } from "@/data/sessionStore";
import { stationsCache } from "@/data/stationsCache";
import { brandingStore } from "@/data/brandingStore";
import { stationsApi, ApiStationFull } from "@/lib/stationsApi";
import type { Role } from "@/data/sessionStore";
import type { SessionUser } from "@/data/sessionStore";
import { ApiError, setAccessToken, setActiveStationId, refreshAccessToken } from "@/lib/api";

export interface LoginOutcome {
  requiresOtp: boolean;
  otpChallenge?: string;
  devOtp?: string;
}

// Access tokens live 15 minutes — refresh proactively at roughly 2/3 of that so
// an in-flight POS action (e.g. the checkout submit itself) never races an
// expiry. This is in addition to, not instead of, the reactive 401-retry in api.ts.
const PROACTIVE_REFRESH_MS = 10 * 60 * 1000;

// Auto-lock the screen after this long with no mouse/keyboard/touch activity —
// only takes effect once the user has set a quick-unlock PIN (see LockScreen).
const IDLE_LOCK_MS = 10 * 60 * 1000;

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  isLocked: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  completeOtpLogin: (otpChallenge: string, otp: string, trustDevice?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  lock: () => void;
  unlockWithPin: (pin: string) => Promise<void>;
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
  const [isLocked, setIsLocked] = useState(false);
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
    setIsLocked(false);
  }, []);

  const lock = useCallback(() => {
    if (!sessionStore.user().hasPin) return; // nothing to unlock with — don't strand the user
    setIsLocked(true);
  }, []);

  const unlockWithPin = useCallback(async (pin: string) => {
    await authService.verifyPin(pin); // throws on wrong/missing PIN — caller shows the error
    setIsLocked(false);
  }, []);

  // Proactive access-token refresh — runs on a fixed timer the whole time the
  // user is authenticated, independent of the lock screen (the underlying
  // session must stay alive even while locked, or unlocking would fail).
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => { refreshAccessToken(); }, PROACTIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // Idle auto-lock — only meaningful once a PIN exists to unlock with again.
  // hasPin is read fresh from the store on every fired timeout (not captured in
  // the effect closure) so setting a PIN mid-session takes effect immediately.
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;
    let timer: ReturnType<typeof setTimeout>;
    const tryLock = () => { if (sessionStore.user().hasPin) lock(); };
    const reset = () => { clearTimeout(timer); timer = setTimeout(tryLock, IDLE_LOCK_MS); };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [isAuthenticated, isLocked, lock]);

  // Attempt silent refresh on mount to restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5002/api/v1"}/auth/refresh`,
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

  const finishSession = useCallback(async (user: SessionUser) => {
    sessionStore.setUser(user);
    const stations = await loadStations();
    enforceLocationScope(user, stations);
    await loadBranding();
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginOutcome> => {
    setError(null);
    try {
      const res = await authService.login(email, password);
      if ("requiresOtp" in res) {
        return { requiresOtp: true, otpChallenge: res.data.otpChallenge, devOtp: res.data.dev_otp };
      }
      await finishSession(res.data.user);
      return { requiresOtp: false };
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      setError(msg);
      throw err;
    }
  }, [finishSession]);

  const completeOtpLogin = useCallback(async (otpChallenge: string, otp: string, trustDevice?: boolean) => {
    setError(null);
    try {
      const res = await authService.verifyLoginOtp(otpChallenge, otp, trustDevice);
      await finishSession(res.data.user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to verify code. Please try again.";
      setError(msg);
      throw err;
    }
  }, [finishSession]);

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
      isLocked,
      login,
      completeOtpLogin,
      logout,
      switchRole,
      lock,
      unlockWithPin,
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
