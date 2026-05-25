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
import { waterApi, ApiWaterDistribution } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), vehicle: "", driver: "", destination: "", litresLoaded: 0,
  litresDelivered: 0, client: "", status: "active", departureTime: "", arrivalTime: "",
};

export function DistributionTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canDeliver = can("water.distributions.deliver");

  const [records, setRecords]   = useState<ApiWaterDistribution[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiWaterDistribution | null>(null);
  const [viewing, setViewing]   = useState<ApiWaterDistribution | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await waterApi.distribution.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load distribution logs"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: today() }); setModalOpen(true); };
  const openEdit = (d: ApiWaterDistribution) => {
    setEditing(d);
    setForm({
      date: d.date.split("T")[0], vehicle: d.vehicle ?? "", driver: d.driver ?? "",
      destination: d.destination ?? "", litresLoaded: d.litresLoaded,
      litresDelivered: d.litresDelivered, client: d.client ?? "", status: d.status,
      departureTime: d.departureTime ?? "", arrivalTime: d.arrivalTime ?? "",
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const variance = form.litresDelivered - form.litresLoaded;

  const handleSave = async () => {
    if (!form.date) return toast.error("Date is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        variance,
        vehicle: form.vehicle || undefined,
        driver: form.driver || undefined,
        destination: form.destination || undefined,
        client: form.client || undefined,
        departureTime: form.departureTime || undefined,
        arrivalTime: form.arrivalTime || undefined,
      };
      if (editing) {
        await waterApi.distribution.update(editing.id, payload, stationId);
        toast.success("Delivery log updated");
      } else {
        await waterApi.distribution.create(payload, stationId);
        toast.success("Delivery logged");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (d: ApiWaterDistribution) => {
    try {
      await waterApi.distribution.delete(d.id, stationId);
      toast.success("Log deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    active:    records.filter(r => r.status === "active").length,
    completed: records.filter(r => r.status === "completed").length,
    totalLitres: records.filter(r => r.status === "completed").reduce((s, r) => s + r.litresDelivered, 0),
  };

  const columns: Column<ApiWaterDistribution>[] = [
    { key: "date",           label: "Date",           render: d => d.date.split("T")[0], sortable: true },
    { key: "vehicle",        label: "Vehicle",         render: d => d.vehicle || "—" },
    { key: "driver",         label: "Driver",          render: d => d.driver || "—" },
    { key: "client",         label: "Client",          render: d => d.client || "—" },
    { key: "destination",    label: "Destination",     render: d => d.destination || "—" },
    { key: "litresLoaded",   label: "Loaded (L)",      render: d => d.litresLoaded.toLocaleString(), sortable: true },
    { key: "litresDelivered",label: "Delivered (L)",   render: d => d.litresDelivered.toLocaleString(), sortable: true },
    { key: "variance",       label: "Variance",        render: d => <span className={d.variance < 0 ? "text-destructive font-medium" : ""}>{d.variance >= 0 ? "+" : ""}{d.variance}</span> },
    { key: "status",         label: "Status",          render: d => <StatusBadge status={d.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "In Transit", value: "active" }, { label: "Completed", value: "completed" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.active}</p>
          <p className="text-xs text-muted-foreground">In Transit</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.totalLitres.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Litres Delivered</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Vehicle and driver delivery logs with variance tracking</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canDeliver && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Log Delivery</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["vehicle", "driver", "client", "destination"]}
        searchPlaceholder="Search deliveries..."
        filters={filters}
        onView={d => setViewing(d)}
        onEdit={canDeliver ? openEdit : undefined}
        onDelete={canDeliver ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Delivery Log" : "Log Delivery"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Log"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div><Label>Vehicle</Label><Input value={form.vehicle} onChange={e => set("vehicle", e.target.value)} placeholder="KBZ 123A" /></div>
          <div><Label>Driver</Label><Input value={form.driver} onChange={e => set("driver", e.target.value)} /></div>
          <div><Label>Client</Label><Input value={form.client} onChange={e => set("client", e.target.value)} /></div>
          <div className="col-span-2"><Label>Destination</Label><Input value={form.destination} onChange={e => set("destination", e.target.value)} /></div>
          <div><Label>Litres Loaded</Label><Input type="number" value={form.litresLoaded || ""} onChange={e => set("litresLoaded", +e.target.value)} /></div>
          <div><Label>Litres Delivered</Label><Input type="number" value={form.litresDelivered || ""} onChange={e => set("litresDelivered", +e.target.value)} /></div>
          <div><Label>Variance (L)</Label><Input value={`${variance >= 0 ? "+" : ""}${variance}`} disabled className={`font-mono ${variance < 0 ? "text-destructive" : ""}`} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">In Transit</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Departure Time</Label><Input type="time" value={form.departureTime} onChange={e => set("departureTime", e.target.value)} /></div>
          <div><Label>Arrival Time</Label><Input type="time" value={form.arrivalTime} onChange={e => set("arrivalTime", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Delivery Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Vehicle:</span> {viewing.vehicle || "—"}</div>
            <div><span className="text-muted-foreground">Driver:</span> {viewing.driver || "—"}</div>
            <div><span className="text-muted-foreground">Client:</span> {viewing.client || "—"}</div>
            <div><span className="text-muted-foreground">Destination:</span> {viewing.destination || "—"}</div>
            <div><span className="text-muted-foreground">Loaded:</span> {viewing.litresLoaded.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Delivered:</span> {viewing.litresDelivered.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Variance:</span> <span className={viewing.variance < 0 ? "text-destructive font-medium" : ""}>{viewing.variance >= 0 ? "+" : ""}{viewing.variance} L</span></div>
            <div><span className="text-muted-foreground">Departure:</span> {viewing.departureTime || "—"}</div>
            {viewing.arrivalTime && <div><span className="text-muted-foreground">Arrival:</span> {viewing.arrivalTime}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
