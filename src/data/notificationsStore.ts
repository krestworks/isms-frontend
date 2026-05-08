// Per-user in-app notifications. Mock store with localStorage persistence.
import { useEffect, useState } from "react";
import { sessionStore } from "./sessionStore";

export type NotificationKind =
  | "correction.approved"
  | "correction.rejected"
  | "info";

export interface Notification {
  id: string;
  ts: string;
  userId: string;     // recipient (matches sessionStore.user.id OR employeeId)
  employeeId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  link?: string;
}

const STORAGE_KEY = "isms.notifications";
const listeners = new Set<() => void>();

function load(): Notification[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch {}
  return [];
}
let items: Notification[] = load();
const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-200))); } catch {} };
const notify = () => { persist(); listeners.forEach(l => l()); };

export const notifications = {
  all: () => items,
  forCurrentUser: () => {
    const u = sessionStore.user();
    return items.filter(n => n.userId === u.id || (u.employeeId && n.employeeId === u.employeeId));
  },
  push(n: Omit<Notification, "id" | "ts" | "read">) {
    items = [...items, { ...n, id: `NT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, ts: new Date().toISOString(), read: false }];
    notify();
  },
  markRead(id: string) { items = items.map(n => n.id === id ? { ...n, read: true } : n); notify(); },
  markAllRead() {
    const u = sessionStore.user();
    items = items.map(n => (n.userId === u.id || (u.employeeId && n.employeeId === u.employeeId)) ? { ...n, read: true } : n);
    notify();
  },
  remove(id: string) { items = items.filter(n => n.id !== id); notify(); },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useNotifications(): Notification[] {
  const [, force] = useState(0);
  useEffect(() => { const u = notifications.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  return notifications.forCurrentUser().slice().reverse();
}
