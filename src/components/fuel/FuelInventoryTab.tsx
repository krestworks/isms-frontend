import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { fuelApi, ApiFuelProduct } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const FUEL_TYPES = ["Super", "Diesel", "Kerosene", "V-Power", "Jet A-1", "Heavy Fuel Oil"];

const emptyForm = {
  fuelType: "Super", buyingPrice: 0, markedPrice: 0, sellingPrice: 0,
  reorderLevel: 5000, supplier: "", supplierContact: "", isActive: true,
};

export function FuelInventoryTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canEdit = can("fuel.tanks.edit");

  const [products, setProducts] = useState<ApiFuelProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<ApiFuelProduct | null>(null);
  const [viewing, setViewing]   = useState<ApiFuelProduct | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await fuelApi.products.list(stationId);
      setProducts(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load pricing"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: ApiFuelProduct) => {
    setEditing(p);
    setForm({
      fuelType: p.fuelType, buyingPrice: p.buyingPrice, markedPrice: p.markedPrice,
      sellingPrice: p.sellingPrice, reorderLevel: p.reorderLevel,
      supplier: p.supplier ?? "", supplierContact: p.supplierContact ?? "",
      isActive: p.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.fuelType) return toast.error("Fuel type is required");
    setSaving(true);
    try {
      await fuelApi.products.upsert(form, stationId);
      toast.success(editing ? "Pricing updated" : "Pricing added");
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save pricing"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: ApiFuelProduct) => {
    try {
      await fuelApi.products.delete(p.id, stationId);
      toast.success("Removed");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  const margin = (p: ApiFuelProduct) =>
    p.buyingPrice > 0 ? ((p.sellingPrice - p.buyingPrice) / p.buyingPrice * 100).toFixed(1) : "—";

  const stockStatus = (p: ApiFuelProduct) => {
    // derive stock status from any tank matching this fuel type
    return p.isActive ? "active" : "inactive";
  };

  const columns: Column<ApiFuelProduct>[] = [
    { key: "fuelType",     label: "Fuel Type",       sortable: true },
    { key: "buyingPrice",  label: "Buy (Ksh)",        render: p => p.buyingPrice.toFixed(2) },
    { key: "markedPrice",  label: "Marked (Ksh)",     render: p => p.markedPrice.toFixed(2) },
    { key: "sellingPrice", label: "Sell (Ksh)",       sortable: true, render: p => p.sellingPrice.toFixed(2) },
    { key: "margin",       label: "Margin",           render: p => <span className="text-green-600 font-mono text-xs">{margin(p)}%</span> },
    { key: "reorderLevel", label: "Reorder (L)",      render: p => p.reorderLevel.toLocaleString() },
    { key: "supplier",     label: "Supplier",         render: p => p.supplier || "—" },
    { key: "isActive",     label: "Status",           render: p => <StatusBadge status={p.isActive ? "active" : "inactive"} /> },
  ];

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Fuel pricing configuration, suppliers, and reorder levels</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canEdit && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>}
        </div>
      </div>

      <DataTable
        data={products}
        columns={columns}
        searchKeys={["fuelType", "supplier"]}
        searchPlaceholder="Search products..."
        onView={p => setViewing(p)}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Pricing" : "Add Fuel Product"}
        onSubmit={handleSave}
        submitLabel={saving ? "Saving..." : "Save"}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Fuel Type *</Label>
            <Select value={form.fuelType} onValueChange={v => set("fuelType", v)} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Buying Price (Ksh)</Label><Input type="number" step="0.01" value={form.buyingPrice || ""} onChange={e => set("buyingPrice", +e.target.value)} /></div>
          <div><Label>Marked Price (Ksh)</Label><Input type="number" step="0.01" value={form.markedPrice || ""} onChange={e => set("markedPrice", +e.target.value)} /></div>
          <div><Label>Selling Price (Ksh)</Label><Input type="number" step="0.01" value={form.sellingPrice || ""} onChange={e => set("sellingPrice", +e.target.value)} /></div>
          <div><Label>Reorder Level (L)</Label><Input type="number" value={form.reorderLevel || ""} onChange={e => set("reorderLevel", +e.target.value)} /></div>
          <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => set("supplier", e.target.value)} /></div>
          <div><Label>Supplier Contact</Label><Input value={form.supplierContact} onChange={e => set("supplierContact", e.target.value)} /></div>
          <div className="col-span-2">
            <Label>Status</Label>
            <Select value={form.isActive ? "active" : "inactive"} onValueChange={v => set("isActive", v === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Product Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Fuel Type:</span> {viewing.fuelType}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.isActive ? "active" : "inactive"} /></div>
            <div><span className="text-muted-foreground">Buying:</span> Ksh {viewing.buyingPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Marked:</span> Ksh {viewing.markedPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Selling:</span> Ksh {viewing.sellingPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Margin:</span> <span className="text-green-600">{margin(viewing)}%</span></div>
            <div><span className="text-muted-foreground">Reorder:</span> {viewing.reorderLevel.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Supplier:</span> {viewing.supplier || "—"}</div>
            {viewing.supplierContact && <div><span className="text-muted-foreground">Contact:</span> {viewing.supplierContact}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
