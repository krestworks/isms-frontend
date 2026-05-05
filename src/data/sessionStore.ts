// Mock session store — simulates the currently logged-in user, their available
// roles, and the active location scope. Backed by localStorage so it survives refresh.

import { useEffect, useState } from "react";

export type Role = "Admin" | "Manager" | "Accountant" | "Attendant" | "LocationHead" | "Employee";

export interface SessionUser {
  id: string;          // matches StaffRecord.id when employee, else USR-xxx
  name: string;
  email: string;
  roles: Role[];
  activeRole: Role;
  homeLocation?: string; // for LocationHead — the only location they can see
  modules: string[];   // module access list
  employeeId?: string; // staff record link
}

const STORAGE_KEY = "isms.session";
const LOC_KEY = "isms.activeLocation";

const defaultUser: SessionUser = {
  id: "USR-001",
  name: "Admin User",
  email: "admin@isms.co.ke",
  roles: ["Admin", "Manager", "Accountant", "Employee"],
  activeRole: "Admin",
  modules: ["All"],
  employeeId: "EMP-001",
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
    if (!user.roles.includes(role)) return;
    user = { ...user, activeRole: role };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch {}
    notify();
  },
  switchLocation(loc: string) {
    activeLocation = loc;
    try { localStorage.setItem(LOC_KEY, loc); } catch {}
    notify();
  },
  reset() { user = defaultUser; activeLocation = "All Locations"; notify(); },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useSession() {
  const [, force] = useState(0);
  useEffect(() => { const u = sessionStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  return { user: sessionStore.user(), activeLocation: sessionStore.activeLocation() };
}

// Helper: can the current user see all locations or only their own?
export function visibleLocationFilter(): (locationName?: string) => boolean {
  const u = sessionStore.user();
  const loc = sessionStore.activeLocation();
  if (u.activeRole === "LocationHead" && u.homeLocation) {
    return (l) => !l || l === u.homeLocation;
  }
  if (loc === "All Locations") return () => true;
  return (l) => !l || l === loc;
}
