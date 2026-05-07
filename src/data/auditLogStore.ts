// Audit log — append-only record of sensitive actions (location/role switches,
// document add/remove, attendance corrections, permission denials).
import { useEffect, useState } from "react";

export type AuditAction =
  | "location.switch"
  | "role.switch"
  | "document.attach"
  | "document.remove"
  | "attendance.correction.requested"
  | "attendance.correction.approved"
  | "attendance.correction.rejected"
  | "permission.denied";

export interface AuditEntry {
  id: string;
  ts: string;       // ISO timestamp
  userId: string;
  userName: string;
  role: string;
  location: string;
  action: AuditAction;
  target: string;   // affected entity id/name
  details: string;
}

const STORAGE_KEY = "isms.auditLog";
const listeners = new Set<() => void>();

function load(): AuditEntry[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
let entries: AuditEntry[] = load();
const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-500))); } catch {} };
const notify = () => { persist(); listeners.forEach(l => l()); };

export const auditLog = {
  all: () => entries,
  log(action: AuditAction, target: string, details: string) {
    // Lazy-import to avoid circular deps
    const { sessionStore } = require("./sessionStore");
    const u = sessionStore.user();
    entries = [...entries, {
      id: `AL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      ts: new Date().toISOString(),
      userId: u.id, userName: u.name, role: u.activeRole,
      location: sessionStore.activeLocation(),
      action, target, details,
    }];
    notify();
  },
  clear() { entries = []; notify(); },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useAuditLog(filter?: (e: AuditEntry) => boolean): AuditEntry[] {
  const [, force] = useState(0);
  useEffect(() => { const u = auditLog.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  const list = [...auditLog.all()].reverse();
  return filter ? list.filter(filter) : list;
}
