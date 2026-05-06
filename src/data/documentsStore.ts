// Centralized employee documents store so they can be linked from other
// modules (e.g., disciplinary cases attach evidence documents).
import { useEffect, useState } from "react";

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  fileName: string;
  fileSize: number;
  fileData?: string;
  uploadedOn: string;
  expiresOn: string;
  status: string;
  notes: string;
  caseId?: string; // optional link to disciplinary case
}

export const DOC_TYPES = ["ID Card", "Passport", "KRA PIN Cert.", "NHIF/SHIF Card", "NSSF Card", "Academic Cert.", "Contract", "Driving Licence", "Medical Cert.", "Police Clearance", "Disciplinary Evidence", "Hearing Notice", "Appeal Letter", "Other"];

const initial: EmployeeDocument[] = [
  { id: "DOC-001", employeeId: "EMP-001", employeeName: "James Mwangi", type: "ID Card", fileName: "james_id.pdf", fileSize: 245678, uploadedOn: "2025-01-16", expiresOn: "2030-01-15", status: "valid", notes: "" },
  { id: "DOC-002", employeeId: "EMP-001", employeeName: "James Mwangi", type: "Contract", fileName: "james_contract.pdf", fileSize: 189234, uploadedOn: "2025-01-15", expiresOn: "2026-12-31", status: "expiring", notes: "Renewal due Dec 2026" },
  { id: "DOC-003", employeeId: "EMP-002", employeeName: "Grace Wanjiku", type: "KRA PIN Cert.", fileName: "grace_kra.pdf", fileSize: 87123, uploadedOn: "2024-11-02", expiresOn: "—", status: "valid", notes: "" },
  { id: "DOC-004", employeeId: "EMP-005", employeeName: "David Kimani", type: "Disciplinary Evidence", fileName: "cash_audit_report.pdf", fileSize: 312045, uploadedOn: "2026-03-26", expiresOn: "—", status: "valid", notes: "Audit trail for DC-002", caseId: "DC-002" },
];

const listeners = new Set<() => void>();
let docs: EmployeeDocument[] = [...initial];
const notify = () => listeners.forEach(l => l());

export const documentsStore = {
  all: () => docs,
  byEmployee: (id: string) => docs.filter(d => d.employeeId === id),
  byCase: (caseId: string) => docs.filter(d => d.caseId === caseId),
  add(rec: Omit<EmployeeDocument, "id">) {
    docs = [...docs, { ...rec, id: `DOC-${String(docs.length + 1).padStart(3, "0")}` }];
    notify();
  },
  update(id: string, patch: Partial<EmployeeDocument>) {
    docs = docs.map(d => d.id === id ? { ...d, ...patch } : d);
    notify();
  },
  remove(id: string) { docs = docs.filter(d => d.id !== id); notify(); },
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
};

export function useDocuments(filter?: (d: EmployeeDocument) => boolean): EmployeeDocument[] {
  const [, force] = useState(0);
  useEffect(() => { const u = documentsStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  const list = documentsStore.all();
  return filter ? list.filter(filter) : list;
}
