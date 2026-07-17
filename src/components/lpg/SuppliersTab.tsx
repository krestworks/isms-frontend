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
import { lpgApi, ApiLpgSupplier } from "@/lib/lpgApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";

const emptyForm = {
  name: "", contactPerson: "", phone: "", email: "", address: "",
  cylinderTypes: "", paymentTerms: "Net 30", status: "active",
};

export function SuppliersTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("lpg.suppliers.manage");

  const [records, setRecords]   = useState<ApiLpgSupplier[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("LpgSupplier", stationId, records.length);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiLpgSupplier | null>(null);
  const [viewing, setViewing]   = useState<ApiLpgSupplier | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await lpgApi.suppliers.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load suppliers"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s: ApiLpgSupplier) => {
    setEditing(s);
    setForm({ name: s.name, contactPerson: s.contactPerson ?? "", phone: s.phone ?? "",
      email: s.email ?? "", address: s.address ?? "", cylinderTypes: s.cylinderTypes ?? "",
      paymentTerms: s.paymentTerms, status: s.status });
    setModalOpen(true);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return toast.error("Company name is required");
    setSaving(true);
    try {
      if (editing) {
        await lpgApi.suppliers.update(editing.id, form, stationId);
        toast.success("Supplier updated");
      } else {
        await lpgApi.suppliers.create(form, stationId);
        toast.success("Supplier added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save supplier"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s: ApiLpgSupplier) => {
    try {
      await lpgApi.suppliers.delete(s.id, stationId);
      toast.success("Supplier removed");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const columns: Column<ApiLpgSupplier>[] = [
    { key: "name",          label: "Company",      sortable: true },
    { key: "contactPerson", label: "Contact",      render: s => s.contactPerson || "—" },
    { key: "phone",         label: "Phone",        render: s => s.phone || "—" },
    { key: "cylinderTypes", label: "Types",        render: s => s.cylinderTypes || "—" },
    { key: "paymentTerms",  label: "Terms" },
    { key: "rating",        label: "Rating",       sortable: true, render: s => s.rating > 0 ? `${s.rating.toFixed(1)} ★` : "—" },
    { key: "totalOrders",   label: "Orders",       sortable: true },
    { key: "lastOrderDate", label: "Last Order",   sortable: true, render: s => s.lastOrderDate?.split("T")[0] ?? "—" },
    { key: "status",        label: "Status",       render: s => <StatusBadge status={s.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage LPG cylinder suppliers</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Supplier</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name", "contactPerson", "phone"]}
        searchPlaceholder="Search suppliers..."
        filters={filters}
        onView={s => setViewing(s)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Supplier" : "Add Supplier"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Company Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div><Label>Payment Terms</Label>
            <Select value={form.paymentTerms} onValueChange={v => set("paymentTerms", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="COD">COD</SelectItem><SelectItem value="Net 7">Net 7</SelectItem><SelectItem value="Net 14">Net 14</SelectItem><SelectItem value="Net 30">Net 30</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
          <div><Label>Cylinder Types</Label><Input value={form.cylinderTypes} onChange={e => set("cylinderTypes", e.target.value)} placeholder="6kg, 13kg, 22.5kg" /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Supplier Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Company:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Contact:</span> {viewing.contactPerson || "—"}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.phone || "—"}</div>
            <div><span className="text-muted-foreground">Email:</span> {viewing.email || "—"}</div>
            <div><span className="text-muted-foreground">Terms:</span> {viewing.paymentTerms}</div>
            <div><span className="text-muted-foreground">Types:</span> {viewing.cylinderTypes || "—"}</div>
            <div><span className="text-muted-foreground">Orders:</span> {viewing.totalOrders}</div>
            {viewing.address && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {viewing.address}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
