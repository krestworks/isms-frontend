// Session store — holds the currently authenticated user and active location scope.
// Backed by localStorage so it survives page refresh.

import { useEffect, useState } from "react";
import { auditLog } from "./auditLogStore";

export type Role = "SuperAdmin" | "Admin" | "Manager" | "Accountant" | "Attendant" | "LocationHead" | "Employee";

export interface SessionUser {
  id: string;
  accountId?: string;
  name: string;
  email: string;
  roles: Role[];
  activeRole: Role;
  permissions: string[];   // effective permission codes for the current active role
  homeLocation?: string;   // set for LocationHead — their assigned station
  employeeId?: string;
  isEmployee?: boolean;
  status?: string;
  lastLogin?: string | null;
  createdAt?: string;
  hasPin?: boolean;   // quick-unlock PIN set for the POS lock screen
  workModules?: string[]; // from the linked Employee record — modules/businesses this person was assigned to
}

const STORAGE_KEY = "isms.session";
const LOC_KEY = "isms.activeLocation";

const defaultUser: SessionUser = {
  id: "",
  name: "",
  email: "",
  roles: [],
  activeRole: "Employee",
  permissions: [],
};

function load(): SessionUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultUser;
}

function loadLocation(): string {
  try { return localStorage.getItem(LOC_KEY) || "All Locations"; } catch { return "All Locations"; }
}

let user: SessionUser = load();
let activeLocation: string = loadLocation();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export const sessionStore = {
  user: () => user,
  activeLocation: () => activeLocation,
  setUser(next: SessionUser) {
    user = next;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    notify();
  },
  switchRole(role: Role) {
    // Local-only update — activeRole and permissions are already set by setUser
    // after the backend switchRole API call. This just triggers a re-render.
    if (!user.roles.includes(role)) return;
    const prev = user.activeRole;
    user = { ...user, activeRole: role };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch {}
    notify();
    try { auditLog.log("role.switch", role, `Switched role from ${prev} to ${role}`); } catch {}
  },
  switchLocation(loc: string) {
    const prev = activeLocation;
    activeLocation = loc;
    try { localStorage.setItem(LOC_KEY, loc); } catch {}
    notify();
    try { auditLog.log("location.switch", loc, `Switched location from ${prev} to ${loc}`); } catch {}
  },
  reset() { user = defaultUser; activeLocation = "All Locations"; notify(); },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useSession() {
  const [, force] = useState(0);
  useEffect(() => { const u = sessionStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  return { user: sessionStore.user(), activeLocation: sessionStore.activeLocation() };
}

export function visibleLocationFilter(): (locationName?: string) => boolean {
  const u = sessionStore.user();
  const loc = sessionStore.activeLocation();
  if (u.activeRole === "LocationHead" && u.homeLocation) {
    return (l) => !l || l === u.homeLocation;
  }
  if (loc === "All Locations") return () => true;
  return (l) => !l || l === loc;
}
