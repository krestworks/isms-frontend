// Central staff registry — single source of truth for all modules.
// In a real backend this would be a Supabase query; for now it's a module-level
// store so HR onboarding additions are visible to every module's Staff tab.

export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string; // Fuel | LPG | Water | Automotive | Car Wash | Inventory | HR | Finance | Admin
  role: string;
  joinDate: string;
  status: string; // active | onboarding | inactive
  location?: string;
  idNumber?: string;
  kraPin?: string;
  nhifNo?: string;
  nssfNo?: string;
  bankName?: string;
  bankAccount?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}

const initial: StaffRecord[] = [
  { id: "EMP-001", name: "James Mwangi", email: "james@isms.co.ke", phone: "0712345678", department: "Fuel", role: "Attendant", joinDate: "2025-01-15", status: "active", location: "Nairobi CBD", idNumber: "12345678", kraPin: "A001234567B", nhifNo: "1234567", nssfNo: "9876543", bankName: "Equity Bank", bankAccount: "0123456789", emergencyContact: "Jane Mwangi", emergencyPhone: "0711111111", notes: "" },
  { id: "EMP-002", name: "Grace Wanjiku", email: "grace@isms.co.ke", phone: "0723456789", department: "LPG", role: "Manager", joinDate: "2024-11-01", status: "active", location: "Westlands", idNumber: "23456789", kraPin: "B002345678C", nhifNo: "2345678", nssfNo: "8765432", bankName: "KCB", bankAccount: "9876543210", emergencyContact: "John Wanjiku", emergencyPhone: "0722222222", notes: "" },
  { id: "EMP-003", name: "Peter Ochieng", email: "peter@isms.co.ke", phone: "0734567890", department: "Car Wash", role: "Attendant", joinDate: "2025-03-10", status: "onboarding", location: "Mombasa Road", idNumber: "34567890", kraPin: "", nhifNo: "", nssfNo: "", bankName: "", bankAccount: "", emergencyContact: "", emergencyPhone: "", notes: "Pending KRA PIN submission" },
  { id: "EMP-004", name: "Mary Akinyi", email: "mary@isms.co.ke", phone: "0745678901", department: "Water", role: "Technician", joinDate: "2024-06-20", status: "active", location: "Nairobi CBD", idNumber: "45678901", kraPin: "D004567890E", nhifNo: "4567890", nssfNo: "6543210", bankName: "Co-op Bank", bankAccount: "5432109876", emergencyContact: "Tom Akinyi", emergencyPhone: "0744444444", notes: "" },
  { id: "EMP-005", name: "David Kimani", email: "david@isms.co.ke", phone: "0756789012", department: "Automotive", role: "Technician", joinDate: "2025-02-01", status: "inactive", location: "Westlands", idNumber: "56789012", kraPin: "E005678901F", nhifNo: "5678901", nssfNo: "5432109", bankName: "NCBA", bankAccount: "1357924680", emergencyContact: "Susan Kimani", emergencyPhone: "0755555555", notes: "Resigned" },
  { id: "EMP-006", name: "Susan Otieno", email: "susan@isms.co.ke", phone: "0767890123", department: "Fuel", role: "Supervisor", joinDate: "2024-08-12", status: "active", location: "Nairobi CBD", idNumber: "67890123", kraPin: "F006789012G", nhifNo: "6789012", nssfNo: "4321098", bankName: "Equity Bank", bankAccount: "2468013579", emergencyContact: "Paul Otieno", emergencyPhone: "0766666666", notes: "" },
  { id: "EMP-007", name: "Kevin Njoroge", email: "kevin@isms.co.ke", phone: "0778901234", department: "Inventory", role: "Attendant", joinDate: "2025-04-01", status: "active", location: "Westlands", idNumber: "78901234", kraPin: "G007890123H", nhifNo: "7890123", nssfNo: "3210987", bankName: "KCB", bankAccount: "1122334455", emergencyContact: "Lucy Njoroge", emergencyPhone: "0777777777", notes: "" },
];

type Listener = () => void;
const listeners = new Set<Listener>();
let staff: StaffRecord[] = [...initial];

export const staffStore = {
  all(): StaffRecord[] {
    return staff;
  },
  byDepartment(department: string): StaffRecord[] {
    return staff.filter(s => s.department === department);
  },
  add(record: Omit<StaffRecord, "id">) {
    const id = `EMP-${String(staff.length + 1).padStart(3, "0")}`;
    staff = [...staff, { id, ...record }];
    listeners.forEach(l => l());
  },
  update(id: string, patch: Partial<StaffRecord>) {
    staff = staff.map(s => (s.id === id ? { ...s, ...patch } : s));
    listeners.forEach(l => l());
  },
  remove(id: string) {
    staff = staff.filter(s => s.id !== id);
    listeners.forEach(l => l());
  },
  setAll(next: StaffRecord[]) {
    staff = next;
    listeners.forEach(l => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

import { useEffect, useState } from "react";

export function useStaff(filter?: (s: StaffRecord) => boolean): StaffRecord[] {
  const [, force] = useState(0);
  useEffect(() => { const u = staffStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  const list = staffStore.all();
  return filter ? list.filter(filter) : list;
}

export function useStaffByDepartment(department: string): StaffRecord[] {
  return useStaff(s => s.department === department);
}
