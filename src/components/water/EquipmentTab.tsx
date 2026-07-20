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
import { waterApi, ApiWaterEquipment } from "@/lib/waterApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";

const TYPES = ["Reverse Osmosis", "UV Treatment", "Storage", "Pump", "Filter", "Other"];
const STATUSES = ["operational", "maintenance", "inactive"];

const emptyForm = {
  name: "", type: "Reverse Osmosis", serialNo: "", status: "operational",
  lastMaintenance: "", nextMaintenance: "", location: "",
};

export function EquipmentTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("water.equipment.manage");

  const [records, setRecords]   = useState<ApiWaterEquipment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiWaterEquipment | null>(null);
  const [viewing, setViewing]   = useState<ApiWaterEquipment | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const pendingDeleteIds = usePendingDeleteIds("WaterEquipment", stationId, records.length);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await waterApi.equipment.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load equipment"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (eq: ApiWaterEquipment) => {
    setEditing(eq);
    setForm({
      name: eq.name, type: eq.type, serialNo: eq.serialNo ?? "", status: eq.status,
      lastMaintenance: eq.lastMaintenance?.split("T")[0] ?? "",
      nextMaintenance: eq.nextMaintenance?.split("T")[0] ?? "",
      location: eq.location ?? "",
    });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return toast.error("Equipment name is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        serialNo: form.serialNo || undefined,
        lastMaintenance: form.lastMaintenance || undefined,
        nextMaintenance: form.nextMaintenance || undefined,
        location: form.location || undefined,
      };
      if (editing) {
        await waterApi.equipment.update(editing.id, payload, stationId);
        toast.success("Equipment updated");
      } else {
        await waterApi.equipment.create(payload, stationId);
        toast.success("Equipment added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save equipment"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (eq: ApiWaterEquipment) => {
    try {
      await waterApi.equipment.delete(eq.id, stationId);
      toast.success("Equipment removed");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    operational: records.filter(r => r.status === "operational").length,
    maintenance: records.filter(r => r.status === "maintenance").length,
    inactive:    records.filter(r => r.status === "inactive").length,
  };

  const columns: Column<ApiWaterEquipment>[] = [
    { key: "name",            label: "Name",            sortable: true },
    { key: "type",            label: "Type",            sortable: true },
    { key: "serialNo",        label: "Serial No.",      render: eq => eq.serialNo || "—" },
    { key: "status",          label: "Status",          render: eq => <StatusBadge status={eq.status} /> },
    { key: "lastMaintenance", label: "Last Maint.",     render: eq => eq.lastMaintenance?.split("T")[0] ?? "—", sortable: true },
    { key: "nextMaintenance", label: "Next Maint.",     render: eq => eq.nextMaintenance?.split("T")[0] ?? "—", sortable: true },
    { key: "location",        label: "Location",        render: eq => eq.location || "—" },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: STATUSES.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })) },
    { key: "type",   label: "Type",   options: TYPES.map(t => ({ label: t, value: t })) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Operational", value: stats.operational, color: "text-green-600" },
          { label: "Maintenance", value: stats.maintenance, color: "text-amber-600" },
          { label: "Inactive",    value: stats.inactive,    color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Water treatment and production equipment registry</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Equipment</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name", "serialNo", "type", "location"]}
        searchPlaceholder="Search equipment..."
        filters={filters}
        onView={eq => setViewing(eq)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Equipment" : "Add Equipment"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Type</Label>
            <Select value={form.type} onValueChange={v => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Serial No.</Label><Input value={form.serialNo} onChange={e => set("serialNo", e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Plant Room A" /></div>
          <div><Label>Last Maintenance</Label><Input type="date" value={form.lastMaintenance} onChange={e => set("lastMaintenance", e.target.value)} /></div>
          <div><Label>Next Maintenance</Label><Input type="date" value={form.nextMaintenance} onChange={e => set("nextMaintenance", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Equipment Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing.type}</div>
            <div><span className="text-muted-foreground">Serial No.:</span> {viewing.serialNo || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Last Maint.:</span> {viewing.lastMaintenance?.split("T")[0] ?? "—"}</div>
            <div><span className="text-muted-foreground">Next Maint.:</span> {viewing.nextMaintenance?.split("T")[0] ?? "—"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Location:</span> {viewing.location || "—"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
