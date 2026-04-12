import { useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  module: string;
  frequency: string;
  sections: string;
  lastUsed: string;
  status: string;
}

const initial: Template[] = [
  { id: "TPL-001", name: "Daily Sales Summary", module: "All", frequency: "daily", sections: "Revenue, Transactions, Payment Methods", lastUsed: "2025-01-15", status: "active" },
  { id: "TPL-002", name: "Weekly Inventory Report", module: "Fuel", frequency: "weekly", sections: "Tank Levels, Deliveries, Consumption Rate", lastUsed: "2025-01-14", status: "active" },
  { id: "TPL-003", name: "Monthly P&L Statement", module: "All", frequency: "monthly", sections: "Revenue, COGS, OpEx, Net Profit", lastUsed: "2025-01-01", status: "active" },
  { id: "TPL-004", name: "LPG Cylinder Audit", module: "LPG", frequency: "weekly", sections: "Full, Empty, Damaged, In-Transit", lastUsed: "2025-01-13", status: "active" },
  { id: "TPL-005", name: "Staff Performance Review", module: "All", frequency: "monthly", sections: "Sales per Staff, Attendance, Ratings", lastUsed: "2024-12-31", status: "inactive" },
];

const blank: Omit<Template, "id"> = { name: "", module: "All", frequency: "daily", sections: "", lastUsed: "", status: "active" };

export function ReportTemplatesTab() {
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Template } | null>(null);
  const [form, setForm] = useState<Omit<Template, "id">>(blank);

  const openAdd = () => { setForm(blank); setModal({ mode: "add", item: {} as Template }); };
  const openView = (t: Template) => { setForm(t); setModal({ mode: "view", item: t }); };
  const openEdit = (t: Template) => { setForm(t); setModal({ mode: "edit", item: t }); };
  const handleDelete = (t: Template) => { setData(d => d.filter(x => x.id !== t.id)); toast.success("Template deleted"); };
  const handleSave = () => {
    if (modal?.mode === "add") {
      setData(d => [{ ...form, id: `TPL-${String(d.length + 1).padStart(3, "0")}` }, ...d]);
      toast.success("Template created");
    } else {
      setData(d => d.map(x => x.id === modal?.item.id ? { ...x, ...form } : x));
      toast.success("Template updated");
    }
    setModal(null);
  };

  const columns: Column<Template>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Template Name", sortable: true },
    { key: "module", label: "Module" },
    { key: "frequency", label: "Frequency" },
    { key: "sections", label: "Sections" },
    { key: "lastUsed", label: "Last Used", sortable: true },
    { key: "status", label: "Status", render: t => <StatusBadge status={t.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "frequency", label: "Frequency", options: [{ label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }] },
    { key: "module", label: "Module", options: ["All", "Fuel", "LPG", "Water", "Automotive", "Car Wash"].map(m => ({ label: m, value: m })) },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Report Templates</h3>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> New Template</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "module", "sections"]} searchPlaceholder="Search templates..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "Template Details" : modal.mode === "add" ? "New Template" : "Edit Template"} onSubmit={handleSave} isView={isView}>
          <div className="space-y-3">
            <div><Label>Template Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Module</Label>
              <Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["All", "Fuel", "LPG", "Water", "Automotive", "Car Wash"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Sections (comma-separated)</Label><Textarea value={form.sections} onChange={e => setForm(f => ({ ...f, sections: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
