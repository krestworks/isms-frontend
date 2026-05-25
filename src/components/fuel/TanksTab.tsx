import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fuelApi, ApiFuelTank } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const FUEL_TYPES    = ["Super", "Diesel", "Kerosene", "V-Power", "Jet A-1", "Heavy Fuel Oil"];
const TANK_STATUSES = ["operational", "low", "critical", "maintenance"];

const emptyForm = { name: "", fuelType: "Super", capacity: 20000, currentLevel: 0, status: "operational" };

export function TanksTab() {
  const { stationId, loading: stationLoading } = useActiveStation();
  const can = usePermissions();
  const canCreate = can("fuel.tanks.create");
  const canEdit   = can("fuel.tanks.edit");
  const canDip    = can("fuel.dips.record");

  const [tanks, setTanks]       = useState<ApiFuelTank[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiFuelTank | null>(null);
  const [viewing, setViewing]   = useState<ApiFuelTank | null>(null);
  const [dipTarget, setDipTarget] = useState<ApiFuelTank | null>(null);
  const [dipValue, setDipValue] = useState("");
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId && !stationLoading) { setLoading(false); return; }
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await fuelApi.tanks.list(stationId);
      setTanks(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load tanks");
    } finally {
      setLoading(false);
    }
  }, [stationId, stationLoading]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (t: ApiFuelTank) => {
    setEditing(t);
    setForm({ name: t.name, fuelType: t.fuelType, capacity: t.capacity, currentLevel: t.currentLevel, status: t.status });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Tank name is required");
    setSaving(true);
    try {
      if (editing) {
        await fuelApi.tanks.update(editing.id, form, stationId);
        toast.success("Tank updated");
      } else {
        await fuelApi.tanks.create(form, stationId);
        toast.success("Tank created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save tank"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (t: ApiFuelTank) => {
    try {
      await fuelApi.tanks.delete(t.id, stationId);
      toast.success("Tank deleted");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete tank"); }
  };

  const handleDip = async () => {
    if (!dipTarget || !dipValue) return toast.error("Enter a reading");
    const v = parseFloat(dipValue);
    if (isNaN(v) || v < 0) return toast.error("Invalid reading");
    try {
      await fuelApi.tanks.recordDip(dipTarget.id, v, stationId);
      toast.success("Dip reading recorded");
      setDipTarget(null);
      setDipValue("");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to record dip"); }
  };

  const pct = (t: ApiFuelTank) => Math.min(100, Math.round((t.currentLevel / t.capacity) * 100));

  const stats = {
    total:       tanks.length,
    operational: tanks.filter(t => t.status === "operational").length,
    low:         tanks.filter(t => t.status === "low").length,
    critical:    tanks.filter(t => t.status === "critical").length,
  };

  const columns: Column<ApiFuelTank>[] = [
    { key: "name",     label: "Tank",     sortable: true },
    { key: "fuelType", label: "Fuel",     sortable: true },
    { key: "currentLevel", label: "Level", render: t => (
      <div className="flex items-center gap-2 min-w-[140px]">
        <Progress value={pct(t)} className="h-2 flex-1" />
        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct(t)}%</span>
      </div>
    )},
    { key: "capacity", label: "Capacity (L)", render: t => t.capacity.toLocaleString() },
    { key: "lastDipReading", label: "Last Dip (L)", render: t => t.lastDipReading?.toLocaleString() ?? "—" },
    { key: "lastDeliveryDate", label: "Last Delivery", render: t => t.lastDeliveryDate ? t.lastDeliveryDate.split("T")[0] : "—", sortable: true },
    { key: "status", label: "Status", render: t => <StatusBadge status={t.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "fuelType", label: "Fuel Type", options: FUEL_TYPES.map(f => ({ label: f, value: f })) },
    { key: "status",   label: "Status",    options: TANK_STATUSES.map(s => ({ label: s[0].toUpperCase() + s.slice(1), value: s })) },
  ];

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Monitor tank levels, deliveries, and dip readings</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canCreate && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Tank</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tanks", value: stats.total },
          { label: "Operational", value: stats.operational, color: "text-green-600" },
          { label: "Low",         value: stats.low,         color: "text-amber-600" },
          { label: "Critical",    value: stats.critical,    color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={tanks}
        columns={columns}
        searchKeys={["name", "fuelType"]}
        searchPlaceholder="Search tanks..."
        filters={filters}
        onView={t => setViewing(t)}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        actions={canDip ? (t => (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDipTarget(t); setDipValue(""); }}>
            <Droplets className="h-3 w-3 mr-1" />Dip
          </Button>
        )) : undefined}
      />

      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Tank" : "Add Tank"}
        onSubmit={handleSave}
        submitLabel={saving ? "Saving..." : editing ? "Update" : "Create"}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Tank Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div>
            <Label>Fuel Type</Label>
            <Select value={form.fuelType} onValueChange={v => set("fuelType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TANK_STATUSES.map(s => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Capacity (L)</Label><Input type="number" value={form.capacity} onChange={e => set("capacity", +e.target.value)} /></div>
          <div><Label>Current Level (L)</Label><Input type="number" value={form.currentLevel} onChange={e => set("currentLevel", +e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Tank Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Fuel Type:</span> {viewing.fuelType}</div>
            <div><span className="text-muted-foreground">Capacity:</span> {viewing.capacity.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Current Level:</span> {viewing.currentLevel.toLocaleString()} L ({pct(viewing)}%)</div>
            <div><span className="text-muted-foreground">Last Dip:</span> {viewing.lastDipReading?.toLocaleString() ?? "—"} L</div>
            <div><span className="text-muted-foreground">Last Delivery:</span> {viewing.lastDeliveryDate?.split("T")[0] ?? "—"}</div>
            <div><span className="text-muted-foreground">Delivered:</span> {viewing.lastDeliveryAmount?.toLocaleString() ?? "—"} L</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>

      <ModalForm
        open={!!dipTarget}
        onClose={() => setDipTarget(null)}
        title={`Record Dip — ${dipTarget?.name}`}
        onSubmit={handleDip}
        submitLabel="Record"
      >
        {dipTarget && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Current level: <strong>{dipTarget.currentLevel.toLocaleString()} L</strong> / {dipTarget.capacity.toLocaleString()} L
            </p>
            <div>
              <Label>Dip Reading (L)</Label>
              <Input type="number" value={dipValue} onChange={e => setDipValue(e.target.value)} placeholder="Enter actual litres measured" />
            </div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
