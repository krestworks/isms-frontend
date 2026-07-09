import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { toast } from "sonner";
import { carwashApi, ApiCarwashPackage } from "@/lib/carwashApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const emptyForm = {
  name: "", description: "", duration: 30, price: 0, vehicleTypes: "All", status: "active",
};

export function WashPackagesTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("carwash.packages.manage");

  const [records, setRecords]   = useState<ApiCarwashPackage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiCarwashPackage | null>(null);
  const [viewing, setViewing]   = useState<ApiCarwashPackage | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await carwashApi.packages.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load packages"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: ApiCarwashPackage) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? "", duration: p.duration,
      price: p.price, vehicleTypes: p.vehicleTypes, status: p.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Package name is required");
    setSaving(true);
    try {
      const payload = { ...form, description: form.description || undefined };
      if (editing) {
        await carwashApi.packages.update(editing.id, payload, stationId);
        toast.success("Package updated");
      } else {
        await carwashApi.packages.create(payload, stationId);
        toast.success("Package added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save package"); }
    finally { setSaving(false); }
  };

  const [pendingDelete, setPendingDelete] = useState<ApiCarwashPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (p: ApiCarwashPackage) => setPendingDelete(p);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await carwashApi.packages.delete(pendingDelete.id, stationId);
      toast.success("Package deleted");
      setPendingDelete(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  const columns: Column<ApiCarwashPackage>[] = [
    { key: "name",         label: "Package Name",   sortable: true },
    { key: "description",  label: "Description",     render: p => p.description || "—" },
    { key: "duration",     label: "Duration (min)",  sortable: true },
    { key: "price",        label: "Price (Ksh)",     render: p => <span className="font-bold">Ksh {p.price.toLocaleString()}</span>, sortable: true },
    { key: "vehicleTypes", label: "Vehicle Types" },
    { key: "status",       label: "Status",          render: p => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Available wash packages and pricing</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Package</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name"]}
        searchPlaceholder="Search packages..."
        onView={p => setViewing(p)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <DangerConfirmModal
        open={!!pendingDelete}
        title={`Delete package "${pendingDelete?.name}"?`}
        description="This wash package will be permanently deleted."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Package" : "Add Package"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="space-y-3">
          <div><Label>Package Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Duration (min)</Label><Input type="number" value={form.duration || ""} onChange={e => set("duration", +e.target.value)} /></div>
            <div><Label>Price (Ksh)</Label><Input type="number" value={form.price || ""} onChange={e => set("price", +e.target.value)} /></div>
          </div>
          <div><Label>Vehicle Types</Label><Input value={form.vehicleTypes} onChange={e => set("vehicleTypes", e.target.value)} placeholder="All, Sedan, SUV..." /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Package Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Duration:</span> {viewing.duration} min</div>
            <div><span className="text-muted-foreground">Price:</span> <strong>Ksh {viewing.price.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Vehicle Types:</span> {viewing.vehicleTypes}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            {viewing.description && <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {viewing.description}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}

export default WashPackagesTab;
