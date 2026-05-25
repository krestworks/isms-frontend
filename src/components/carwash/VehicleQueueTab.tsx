import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { carwashApi, ApiCarwashQueue } from "@/lib/carwashApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const PACKAGES = ["Basic Rinse", "Full Wash", "Premium Detail", "Interior Clean"];
const VEHICLE_TYPES = ["Sedan", "SUV", "Pickup", "Van", "Motorcycle", "Bus"];
const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), vehicleReg: "", vehicleType: "Sedan",
  washPackage: "Full Wash", assignedTo: "", amount: 0, status: "waiting",
};

export function VehicleQueueTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("carwash.queue.manage");

  const [records, setRecords]   = useState<ApiCarwashQueue[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiCarwashQueue | null>(null);
  const [viewing, setViewing]   = useState<ApiCarwashQueue | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await carwashApi.queue.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load queue"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (q: ApiCarwashQueue) => {
    setEditing(q);
    setForm({
      date: q.date.split("T")[0], vehicleReg: q.vehicleReg, vehicleType: q.vehicleType,
      washPackage: q.washPackage, assignedTo: q.assignedTo ?? "", amount: q.amount, status: q.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicleReg || !form.washPackage) return toast.error("Vehicle reg and package are required");
    setSaving(true);
    try {
      const payload = { ...form, assignedTo: form.assignedTo || undefined };
      if (editing) {
        await carwashApi.queue.update(editing.id, payload, stationId);
        toast.success("Queue entry updated");
      } else {
        await carwashApi.queue.create(payload, stationId);
        toast.success("Vehicle added to queue");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (q: ApiCarwashQueue) => {
    try {
      await carwashApi.queue.delete(q.id, stationId);
      toast.success("Removed from queue");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    waiting:    records.filter(r => r.status === "waiting").length,
    inProgress: records.filter(r => r.status === "in_progress").length,
    completed:  records.filter(r => r.status === "completed").length,
  };

  const columns: Column<ApiCarwashQueue>[] = [
    { key: "ticketNo",   label: "Ticket #",    render: q => <span className="font-mono text-xs">{q.ticketNo}</span>, sortable: true },
    { key: "date",       label: "Date",         render: q => q.date.split("T")[0], sortable: true },
    { key: "vehicleReg", label: "Vehicle Reg" },
    { key: "vehicleType",label: "Type" },
    { key: "washPackage",label: "Package" },
    { key: "assignedTo", label: "Assigned To",  render: q => q.assignedTo || "Unassigned" },
    { key: "amount",     label: "Amount (Ksh)", render: q => `Ksh ${q.amount.toLocaleString()}`, sortable: true },
    { key: "status",     label: "Status",       render: q => <StatusBadge status={q.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status",      label: "Status",  options: [{ label: "Waiting", value: "waiting" }, { label: "In Progress", value: "in_progress" }, { label: "Completed", value: "completed" }] },
    { key: "washPackage", label: "Package", options: PACKAGES.map(p => ({ label: p, value: p })) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.waiting}</p>
          <p className="text-xs text-muted-foreground">Waiting</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Live vehicle wash queue and progress tracking</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add to Queue</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["ticketNo", "vehicleReg", "assignedTo"]}
        searchPlaceholder="Search queue..."
        filters={filters}
        onView={q => setViewing(q)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Queue Entry" : "Add to Queue"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Vehicle Reg *</Label><Input value={form.vehicleReg} onChange={e => set("vehicleReg", e.target.value)} placeholder="KBZ 123A" /></div>
          <div><Label>Vehicle Type</Label>
            <Select value={form.vehicleType} onValueChange={v => set("vehicleType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Package *</Label>
            <Select value={form.washPackage} onValueChange={v => set("washPackage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PACKAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Assigned To</Label><Input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} /></div>
          <div><Label>Amount (Ksh)</Label><Input type="number" value={form.amount || ""} onChange={e => set("amount", +e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Queue Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Ticket #:</span> <span className="font-mono">{viewing.ticketNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Vehicle:</span> {viewing.vehicleReg}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing.vehicleType}</div>
            <div><span className="text-muted-foreground">Package:</span> {viewing.washPackage}</div>
            <div><span className="text-muted-foreground">Assigned To:</span> {viewing.assignedTo || "Unassigned"}</div>
            <div><span className="text-muted-foreground">Amount:</span> Ksh {viewing.amount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}

export default VehicleQueueTab;
