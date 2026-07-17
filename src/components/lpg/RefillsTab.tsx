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
import { toast } from "sonner";
import { lpgApi, ApiLpgRefill } from "@/lib/lpgApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const SIZES = ["6kg", "13kg", "22.5kg", "25kg", "50kg"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), cylinderSize: "13kg", quantity: 0, costPerUnit: 0,
  supplier: "", receivedBy: "", status: "pending", notes: "",
};

export function RefillsTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canRecord = can("lpg.refills.record");

  const [records, setRecords]   = useState<ApiLpgRefill[]>([]);
  const [visibleRecords, setVisibleRecords] = useState<ApiLpgRefill[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiLpgRefill | null>(null);
  const [viewing, setViewing]   = useState<ApiLpgRefill | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await lpgApi.refills.list({ from: fromDate || undefined, to: toDate || undefined }, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load refills"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (r: ApiLpgRefill) => {
    setEditing(r);
    setForm({
      date: r.date.split("T")[0], cylinderSize: r.cylinderSize, quantity: r.quantity,
      costPerUnit: r.costPerUnit, supplier: r.supplier, receivedBy: r.receivedBy ?? "",
      status: r.status, notes: r.notes ?? "",
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => {
    const next = { ...f, [k]: v };
    return next;
  });

  const handleSave = async () => {
    if (!form.supplier) return toast.error("Supplier is required");
    setSaving(true);
    try {
      if (editing) {
        await lpgApi.refills.update(editing.id, form, stationId);
        toast.success("Refill updated");
      } else {
        await lpgApi.refills.create(form, stationId);
        toast.success("Refill recorded");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save refill"); }
    finally { setSaving(false); }
  };

  const columns: Column<ApiLpgRefill>[] = [
    { key: "batchNo",     label: "Batch #",       sortable: true, render: r => <span className="font-mono text-xs">{r.batchNo}</span> },
    { key: "date",        label: "Date",           render: r => r.date.split("T")[0], sortable: true },
    { key: "cylinderSize",label: "Size",           sortable: true },
    { key: "quantity",    label: "Qty",            sortable: true },
    { key: "costPerUnit", label: "Cost/Unit (Ksh)",render: r => r.costPerUnit.toLocaleString() },
    { key: "totalCost",   label: "Total (Ksh)",    sortable: true, render: r => <span className="font-mono">Ksh {r.totalCost.toLocaleString()}</span> },
    { key: "supplier",    label: "Supplier" },
    { key: "receivedBy",  label: "Received By",    render: r => r.receivedBy || "—" },
    { key: "status",      label: "Status",         render: r => <StatusBadge status={r.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "cylinderSize", label: "Size",   options: SIZES.map(s => ({ label: s, value: s })) },
    { key: "status",       label: "Status", options: [{ label: "Completed", value: "completed" }, { label: "Pending", value: "pending" }] },
  ];

  const exportColumns: ExportColumn<ApiLpgRefill>[] = [
    { label: "Batch #",        value: r => r.batchNo },
    { label: "Date",           value: r => r.date.split("T")[0] },
    { label: "Size",           value: r => r.cylinderSize },
    { label: "Qty",            value: r => r.quantity },
    { label: "Cost/Unit (Ksh)",value: r => r.costPerUnit },
    { label: "Total (Ksh)",    value: r => r.totalCost },
    { label: "Supplier",       value: r => r.supplier },
    { label: "Received By",    value: r => r.receivedBy || "—" },
    { label: "Status",         value: r => r.status },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Track cylinder refills and deliveries from suppliers</p>
        <div className="flex gap-2">
          <ExportMenu
            filename={`lpg-refills${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="LPG Refills"
            rows={visibleRecords}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canRecord && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Record Refill</Button>}
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["batchNo", "supplier", "receivedBy"]}
        searchPlaceholder="Search refills..."
        filters={filters}
        onView={r => setViewing(r)}
        onEdit={canRecord ? openEdit : undefined}
        onFilteredChange={setVisibleRecords}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Refill" : "Record Refill"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Record"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Cylinder Size</Label>
            <Select value={form.cylinderSize} onValueChange={v => set("cylinderSize", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" value={form.quantity || ""} onChange={e => set("quantity", +e.target.value)} /></div>
          <div><Label>Cost/Unit (Ksh)</Label><Input type="number" step="0.01" value={form.costPerUnit || ""} onChange={e => set("costPerUnit", +e.target.value)} /></div>
          <div><Label>Supplier *</Label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} /></div>
          <div><Label>Received By</Label><Input value={form.receivedBy} onChange={e => set("receivedBy", e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Refill Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Batch #:</span> <span className="font-mono">{viewing.batchNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Size:</span> {viewing.cylinderSize}</div>
            <div><span className="text-muted-foreground">Qty:</span> {viewing.quantity}</div>
            <div><span className="text-muted-foreground">Cost/Unit:</span> Ksh {viewing.costPerUnit.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Total:</span> <strong>Ksh {viewing.totalCost.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Supplier:</span> {viewing.supplier}</div>
            <div><span className="text-muted-foreground">Received By:</span> {viewing.receivedBy || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            {viewing.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
