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
import { carwashApi, ApiCarwashStaff } from "@/lib/carwashApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const emptyForm = {
  name: "", phone: "", role: "Washer", shift: "Morning", rating: 0, washesCompleted: 0, status: "on_duty",
};

export function CarwashStaffTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("carwash.staff.manage");

  const [records, setRecords]   = useState<ApiCarwashStaff[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiCarwashStaff | null>(null);
  const [viewing, setViewing]   = useState<ApiCarwashStaff | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await carwashApi.staff.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load staff"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s: ApiCarwashStaff) => {
    setEditing(s);
    setForm({
      name: s.name, phone: s.phone ?? "", role: s.role, shift: s.shift,
      rating: s.rating, washesCompleted: s.washesCompleted, status: s.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = { ...form, phone: form.phone || undefined };
      if (editing) {
        await carwashApi.staff.update(editing.id, payload, stationId);
        toast.success("Staff updated");
      } else {
        await carwashApi.staff.create(payload, stationId);
        toast.success("Staff added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save staff"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s: ApiCarwashStaff) => {
    try {
      await carwashApi.staff.delete(s.id, stationId);
      toast.success("Staff removed");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const stats = {
    onDuty:  records.filter(r => r.status === "on_duty").length,
    offDuty: records.filter(r => r.status === "off_duty").length,
    onLeave: records.filter(r => r.status === "on_leave").length,
  };

  const columns: Column<ApiCarwashStaff>[] = [
    { key: "name",           label: "Name",          sortable: true },
    { key: "phone",          label: "Phone",          render: s => s.phone || "—" },
    { key: "role",           label: "Role" },
    { key: "shift",          label: "Shift" },
    { key: "rating",         label: "Rating",         render: s => `${s.rating}/5`, sortable: true },
    { key: "washesCompleted",label: "Washes Done",    sortable: true },
    { key: "status",         label: "Status",         render: s => <StatusBadge status={s.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "On Duty", value: "on_duty" }, { label: "Off Duty", value: "off_duty" }, { label: "On Leave", value: "on_leave" }] },
    { key: "shift",  label: "Shift",  options: [{ label: "Morning", value: "Morning" }, { label: "Afternoon", value: "Afternoon" }, { label: "Full Day", value: "Full Day" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "On Duty",  value: stats.onDuty,  color: "text-green-600" },
          { label: "Off Duty", value: stats.offDuty, color: "text-muted-foreground" },
          { label: "On Leave", value: stats.onLeave, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Car wash staff and shift management</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Staff</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name", "phone"]}
        searchPlaceholder="Search staff..."
        filters={filters}
        onView={s => setViewing(s)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Staff" : "Add Staff"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Role</Label>
            <Select value={form.role} onValueChange={v => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Washer">Washer</SelectItem><SelectItem value="Supervisor">Supervisor</SelectItem><SelectItem value="Cashier">Cashier</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Shift</Label>
            <Select value={form.shift} onValueChange={v => set("shift", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Afternoon">Afternoon</SelectItem><SelectItem value="Full Day">Full Day</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Rating (0-5)</Label><Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => set("rating", +e.target.value)} /></div>
          <div><Label>Washes Completed</Label><Input type="number" value={form.washesCompleted} onChange={e => set("washesCompleted", +e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="on_duty">On Duty</SelectItem><SelectItem value="off_duty">Off Duty</SelectItem><SelectItem value="on_leave">On Leave</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Staff Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.phone || "—"}</div>
            <div><span className="text-muted-foreground">Role:</span> {viewing.role}</div>
            <div><span className="text-muted-foreground">Shift:</span> {viewing.shift}</div>
            <div><span className="text-muted-foreground">Rating:</span> {viewing.rating}/5</div>
            <div><span className="text-muted-foreground">Washes Done:</span> {viewing.washesCompleted}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}

export default CarwashStaffTab;
