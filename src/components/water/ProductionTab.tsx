import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { waterApi, ApiWaterProduction } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const SHIFTS = ["Morning", "Afternoon", "Night"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), shift: "Morning", litresProduced: 0, litresWasted: 0,
  operator: "", machineId: "", status: "active", notes: "",
};

export function ProductionTab() {
  const { stationId } = useActiveStation();
  const { user } = useSession();
  const can = usePermissions();
  const canLog = can("water.production.log");

  const [records, setRecords]   = useState<ApiWaterProduction[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("WaterProduction", stationId, records.length);
  const [visibleRecords, setVisibleRecords] = useState<ApiWaterProduction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiWaterProduction | null>(null);
  const [viewing, setViewing]   = useState<ApiWaterProduction | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await waterApi.production.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load production logs"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today(), operator: user.name || "" }); setModalOpen(true); };
  const openEdit = (p: ApiWaterProduction) => {
    setEditing(p);
    setForm({
      date: p.date.split("T")[0], shift: p.shift, litresProduced: p.litresProduced,
      litresWasted: p.litresWasted, operator: p.operator ?? "", machineId: p.machineId ?? "",
      status: p.status, notes: p.notes ?? "",
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const netOutput = form.litresProduced - form.litresWasted;

  const handleSave = async () => {
    if (!form.date) return toast.error("Date is required");
    setSaving(true);
    try {
      const payload = { ...form, netOutput };
      if (editing) {
        await waterApi.production.update(editing.id, payload, stationId);
        toast.success("Production log updated");
      } else {
        await waterApi.production.create(payload, stationId);
        toast.success("Production logged");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: ApiWaterProduction) => {
    try {
      await waterApi.production.delete(p.id, stationId);
      toast.success("Log deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const totals = {
    produced: records.reduce((s, r) => s + r.litresProduced, 0),
    wasted:   records.reduce((s, r) => s + r.litresWasted, 0),
    net:      records.reduce((s, r) => s + r.netOutput, 0),
  };

  const columns: Column<ApiWaterProduction>[] = [
    { key: "date",          label: "Date",          render: p => p.date.split("T")[0], sortable: true },
    { key: "shift",         label: "Shift",          sortable: true },
    { key: "litresProduced",label: "Produced (L)",   render: p => p.litresProduced.toLocaleString(), sortable: true },
    { key: "litresWasted",  label: "Wasted (L)",     render: p => p.litresWasted.toLocaleString() },
    { key: "netOutput",     label: "Net Output (L)", render: p => <span className="font-mono font-medium">{p.netOutput.toLocaleString()}</span>, sortable: true },
    { key: "operator",      label: "Operator",       render: p => p.operator || "—" },
    { key: "machineId",     label: "Machine",        render: p => p.machineId || "—" },
    { key: "status",        label: "Status",         render: p => <StatusBadge status={p.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "shift",  label: "Shift",  options: SHIFTS.map(s => ({ label: s, value: s })) },
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Completed", value: "completed" }] },
  ];

  const exportColumns: ExportColumn<ApiWaterProduction>[] = [
    { label: "Date",          value: p => p.date.split("T")[0] },
    { label: "Shift",         value: p => p.shift },
    { label: "Produced (L)",  value: p => p.litresProduced },
    { label: "Wasted (L)",    value: p => p.litresWasted },
    { label: "Net Output (L)",value: p => p.netOutput },
    { label: "Operator",      value: p => p.operator || "—" },
    { label: "Machine",       value: p => p.machineId || "—" },
    { label: "Status",        value: p => p.status },
    { label: "Notes",         value: p => p.notes || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Produced (L)", value: totals.produced.toLocaleString(), color: "text-primary" },
          { label: "Wasted (L)",   value: totals.wasted.toLocaleString(),   color: "text-amber-600" },
          { label: "Net Output (L)",value: totals.net.toLocaleString(),     color: "text-green-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Shift-based water production logs</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`water-production${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Water Production"
            rows={visibleRecords}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canLog && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Record Production</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["operator", "machineId"]}
        searchPlaceholder="Search logs..."
        filters={filters}
        onView={p => setViewing(p)}
        onEdit={canLog ? openEdit : undefined}
        onDelete={canLog ? handleDelete : undefined}
        onFilteredChange={setVisibleRecords}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Production Log" : "Record Production"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Record"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Shift</Label>
            <Select value={form.shift} onValueChange={v => set("shift", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Litres Produced</Label><Input type="number" value={form.litresProduced || ""} onChange={e => set("litresProduced", +e.target.value)} /></div>
          <div><Label>Litres Wasted</Label><Input type="number" value={form.litresWasted || ""} onChange={e => set("litresWasted", +e.target.value)} /></div>
          <div><Label>Net Output (L)</Label><Input value={netOutput.toLocaleString()} disabled className="font-mono" /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Operator</Label><Input value={form.operator} onChange={e => set("operator", e.target.value)} /></div>
          <div><Label>Machine ID</Label><Input value={form.machineId} onChange={e => set("machineId", e.target.value)} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Production Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Shift:</span> {viewing.shift}</div>
            <div><span className="text-muted-foreground">Produced:</span> {viewing.litresProduced.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Wasted:</span> {viewing.litresWasted.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Net Output:</span> <strong>{viewing.netOutput.toLocaleString()} L</strong></div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Operator:</span> {viewing.operator || "—"}</div>
            <div><span className="text-muted-foreground">Machine:</span> {viewing.machineId || "—"}</div>
            {viewing.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
