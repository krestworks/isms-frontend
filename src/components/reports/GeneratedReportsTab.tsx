import { useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  title: string;
  type: string;
  module: string;
  period: string;
  generatedAt: string;
  generatedBy: string;
  status: string;
  fileSize: string;
}

const initial: Report[] = [
  { id: "RPT-001", title: "Daily Fuel Sales Summary", type: "daily", module: "Fuel", period: "2025-01-15", generatedAt: "2025-01-15 18:00", generatedBy: "Admin", status: "completed", fileSize: "245 KB" },
  { id: "RPT-002", title: "Weekly LPG Inventory Report", type: "weekly", module: "LPG", period: "2025-01-08 - 2025-01-14", generatedAt: "2025-01-14 23:00", generatedBy: "System", status: "completed", fileSize: "512 KB" },
  { id: "RPT-003", title: "Monthly Revenue Breakdown", type: "monthly", module: "All", period: "December 2024", generatedAt: "2025-01-01 06:00", generatedBy: "System", status: "completed", fileSize: "1.2 MB" },
  { id: "RPT-004", title: "Daily Water Production Log", type: "daily", module: "Water", period: "2025-01-15", generatedAt: "2025-01-15 18:00", generatedBy: "Admin", status: "pending", fileSize: "—" },
  { id: "RPT-005", title: "Monthly Car Wash Performance", type: "monthly", module: "Car Wash", period: "December 2024", generatedAt: "2025-01-02 08:00", generatedBy: "System", status: "completed", fileSize: "380 KB" },
];

const blank: Omit<Report, "id"> = { title: "", type: "daily", module: "All", period: "", generatedAt: "", generatedBy: "Admin", status: "pending", fileSize: "—" };

export function GeneratedReportsTab() {
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Report } | null>(null);
  const [form, setForm] = useState<Omit<Report, "id">>(blank);

  const openAdd = () => { setForm(blank); setModal({ mode: "add", item: {} as Report }); };
  const openView = (r: Report) => { setForm(r); setModal({ mode: "view", item: r }); };
  const openEdit = (r: Report) => { setForm(r); setModal({ mode: "edit", item: r }); };
  const handleDelete = (r: Report) => { setData(d => d.filter(x => x.id !== r.id)); toast.success("Report deleted"); };
  const handleSave = () => {
    if (modal?.mode === "add") {
      setData(d => [{ ...form, id: `RPT-${String(d.length + 1).padStart(3, "0")}`, generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "), status: "completed", fileSize: "— KB" }, ...d]);
      toast.success("Report generated");
    } else {
      setData(d => d.map(x => x.id === modal?.item.id ? { ...x, ...form } : x));
      toast.success("Report updated");
    }
    setModal(null);
  };

  const columns: Column<Report>[] = [
    { key: "id", label: "ID" },
    { key: "title", label: "Title", sortable: true },
    { key: "type", label: "Type" },
    { key: "module", label: "Module" },
    { key: "period", label: "Period" },
    { key: "generatedAt", label: "Generated", sortable: true },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "fileSize", label: "Size" },
  ];

  const filters: FilterOption[] = [
    { key: "type", label: "Type", options: [{ label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }] },
    { key: "module", label: "Module", options: ["Fuel", "LPG", "Water", "Automotive", "Car Wash", "All"].map(m => ({ label: m, value: m })) },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Generated Reports</h3>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Generate Report</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["title", "module", "period"]} searchPlaceholder="Search reports..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "Report Details" : modal.mode === "add" ? "Generate Report" : "Edit Report"} onSubmit={handleSave} submitLabel={modal.mode === "add" ? "Generate" : "Save"} isView={isView}>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Module</Label>
              <Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["All", "Fuel", "LPG", "Water", "Automotive", "Car Wash"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Period</Label><Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} readOnly={isView} /></div>
            {isView && (
              <>
                <div><Label>Generated At</Label><Input value={form.generatedAt} readOnly /></div>
                <div><Label>Generated By</Label><Input value={form.generatedBy} readOnly /></div>
                <div><Label>File Size</Label><Input value={form.fileSize} readOnly /></div>
                <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-1" /> Download Report</Button>
              </>
            )}
          </div>
        </ModalForm>
      )}
    </div>
  );
}
