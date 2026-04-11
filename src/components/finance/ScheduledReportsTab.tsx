import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface ScheduledReport {
  id: string;
  name: string;
  type: string;
  frequency: string;
  modules: string;
  recipients: string;
  lastRun: string;
  nextRun: string;
  status: string;
}

const reportTypes = ["Revenue Summary", "Expense Report", "P&L Statement", "Inventory Report", "Sales Report", "Reconciliation"];
const frequencies = ["Daily", "Weekly", "Bi-Weekly", "Monthly", "Quarterly"];

const demoData: ScheduledReport[] = [
  { id: "RPT-001", name: "Daily Revenue Summary", type: "Revenue Summary", frequency: "Daily", modules: "All", recipients: "admin@isms.co.ke", lastRun: "2025-01-15 06:00", nextRun: "2025-01-16 06:00", status: "active" },
  { id: "RPT-002", name: "Weekly Fuel Reconciliation", type: "Reconciliation", frequency: "Weekly", modules: "Fuel", recipients: "manager@isms.co.ke", lastRun: "2025-01-13 08:00", nextRun: "2025-01-20 08:00", status: "active" },
  { id: "RPT-003", name: "Monthly P&L Statement", type: "P&L Statement", frequency: "Monthly", modules: "All", recipients: "admin@isms.co.ke, accounts@isms.co.ke", lastRun: "2025-01-01 07:00", nextRun: "2025-02-01 07:00", status: "active" },
  { id: "RPT-004", name: "Quarterly Inventory Audit", type: "Inventory Report", frequency: "Quarterly", modules: "Fuel, LPG, Water", recipients: "admin@isms.co.ke", lastRun: "2024-10-01 07:00", nextRun: "2025-01-01 07:00", status: "inactive" },
];

const columns: Column<ScheduledReport>[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Report Name", sortable: true },
  { key: "type", label: "Type" },
  { key: "frequency", label: "Frequency" },
  { key: "modules", label: "Modules" },
  { key: "lastRun", label: "Last Run" },
  { key: "nextRun", label: "Next Run" },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "frequency", label: "Frequency", options: frequencies.map(f => ({ label: f, value: f })) },
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
];

export function ScheduledReportsTab() {
  const [data, setData] = useState(demoData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item?: ScheduledReport } | null>(null);
  const [form, setForm] = useState<Partial<ScheduledReport>>({});

  const openAdd = () => { setForm({ status: "active" }); setModal({ mode: "add" }); };
  const openEdit = (item: ScheduledReport) => { setForm({ ...item }); setModal({ mode: "edit", item }); };
  const openView = (item: ScheduledReport) => { setForm({ ...item }); setModal({ mode: "view", item }); };
  const handleDelete = (item: ScheduledReport) => setData(d => d.filter(r => r.id !== item.id));

  const handleSubmit = () => {
    if (modal?.mode === "add") {
      setData(d => [...d, { ...form, id: `RPT-${String(d.length + 1).padStart(3, "0")}`, lastRun: "—", nextRun: "TBD" } as ScheduledReport]);
    } else if (modal?.mode === "edit" && modal.item) {
      setData(d => d.map(r => r.id === modal.item!.id ? { ...r, ...form } as ScheduledReport : r));
    }
    setModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Schedule Report</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["id", "name", "recipients"]} searchPlaceholder="Search reports..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Schedule Report" : modal.mode === "edit" ? "Edit Report" : "Report Details"} onClose={() => setModal(null)} onSubmit={handleSubmit} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Report Name</Label><Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Type</Label><Select value={form.type || ""} onValueChange={v => setForm(f => ({ ...f, type: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{reportTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Frequency</Label><Select value={form.frequency || ""} onValueChange={v => setForm(f => ({ ...f, frequency: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{frequencies.map(fr => <SelectItem key={fr} value={fr}>{fr}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Modules</Label><Input value={form.modules || ""} onChange={e => setForm(f => ({ ...f, modules: e.target.value }))} disabled={modal.mode === "view"} placeholder="e.g. All, Fuel, LPG" /></div>
            <div><Label>Recipients</Label><Input value={form.recipients || ""} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} disabled={modal.mode === "view"} placeholder="email@example.com" /></div>
            <div><Label>Status</Label><Select value={form.status || ""} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
