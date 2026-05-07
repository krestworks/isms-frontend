// Recurring shift templates — defines a weekly pattern (e.g., Mon/Wed/Fri morning)
// and bulk-generates Shift records when applied to a date range.
import { useEffect, useState } from "react";
import { shiftsStore } from "./shiftsStore";
import { staffStore } from "./staffStore";

export interface ShiftTemplate {
  id: string;
  name: string;
  department: string;
  shift: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[]; // 0 (Sun) – 6 (Sat)
  employeeIds: string[];
  location?: string;
  notes: string;
}

const initial: ShiftTemplate[] = [
  { id: "TPL-001", name: "Fuel Morning Crew", department: "Fuel", shift: "Morning (6am-2pm)", startTime: "06:00", endTime: "14:00", daysOfWeek: [1, 2, 3, 4, 5], employeeIds: ["EMP-001", "EMP-006"], location: "Nairobi CBD", notes: "Mon–Fri" },
];

const listeners = new Set<() => void>();
let templates: ShiftTemplate[] = [...initial];
const notify = () => listeners.forEach(l => l());

export const shiftTemplatesStore = {
  all: () => templates,
  byDepartment: (d: string) => templates.filter(t => t.department === d),
  add(rec: Omit<ShiftTemplate, "id">) {
    templates = [...templates, { ...rec, id: `TPL-${String(templates.length + 1).padStart(3, "0")}` }];
    notify();
  },
  update(id: string, patch: Partial<ShiftTemplate>) {
    templates = templates.map(t => t.id === id ? { ...t, ...patch } : t);
    notify();
  },
  remove(id: string) { templates = templates.filter(t => t.id !== id); notify(); },
  // Detect conflicts before applying a template — overlapping shifts for any
  // assigned employee within the date range. Returns conflict descriptors.
  detectConflicts(template: ShiftTemplate, from: string, to: string): { date: string; employeeId: string; employeeName: string; existing: string }[] {
    const start = new Date(from), end = new Date(to);
    const conflicts: { date: string; employeeId: string; employeeName: string; existing: string }[] = [];
    const tMin = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
    const overlap = (aS: string, aE: string, bS: string, bE: string) => {
      let s1 = tMin(aS), e1 = tMin(aE); if (e1 <= s1) e1 += 1440;
      let s2 = tMin(bS), e2 = tMin(bE); if (e2 <= s2) e2 += 1440;
      return s1 < e2 && s2 < e1;
    };
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!template.daysOfWeek.includes(d.getDay())) continue;
      const date = d.toISOString().split("T")[0];
      template.employeeIds.forEach(eid => {
        const existing = shiftsStore.byEmployee(eid).filter(s => s.date === date);
        existing.forEach(ex => {
          if (overlap(ex.startTime, ex.endTime, template.startTime, template.endTime)) {
            const emp = staffStore.all().find(s => s.id === eid);
            conflicts.push({ date, employeeId: eid, employeeName: emp?.name || eid, existing: `${ex.shift} ${ex.startTime}–${ex.endTime}` });
          }
        });
      });
    }
    return conflicts;
  },
  // Generate shifts in [from, to] inclusive (YYYY-MM-DD).
  apply(template: ShiftTemplate, from: string, to: string, skipConflicts = true): { created: number; skipped: number } {
    const start = new Date(from);
    const end = new Date(to);
    let created = 0, skipped = 0;
    const tMin = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
    const overlap = (aS: string, aE: string, bS: string, bE: string) => {
      let s1 = tMin(aS), e1 = tMin(aE); if (e1 <= s1) e1 += 1440;
      let s2 = tMin(bS), e2 = tMin(bE); if (e2 <= s2) e2 += 1440;
      return s1 < e2 && s2 < e1;
    };
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!template.daysOfWeek.includes(d.getDay())) continue;
      const date = d.toISOString().split("T")[0];
      template.employeeIds.forEach(eid => {
        const emp = staffStore.all().find(s => s.id === eid);
        if (!emp) return;
        if (skipConflicts) {
          const clash = shiftsStore.byEmployee(eid).some(s => s.date === date && overlap(s.startTime, s.endTime, template.startTime, template.endTime));
          if (clash) { skipped++; return; }
        }
        shiftsStore.add({
          employeeId: eid,
          employeeName: emp.name,
          department: template.department,
          date,
          shift: template.shift,
          startTime: template.startTime,
          endTime: template.endTime,
          location: template.location || emp.location || "—",
          notes: template.notes ? `[${template.name}] ${template.notes}` : `[${template.name}]`,
        });
        created++;
      });
    }
    return { created, skipped };
  },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useShiftTemplates(filter?: (t: ShiftTemplate) => boolean): ShiftTemplate[] {
  const [, force] = useState(0);
  useEffect(() => { const u = shiftTemplatesStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  const list = shiftTemplatesStore.all();
  return filter ? list.filter(filter) : list;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
