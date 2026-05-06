// Centralized shift store — used by every module's shift schedule and by the
// HR Attendance tab to auto-derive expected attendance records.
import { useEffect, useState } from "react";
import { staffStore } from "./staffStore";

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
}

const seed: Shift[] = (() => {
  const today = new Date();
  return staffStore.all().slice(0, 6).map((s, i) => {
    const d = new Date(today.getTime() + (i - 2) * 86400000);
    const types = ["Morning (6am-2pm)", "Afternoon (2pm-10pm)", "Night (10pm-6am)"];
    const starts = ["06:00", "14:00", "22:00"];
    const ends = ["14:00", "22:00", "06:00"];
    return {
      id: `SH-${String(i + 1).padStart(3, "0")}`,
      employeeId: s.id,
      employeeName: s.name,
      department: s.department,
      date: d.toISOString().split("T")[0],
      shift: types[i % 3],
      startTime: starts[i % 3],
      endTime: ends[i % 3],
      location: s.location || "—",
      notes: "",
    };
  });
})();

const listeners = new Set<() => void>();
let shifts: Shift[] = [...seed];
const notify = () => listeners.forEach(l => l());

export const shiftsStore = {
  all: () => shifts,
  byDepartment: (d: string) => shifts.filter(s => s.department === d),
  byEmployee: (id: string) => shifts.filter(s => s.employeeId === id),
  add(rec: Omit<Shift, "id">) {
    shifts = [...shifts, { ...rec, id: `SH-${String(shifts.length + 1).padStart(3, "0")}` }];
    notify();
  },
  update(id: string, patch: Partial<Shift>) {
    shifts = shifts.map(s => s.id === id ? { ...s, ...patch } : s);
    notify();
  },
  remove(id: string) { shifts = shifts.filter(s => s.id !== id); notify(); },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useShifts(filter?: (s: Shift) => boolean): Shift[] {
  const [, force] = useState(0);
  useEffect(() => { const u = shiftsStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  const list = shiftsStore.all();
  return filter ? list.filter(filter) : list;
}

// Attendance overrides keyed by `${employeeId}|${date}`
export interface AttendancePunch { clockIn?: string; clockOut?: string; correctedBy?: string; correctionReason?: string; correctedAt?: string; }
const attendance: Record<string, AttendancePunch> = {};
const attListeners = new Set<() => void>();

export const attendanceStore = {
  punch(employeeId: string, date: string, kind: "in" | "out", time: string) {
    const key = `${employeeId}|${date}`;
    const cur = attendance[key] || {};
    attendance[key] = kind === "in" ? { ...cur, clockIn: time } : { ...cur, clockOut: time };
    attListeners.forEach(l => l());
  },
  // Manual correction by HR/Manager — both fields plus audit reason.
  correct(employeeId: string, date: string, clockIn: string, clockOut: string, correctedBy: string, reason: string) {
    const key = `${employeeId}|${date}`;
    attendance[key] = { clockIn, clockOut, correctedBy, correctionReason: reason, correctedAt: new Date().toISOString() };
    attListeners.forEach(l => l());
  },
  get(employeeId: string, date: string): AttendancePunch | undefined {
    return attendance[`${employeeId}|${date}`];
  },
  subscribe(l: () => void) { attListeners.add(l); return () => attListeners.delete(l); },
};

export interface DerivedAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  shift: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  status: "completed" | "in_progress" | "pending" | "absent";
  corrected?: boolean;
  correctedBy?: string;
  correctionReason?: string;
  location?: string;
}

function diffHours(a: string, b: string): number {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let mins = (bh * 60 + bm) - (ah * 60 + am);
  if (mins < 0) mins += 24 * 60; // overnight
  return Math.round((mins / 60) * 10) / 10;
}

export function deriveAttendance(): DerivedAttendance[] {
  const today = new Date().toISOString().split("T")[0];
  return shiftsStore.all().map(s => {
    const punch = attendance[`${s.employeeId}|${s.date}`];
    const clockIn = punch?.clockIn || "";
    const clockOut = punch?.clockOut || "";
    let status: DerivedAttendance["status"] = "pending";
    if (clockIn && clockOut) status = "completed";
    else if (clockIn) status = "in_progress";
    else if (s.date < today) status = "absent";
    return {
      id: `ATT-${s.id}`,
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      department: s.department,
      date: s.date,
      shift: s.shift,
      scheduledStart: s.startTime,
      scheduledEnd: s.endTime,
      clockIn,
      clockOut,
      hoursWorked: diffHours(clockIn, clockOut),
      status,
      corrected: !!punch?.correctedBy,
      correctedBy: punch?.correctedBy,
      correctionReason: punch?.correctionReason,
      location: s.location,
    };
  });
}

export function useDerivedAttendance(): DerivedAttendance[] {
  const [, force] = useState(0);
  useEffect(() => {
    const a = shiftsStore.subscribe(() => force(n => n + 1));
    const b = attendanceStore.subscribe(() => force(n => n + 1));
    return () => { a(); b(); };
  }, []);
  return deriveAttendance();
}
