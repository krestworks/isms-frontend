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
import { autoApi, ApiAutoPart } from "@/lib/autoApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const CATEGORIES = ["Filters", "Brakes", "Lubricants", "Ignition", "Electrical", "Suspension", "Body", "Tyres", "Other"];

const emptyForm = {
  name: "", category: "Filters", partNumber: "", supplier: "",
  buyingPrice: 0, sellingPrice: 0, stockQty: 0, reorderLevel: 5, status: "in-stock",
};

export function PartsInventoryTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("auto.parts.manage");

  const [records, setRecords]   = useState<ApiAutoPart[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiAutoPart | null>(null);
  const [viewing, setViewing]   = useState<ApiAutoPart | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await autoApi.parts.list({}, stationId);
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load parts"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: ApiAutoPart) => {
    setEditing(p);
    setForm({
      name: p.name, category: p.category, partNumber: p.partNumber ?? "",
      supplier: p.supplier ?? "", buyingPrice: p.buyingPrice, sellingPrice: p.sellingPrice,
      stockQty: p.stockQty, reorderLevel: p.reorderLevel, status: p.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category) return toast.error("Name and category are required");
    setSaving(true);
    try {
      const payload = { ...form, partNumber: form.partNumber || undefined, supplier: form.supplier || undefined };
      if (editing) {
        await autoApi.parts.update(editing.id, payload, stationId);
        toast.success("Part updated");
      } else {
        await autoApi.parts.create(payload, stationId);
        toast.success("Part added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save part"); }
    finally { setSaving(false); }
  };

  const [pendingDelete, setPendingDelete] = useState<ApiAutoPart | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (p: ApiAutoPart) => setPendingDelete(p);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await autoApi.parts.delete(pendingDelete.id, stationId);
      toast.success("Part removed");
      setPendingDelete(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  const stats = {
    inStock:    records.filter(r => r.status === "in-stock").length,
    lowStock:   records.filter(r => r.status === "low-stock").length,
    outOfStock: records.filter(r => r.status === "out-of-stock").length,
  };

  const columns: Column<ApiAutoPart>[] = [
    { key: "name",         label: "Part Name",    sortable: true },
    { key: "partNumber",   label: "Part #",        render: p => p.partNumber || "—" },
    { key: "category",     label: "Category",      sortable: true },
    { key: "supplier",     label: "Supplier",      render: p => p.supplier || "—" },
    { key: "buyingPrice",  label: "Cost",          render: p => `Ksh ${p.buyingPrice.toLocaleString()}` },
    { key: "sellingPrice", label: "Sell Price",    render: p => `Ksh ${p.sellingPrice.toLocaleString()}` },
    { key: "stockQty",     label: "Stock",         render: p => <span className={p.stockQty <= p.reorderLevel ? "text-destructive font-medium" : ""}>{p.stockQty}</span>, sortable: true },
    { key: "status",       label: "Status",        render: p => <StatusBadge status={p.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status",   label: "Status",   options: [{ label: "In Stock", value: "in-stock" }, { label: "Low Stock", value: "low-stock" }, { label: "Out of Stock", value: "out-of-stock" }] },
    { key: "category", label: "Category", options: CATEGORIES.map(c => ({ label: c, value: c })) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "In Stock",     value: stats.inStock,    color: "text-green-600" },
          { label: "Low Stock",    value: stats.lowStock,   color: "text-amber-600" },
          { label: "Out of Stock", value: stats.outOfStock, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Spare parts and consumables inventory</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canManage && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Part</Button>}
        </div>
      </div>

      <DataTable
        data={records} columns={columns}
        searchKeys={["name", "partNumber", "supplier", "category"]}
        searchPlaceholder="Search parts..."
        filters={filters}
        onView={p => setViewing(p)}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      <DangerConfirmModal
        open={!!pendingDelete}
        title={`Delete part "${pendingDelete?.name}"?`}
        description="This part will be permanently removed from inventory."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Part" : "Add Part"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Part Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>Part Number</Label><Input value={form.partNumber} onChange={e => set("partNumber", e.target.value)} /></div>
          <div><Label>Category *</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Buying Price (Ksh)</Label><Input type="number" value={form.buyingPrice || ""} onChange={e => set("buyingPrice", +e.target.value)} /></div>
          <div><Label>Selling Price (Ksh)</Label><Input type="number" value={form.sellingPrice || ""} onChange={e => set("sellingPrice", +e.target.value)} /></div>
          <div><Label>Stock Qty</Label><Input type="number" value={form.stockQty} onChange={e => set("stockQty", +e.target.value)} /></div>
          <div><Label>Reorder Level</Label><Input type="number" value={form.reorderLevel} onChange={e => set("reorderLevel", +e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Part Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Part #:</span> {viewing.partNumber || "—"}</div>
            <div><span className="text-muted-foreground">Category:</span> {viewing.category}</div>
            <div><span className="text-muted-foreground">Supplier:</span> {viewing.supplier || "—"}</div>
            <div><span className="text-muted-foreground">Cost:</span> Ksh {viewing.buyingPrice.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Sell Price:</span> Ksh {viewing.sellingPrice.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Stock:</span> <span className={viewing.stockQty <= viewing.reorderLevel ? "text-destructive font-medium" : ""}>{viewing.stockQty}</span></div>
            <div><span className="text-muted-foreground">Reorder Level:</span> {viewing.reorderLevel}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
