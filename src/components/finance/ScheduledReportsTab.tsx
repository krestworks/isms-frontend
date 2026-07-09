import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { reportsApi, ApiScheduledReport } from "@/lib/reportsApi";

type FormMode = "add" | "edit" | "view";

const reportTypes = ["Revenue Summary","Expense Report","P&L Statement","Inventory Report","Sales Report","Reconciliation"];
const frequencies = ["Daily","Weekly","Bi-Weekly","Monthly","Quarterly"];

const blank: Omit<ApiScheduledReport, "id" | "stationId"> = {
  name: "", type: "Revenue Summary", frequency: "Daily",
  modules: "All", recipients: "", lastRun: "", nextRun: "", status: "active",
};

export function ScheduledReportsTab() {
  const { stationId } = useActiveStation();
  const [data,   setData]   = useState<ApiScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]  = useState<{ mode: FormMode; item?: ApiScheduledReport } | null>(null);
  const [form,    setForm]   = useState<Omit<ApiScheduledReport, "id" | "stationId">>(blank);
  const [saving,  setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await reportsApi.scheduled.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load scheduled reports"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof blank, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAdd  = () => { setForm(blank); setModal({ mode: "add" }); };
  const openEdit = (item: ApiScheduledReport) => { setForm({ name: item.name, type: item.type, frequency: item.frequency, modules: item.modules, recipients: item.recipients, lastRun: item.lastRun ?? "", nextRun: item.nextRun ?? "", status: item.status }); setModal({ mode: "edit", item }); };
  const openView = (item: ApiScheduledReport) => { setForm({ name: item.name, type: item.type, frequency: item.frequency, modules: item.modules, recipients: item.recipients, lastRun: item.lastRun ?? "", nextRun: item.nextRun ?? "", status: item.status }); setModal({ mode: "view", item }); };

  const [pendingDelete, setPendingDelete] = useState<ApiScheduledReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (item: ApiScheduledReport) => setPendingDelete(item);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await reportsApi.scheduled.delete(pendingDelete.id);
      toast.success("Deleted");
      setPendingDelete(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.type || !form.frequency || !form.recipients) return toast.error("Name, type, frequency and recipients are required");
    setSaving(true);
    try {
      if (modal?.mode === "add") {
        await reportsApi.scheduled.create(form, stationId);
        toast.success("Scheduled report created");
      } else if (modal?.mode === "edit" && modal.item) {
        await reportsApi.scheduled.update(modal.item.id, form);
        toast.success("Updated");
      }
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const columns: Column<ApiScheduledReport>[] = [
    { key: "name",       label: "Report Name", sortable: true },
    { key: "type",       label: "Type" },
    { key: "frequency",  label: "Frequency" },
    { key: "modules",    label: "Modules" },
    { key: "lastRun",    label: "Last Run",  render: r => r.lastRun || "—" },
    { key: "nextRun",    label: "Next Run",  render: r => r.nextRun || "TBD" },
    { key: "status",     label: "Status",    render: r => <StatusBadge status={r.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "frequency", label: "Frequency", options: frequencies.map(f => ({ label: f, value: f })) },
    { key: "status",    label: "Status",    options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Scheduled Reports</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Schedule Report</Button>
        </div>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "recipients"]} searchPlaceholder="Search reports..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />

      <DangerConfirmModal
        open={!!pendingDelete}
        title={`Delete scheduled report "${pendingDelete?.name}"?`}
        description="This scheduled report will be permanently deleted."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {modal && (
        <ModalForm open title={isView ? "Report Details" : modal.mode === "add" ? "Schedule Report" : "Edit Report"} onClose={() => setModal(null)} onSubmit={handleSubmit} isView={isView} submitLabel={saving ? "Saving…" : modal.mode === "edit" ? "Update" : "Create"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Report Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} readOnly={isView} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{reportTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => set("frequency", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{frequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Modules</Label><Input value={form.modules} onChange={e => set("modules", e.target.value)} readOnly={isView} placeholder="e.g. All, Fuel, LPG" /></div>
            <div><Label>Recipients</Label><Input value={form.recipients} onChange={e => set("recipients", e.target.value)} readOnly={isView} placeholder="email@example.com" /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            {isView && (
              <>
                <div><Label>Last Run</Label><Input value={form.lastRun || "—"} readOnly /></div>
                <div><Label>Next Run</Label><Input value={form.nextRun || "TBD"} readOnly /></div>
              </>
            )}
          </div>
        </ModalForm>
      )}
    </div>
  );
}
