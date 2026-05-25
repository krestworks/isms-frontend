import { useCallback, useEffect, useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { reportsApi, ApiGeneratedReport } from "@/lib/reportsApi";

type FormMode = "add" | "view";

const MODULES = ["All","Fuel","LPG","Water","Automotive","Car Wash"];
const FORMATS = ["PDF","Excel","CSV"];

const blank: Partial<ApiGeneratedReport> = { title: "", type: "daily", module: "All", period: "", format: "PDF" };

export function GeneratedReportsTab() {
  const { stationId } = useActiveStation();
  const [data,    setData]    = useState<ApiGeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ mode: FormMode; item?: ApiGeneratedReport } | null>(null);
  const [form,    setForm]    = useState<Partial<ApiGeneratedReport>>(blank);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await reportsApi.generated.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load reports"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof blank, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm(blank); setModal({ mode: "add" }); };
  const openView = (r: ApiGeneratedReport) => { setForm(r); setModal({ mode: "view", item: r }); };

  const handleDelete = async (r: ApiGeneratedReport) => {
    try { await reportsApi.generated.delete(r.id); toast.success("Report deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const handleSave = async () => {
    if (!form.title || !form.period) return toast.error("Title and period are required");
    setSaving(true);
    try {
      await reportsApi.generated.create(form, stationId);
      toast.success("Report generated");
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to generate report"); }
    finally { setSaving(false); }
  };

  const columns: Column<ApiGeneratedReport>[] = [
    { key: "title",       label: "Title",     sortable: true },
    { key: "type",        label: "Type" },
    { key: "module",      label: "Module" },
    { key: "period",      label: "Period" },
    { key: "format",      label: "Format" },
    { key: "generatedAt", label: "Generated", sortable: true },
    { key: "generatedBy", label: "By" },
    { key: "status",      label: "Status",    render: r => <StatusBadge status={r.status} /> },
    { key: "fileSize",    label: "Size",      render: r => r.fileSize || "—" },
  ];

  const filters: FilterOption[] = [
    { key: "type",   label: "Type",   options: [{ label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" }, { label: "Monthly", value: "monthly" }] },
    { key: "module", label: "Module", options: MODULES.map(m => ({ label: m, value: m })) },
    { key: "format", label: "Format", options: FORMATS.map(f => ({ label: f, value: f })) },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Generated Reports</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Generate Report</Button>
        </div>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["title", "module", "period"]} searchPlaceholder="Search reports..." filters={filters} onView={openView} onDelete={handleDelete} />

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "Report Details" : "Generate Report"} onSubmit={handleSave} submitLabel={saving ? "Generating…" : "Generate"} isView={isView}>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title ?? ""} onChange={e => set("title", e.target.value)} readOnly={isView} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type ?? "daily"} onValueChange={v => set("type", v)} disabled={isView}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Format</Label>
                <Select value={form.format ?? "PDF"} onValueChange={v => set("format", v)} disabled={isView}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Module</Label>
              <Select value={form.module ?? "All"} onValueChange={v => set("module", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Period (e.g. 2026-05-01 or May 2026)</Label><Input value={form.period ?? ""} onChange={e => set("period", e.target.value)} readOnly={isView} /></div>
            {isView && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Generated At</Label><Input value={modal.item?.generatedAt ?? "—"} readOnly /></div>
                  <div><Label>Generated By</Label><Input value={modal.item?.generatedBy ?? "—"} readOnly /></div>
                </div>
                <div><Label>File Size</Label><Input value={modal.item?.fileSize ?? "—"} readOnly /></div>
                <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-1" /> Download Report</Button>
              </>
            )}
          </div>
        </ModalForm>
      )}
    </div>
  );
}
