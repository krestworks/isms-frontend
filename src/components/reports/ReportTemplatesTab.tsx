import { useCallback, useEffect, useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { reportsApi, ApiReportTemplate } from "@/lib/reportsApi";

type FormMode = "add" | "edit" | "view";

const MODULES = ["All","Fuel","LPG","Water","Automotive","Car Wash"];

const blank: Omit<ApiReportTemplate, "id" | "stationId" | "createdAt"> = {
  name: "", module: "All", frequency: "daily", sections: "", status: "active", lastUsed: "",
};

export function ReportTemplatesTab() {
  const { stationId } = useActiveStation();
  const [data,    setData]    = useState<ApiReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ mode: FormMode; item?: ApiReportTemplate } | null>(null);
  const [form,    setForm]    = useState<Omit<ApiReportTemplate, "id" | "stationId" | "createdAt">>(blank);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await reportsApi.templates.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load templates"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof blank, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm(blank); setModal({ mode: "add" }); };
  const openView = (t: ApiReportTemplate) => { setForm({ name: t.name, module: t.module, frequency: t.frequency, sections: t.sections, status: t.status, lastUsed: t.lastUsed ?? "" }); setModal({ mode: "view", item: t }); };
  const openEdit = (t: ApiReportTemplate) => { setForm({ name: t.name, module: t.module, frequency: t.frequency, sections: t.sections, status: t.status, lastUsed: t.lastUsed ?? "" }); setModal({ mode: "edit", item: t }); };

  const handleDelete = async (t: ApiReportTemplate) => {
    try { await reportsApi.templates.delete(t.id); toast.success("Template deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Template name is required");
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await reportsApi.templates.create(form, stationId);
        toast.success("Template created");
      } else if (modal?.mode === "edit" && modal.item) {
        await reportsApi.templates.update(modal.item.id, form);
        toast.success("Template updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const columns: Column<ApiReportTemplate>[] = [
    { key: "name",      label: "Template Name", sortable: true },
    { key: "module",    label: "Module" },
    { key: "frequency", label: "Frequency" },
    { key: "sections",  label: "Sections", render: t => <span className="text-xs text-muted-foreground truncate max-w-[160px] block">{t.sections || "—"}</span> },
    { key: "lastUsed",  label: "Last Used", render: t => t.lastUsed || "—", sortable: true },
    { key: "status",    label: "Status", render: t => <StatusBadge status={t.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "frequency", label: "Frequency", options: [{ label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }] },
    { key: "module",    label: "Module",    options: MODULES.map(m => ({ label: m, value: m })) },
    { key: "status",    label: "Status",    options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Report Templates</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> New Template</Button>
        </div>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "module", "sections"]} searchPlaceholder="Search templates..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "Template Details" : modal.mode === "add" ? "New Template" : "Edit Template"} onSubmit={handleSave} isView={isView} submitLabel={saving ? "Saving…" : modal.mode === "edit" ? "Update" : "Create"}>
          <div className="space-y-3">
            <div><Label>Template Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} readOnly={isView} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Module</Label>
                <Select value={form.module} onValueChange={v => set("module", v)} disabled={isView}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => set("frequency", v)} disabled={isView}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Sections (comma-separated)</Label><Textarea value={form.sections} onChange={e => set("sections", e.target.value)} readOnly={isView} placeholder="Revenue, Transactions, Payment Methods" /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)} disabled={isView}>
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
