// User accounts store. Auto-provisions a portal account for every onboarded staff.
import { useEffect, useState } from "react";
import { staffStore, StaffRecord } from "./staffStore";
import type { Role } from "./sessionStore";

export interface UserAccount {
  id: string;            // USR-xxx OR mirrors EMP-xxx for staff
  employeeId?: string;
  name: string;
  email: string;
  phone: string;
  roles: Role[];
  modules: string[];     // module names or ["All"]
  homeLocation?: string;
  status: "active" | "inactive";
  lastLogin: string;
}

const initial: UserAccount[] = [
  { id: "USR-001", name: "John Kamau", email: "admin@isms.co.ke", phone: "+254 700 111 111", roles: ["Admin"], modules: ["All"], status: "active", lastLogin: "2026-04-15 14:30" },
];

const listeners = new Set<() => void>();
let users: UserAccount[] = [...initial];

const notify = () => listeners.forEach(l => l());

function ensurePortalForStaff(s: StaffRecord) {
  if (users.some(u => u.employeeId === s.id)) return;
  const roles: Role[] = ["Employee"];
  const r = s.role.toLowerCase();
  if (r.includes("manager")) roles.unshift("Manager");
  if (r.includes("accountant")) roles.unshift("Accountant");
  if (r.includes("supervisor")) roles.unshift("LocationHead");
  users = [...users, {
    id: s.id,
    employeeId: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    roles,
    modules: [s.department],
    homeLocation: s.location,
    status: s.status === "inactive" ? "inactive" : "active",
    lastLogin: "—",
  }];
}

// Auto-provision on every staff change
function syncWithStaff() {
  staffStore.all().forEach(ensurePortalForStaff);
  notify();
}
syncWithStaff();
staffStore.subscribe(syncWithStaff);

export const usersStore = {
  all: () => users,
  add(u: Omit<UserAccount, "id" | "lastLogin">) {
    users = [...users, { ...u, id: `USR-${String(users.length + 1).padStart(3, "0")}`, lastLogin: "—" }];
    notify();
  },
  update(id: string, patch: Partial<UserAccount>) {
    users = users.map(u => u.id === id ? { ...u, ...patch } : u);
    notify();
  },
  remove(id: string) { users = users.filter(u => u.id !== id); notify(); },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useUsers(): UserAccount[] {
  const [, force] = useState(0);
  useEffect(() => { const u = usersStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  return usersStore.all();
}
