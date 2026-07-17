import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission, guardAction } from "@/lib/actionPermissions";
import { inventoryApi, ApiSupplier } from "@/lib/inventoryApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePendingDeleteIds } from "@/lib/usePendingDeleteIds";

const CATEGORIES = ["general", "fuel", "lpg", "water", "auto_parts", "pharmacy", "food_bev"];
const CAT_LABELS: Record<string, string> = {
  general: "General", fuel: "Fuel", lpg: "LPG", water: "Water",
  auto_parts: "Auto Parts", pharmacy: "Pharmacy", food_bev: "Food & Bev",
};
const TERMS = ["Net 7", "Net 14", "Net 30", "Net 60", "COD", "Prepaid"];

const emptyForm = {
  name: "", contactName: "", phone: "", email: "", address: "",
  category: "general", taxPin: "", paymentTerms: "Net 30",
  bankDetails: "", notes: "", status: "active",
};

export default function SuppliersTab() {
  const { stationId } = useActiveStation();
  const [data, setData]         = useState<ApiSupplier[]>([]);
  const pendingDeleteIds = usePendingDeleteIds("Supplier", stationId, data.length);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modalOpen, setModal]   = useState(false);
  const [editing, setEditing]   = useState<ApiSupplier | null>(null);
  const [form, setForm]         = useState<typeof emptyForm>(emptyForm);

  const canCreate = usePermission("inventory.supplier.create");
  const canUpdate = usePermission("inventory.supplier.update");
  const canDelete = usePermission("inventory.supplier.delete");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.suppliers.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load suppliers"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (s: ApiSupplier) => {
    setEditing(s);
    setForm({
      name: s.name, contactName: s.contactName ?? "", phone: s.phone ?? "",
      email: s.email ?? "", address: s.address ?? "", category: s.category ?? "general",
      taxPin: s.taxPin ?? "", paymentTerms: s.paymentTerms ?? "Net 30",
      bankDetails: s.bankDetails ?? "", notes: s.notes ?? "", status: s.status,
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Supplier name is required"); return; }
    if (editing && !guardAction("inventory.supplier.update", "edit a supplier")) return;
    if (!editing && !guardAction("inventory.supplier.create", "add a supplier")) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await inventoryApi.suppliers.update(editing.id, form);
        setData(d => d.map(x => x.id === editing.id ? res.data : x));
        toast.success("Supplier updated");
      } else {
        const res = await inventoryApi.suppliers.create(form, stationId);
        setData(d => [...d, res.data]);
        toast.success("Supplier added");
      }
      setModal(false);
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (s: ApiSupplier) => {
    if (!guardAction("inventory.supplier.delete", "delete a supplier")) return;
    try {
      await inventoryApi.suppliers.delete(s.id);
      setData(d => d.filter(x => x.id !== s.id));
      toast.success("Supplier deleted");
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const columns: Column<ApiSupplier>[] = [
    { key: "name", label: "Supplier" },
    { key: "contactName", label: "Contact", render: s => s.contactName ?? "—" },
    { key: "phone", label: "Phone", render: s => s.phone ?? "—" },
    { key: "category", label: "Category", render: s => CAT_LABELS[s.category ?? "general"] ?? s.category ?? "—" },
    { key: "paymentTerms", label: "Terms", render: s => s.paymentTerms ?? "—" },
    { key: "status", label: "Status", render: s => <StatusBadge status={s.status} /> },
  ];

  const active   = data.filter(s => s.status === "active").length;
  const inactive = data.length - active;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Suppliers</h3>
          <p className="text-sm text-muted-foreground">Vendors supplying goods to this business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
          {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: data.length },
          { label: "Active",   value: active,   color: "text-green-600" },
          { label: "Inactive", value: inactive, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color ?? ""}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={data} columns={columns} loading={loading}
        searchKeys={["name", "contactName", "phone"]} searchPlaceholder="Search suppliers..."
        onEdit={canUpdate ? openEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        pendingDeleteIds={pendingDeleteIds}
      />

      <ModalForm open={modalOpen} onClose={() => setModal(false)}
        title={editing ? "Edit Supplier" : "Add Supplier"}
        onSubmit={handleSave} submitLabel={saving ? "Saving…" : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Supplier Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Contact Person</Label><Input value={form.contactName} onChange={e => set("contactName", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div><Label>Tax PIN</Label><Input value={form.taxPin} onChange={e => set("taxPin", e.target.value)} /></div>
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CAT_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Payment Terms</Label>
            <Select value={form.paymentTerms} onValueChange={v => set("paymentTerms", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
          <div className="col-span-2"><Label>Bank Details</Label><Textarea rows={2} value={form.bankDetails} onChange={e => set("bankDetails", e.target.value)} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>
    </div>
  );
}
