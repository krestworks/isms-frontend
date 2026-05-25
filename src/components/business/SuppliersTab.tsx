import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizSupplier } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";

interface Props { business: ApiBizBusiness; }

const emptyForm = { name: "", phone: "", email: "", address: "", contactPerson: "", status: "active" };

export function SuppliersTab({ business }: Props) {
  const can = usePermissions();
  const canManage = can("business.suppliers.manage");

  const [records,   setRecords]   = useState<ApiBizSupplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<ApiBizSupplier | null>(null);
  const [viewing,   setViewing]   = useState<ApiBizSupplier | null>(null);
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bizApi.suppliers.list(business.id);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load suppliers"); }
    finally { setLoading(false); }
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew  = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s: ApiBizSupplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", contactPerson: s.contactPerson ?? "", status: s.status });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Supplier name is required");
    setSaving(true);
    try {
      const payload = { ...form, businessId: business.id };
      if (editing) { await bizApi.suppliers.update(editing.id, payload); toast.success("Supplier updated"); }
      else         { await bizApi.suppliers.create(payload);             toast.success("Supplier added"); }
      setModalOpen(false); load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s: ApiBizSupplier) => {
    try { await bizApi.suppliers.delete(s.id); toast.success("Supplier deleted"); load(); }
    catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const columns: Column<ApiBizSupplier>[] = [
    { key: "name",          label: "Name",          sortable: true },
    { key: "contactPerson", label: "Contact",        render: s => s.contactPerson || "—" },
    { key: "phone",         label: "Phone",          render: s => s.phone || "—" },
    { key: "email",         label: "Email",          render: s => s.email || "—" },
    { key: "status",        label: "Status",         render: s => <StatusBadge status={s.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Supplier directory for {business.name}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Supplier</Button>
        </div>
      </div>

      <DataTable data={records} columns={columns} filters={filters}
        searchKeys={["name","phone","email"]} searchPlaceholder="Search suppliers..."
        onView={s => setViewing(s)}
        onEdit={openEdit}
        onDelete={canManage ? handleDelete : undefined}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Supplier" : "Add Supplier"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Supplier Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Supplier Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Contact:</span> {viewing.contactPerson || "—"}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.phone || "—"}</div>
            <div><span className="text-muted-foreground">Email:</span> {viewing.email || "—"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {viewing.address || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
