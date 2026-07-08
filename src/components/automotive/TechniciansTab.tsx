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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { autoApi, ApiAutoTechnician } from "@/lib/autoApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const SPECIALIZATIONS = ["Engine & Transmission", "Brakes & Suspension", "Electrical & Diagnostics", "Body & Paint", "Tyres & Alignment", "General"];

const emptyForm = {
  name: "", phone: "", specialization: "General", experience: "", certifications: "",
  dailyRate: 0, jobsCompleted: 0, rating: 0, status: "active",
};

export function TechniciansTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("auto.technicians.manage");

  const [records, setRecords]   = useState<ApiAutoTechnician[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiAutoTechnician | null>(null);
  const [viewing, setViewing]   = useState<ApiAutoTechnician | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await autoApi.technicians.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load technicians"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (t: ApiAutoTechnician) => {
    setEditing(t);
    setForm({
      name: t.name, phone: t.phone ?? "", specialization: t.specialization ?? "General",
      experience: t.experience ?? "", certifications: t.certifications ?? "",
      dailyRate: t.dailyRate, jobsCompleted: t.jobsCompleted, rating: t.rating, status: t.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Technician name is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        phone: form.phone || undefined,
        experience: form.experience || undefined,
        certifications: form.certifications || undefined,
      };
      if (editing) {
        await autoApi.technicians.update(editing.id, payload, stationId);
        toast.success("Technician updated");
      } else {
        await autoApi.technicians.create(payload, stationId);
        toast.success("Technician added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save technician"); }
    finally { setSaving(false); }
  };

  const [pendingDelete, setPendingDelete] = useState<ApiAutoTechnician | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (t: ApiAutoTechnician) => setPendingDelete(t);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await autoApi.technicians.delete(pendingDelete.id, stationId);
      toast.success("Technician removed");
      setPendingDelete(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  const stats = {
    active:  records.filter(r => r.status === "active").length,
    onLeave: records.filter(r => r.status === "on-leave").length,
    inactive:records.filter(r => r.status === "inactive").length,
  };

  const columns: Column<ApiAutoTechnician>[] = [
    { key: "name",           label: "Name",           sortable: true },
    { key: "phone",          label: "Phone",           render: t => t.phone || "—" },
    { key: "specialization", label: "Specialization",  render: t => t.specialization || "—" },
    { key: "experience",     label: "Experience",      render: t => t.experience || "—" },
    { key: "dailyRate",      label: "Daily Rate",      render: t => `Ksh ${t.dailyRate.toLocaleString()}` },
    { key: "jobsCompleted",  label: "Jobs",            sortable: true },
    { key: "rating",         label: "Rating",          render: t => `${t.rating}/5`, sortable: true },
    { key: "status",         label: "Status",          render: t => <StatusBadge status={t.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status",         label: "Status",         options: [{ label: "Active", value: "active" }, { label: "On Leave", value: "on-leave" }, { label: "Inactive", value: "inactive" }] },
    { key: "specialization", label: "Specialization", options: SPECIALIZATIONS.map(s => ({ label: s, value: s })) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active",   value: stats.active,   color: "text-green-600" },
          { label: "On Leave", value: stats.onLeave,  color: "text-amber-600" },
          { label: "Inactive", value: stats.inactive, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Workshop technician profiles and performance</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Technician</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name", "phone", "specialization"]}
        searchPlaceholder="Search technicians..."
        filters={filters}
        onView={t => setViewing(t)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <DangerConfirmModal
        open={!!pendingDelete}
        title={`Remove technician "${pendingDelete?.name}"?`}
        description="This technician profile will be permanently removed."
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Technician" : "Add Technician"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Specialization</Label>
            <Select value={form.specialization} onValueChange={v => set("specialization", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Experience</Label><Input value={form.experience} onChange={e => set("experience", e.target.value)} placeholder="e.g. 5 years" /></div>
          <div><Label>Certifications</Label><Input value={form.certifications} onChange={e => set("certifications", e.target.value)} /></div>
          <div><Label>Daily Rate (Ksh)</Label><Input type="number" value={form.dailyRate || ""} onChange={e => set("dailyRate", +e.target.value)} /></div>
          <div><Label>Jobs Completed</Label><Input type="number" value={form.jobsCompleted} onChange={e => set("jobsCompleted", +e.target.value)} /></div>
          <div><Label>Rating (0-5)</Label><Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => set("rating", +e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on-leave">On Leave</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Technician Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.phone || "—"}</div>
            <div><span className="text-muted-foreground">Specialization:</span> {viewing.specialization || "—"}</div>
            <div><span className="text-muted-foreground">Experience:</span> {viewing.experience || "—"}</div>
            <div><span className="text-muted-foreground">Certifications:</span> {viewing.certifications || "—"}</div>
            <div><span className="text-muted-foreground">Daily Rate:</span> Ksh {viewing.dailyRate.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Jobs Done:</span> {viewing.jobsCompleted}</div>
            <div><span className="text-muted-foreground">Rating:</span> {viewing.rating}/5</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
