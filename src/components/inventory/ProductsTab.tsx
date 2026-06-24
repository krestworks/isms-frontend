import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, AlertTriangle, PackageSearch, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission, guardAction } from "@/lib/actionPermissions";
import { inventoryApi, ApiInventoryItem, ApiSupplier } from "@/lib/inventoryApi";
import { useActiveStation } from "@/lib/useActiveStation";

const CATEGORIES = ["general", "fuel", "lpg", "water", "auto_parts", "pharmacy", "food_bev"];
const CAT_LABELS: Record<string, string> = {
  general: "General", fuel: "Fuel", lpg: "LPG", water: "Water",
  auto_parts: "Auto Parts", pharmacy: "Pharmacy", food_bev: "Food & Bev",
};
const UNITS = ["pcs", "kg", "g", "l", "ml", "pkt", "btl", "box", "ctn", "bag", "pair", "set"];

const emptyForm = {
  name: "", sku: "", barcode: "", category: "general", unit: "pcs",
  description: "", reorderLevel: 10, reorderQty: 20,
  costPrice: 0, sellingPrice: 0, supplierId: "", location: "",
};

const emptyAdjust = { type: "receipt", qty: 0, notes: "", reference: "" };

function StockPill({ item }: { item: ApiInventoryItem }) {
  if (item.currentQty <= 0)
    return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 font-medium">Out of stock</span>;
  if (item.currentQty <= item.reorderLevel)
    return <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800 font-medium">Low stock</span>;
  return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 font-medium">In stock</span>;
}

export default function ProductsTab() {
  const { stationId } = useActiveStation();
  const [data, setData]           = useState<ApiInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [modalOpen, setModal]     = useState(false);
  const [adjustOpen, setAdjust]   = useState(false);
  const [editing, setEditing]     = useState<ApiInventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<ApiInventoryItem | null>(null);
  const [form, setForm]           = useState<typeof emptyForm>(emptyForm);
  const [adjForm, setAdjForm]     = useState<typeof emptyAdjust>(emptyAdjust);

  const canCreate = usePermission("inventory.item.create");
  const canUpdate = usePermission("inventory.item.update");
  const canDelete = usePermission("inventory.item.delete");
  const canAdjust = usePermission("inventory.stock.adjust");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, suppRes] = await Promise.all([
        inventoryApi.items.list(stationId),
        inventoryApi.suppliers.list(stationId),
      ]);
      setData(itemsRes.data ?? []);
      setSuppliers(suppRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load items"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (item: ApiInventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name, sku: item.sku ?? "", barcode: item.barcode ?? "",
      category: item.category, unit: item.unit, description: item.description ?? "",
      reorderLevel: item.reorderLevel, reorderQty: item.reorderQty,
      costPrice: item.costPrice, sellingPrice: item.sellingPrice,
      supplierId: item.supplierId ?? "", location: item.location ?? "",
    });
    setModal(true);
  };
  const openAdjust = (item: ApiInventoryItem) => {
    setAdjustItem(item);
    setAdjForm(emptyAdjust);
    setAdjust(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (editing && !guardAction("inventory.item.update", "edit an item")) return;
    if (!editing && !guardAction("inventory.item.create", "add an item")) return;
    setSaving(true);
    try {
      const payload = { ...form, supplierId: form.supplierId || undefined };
      if (editing) {
        const res = await inventoryApi.items.update(editing.id, payload);
        setData(d => d.map(x => x.id === editing.id ? res.data : x));
        toast.success("Item updated");
      } else {
        const res = await inventoryApi.items.create(payload, stationId);
        setData(d => [...d, res.data]);
        toast.success("Item added");
      }
      setModal(false);
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: ApiInventoryItem) => {
    if (!guardAction("inventory.item.delete", "delete an item")) return;
    try {
      await inventoryApi.items.delete(item.id);
      setData(d => d.filter(x => x.id !== item.id));
      toast.success("Item deleted");
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const handleAdjust = async () => {
    if (!adjustItem) return;
    if (!guardAction("inventory.stock.adjust", "adjust stock")) return;
    if (!adjForm.qty || adjForm.qty <= 0) { toast.error("Quantity must be greater than 0"); return; }
    setSaving(true);
    try {
      const res = await inventoryApi.items.adjust(adjustItem.id, adjForm);
      setData(d => d.map(x => x.id === adjustItem.id ? res.data : x));
      toast.success("Stock adjusted");
      setAdjust(false);
    } catch (e: any) { toast.error(e?.message || "Adjustment failed"); }
    finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const setAdj = (k: string, v: any) => setAdjForm(f => ({ ...f, [k]: v }));

  const stats = {
    total:   data.length,
    inStock: data.filter(i => i.currentQty > i.reorderLevel).length,
    low:     data.filter(i => i.currentQty > 0 && i.currentQty <= i.reorderLevel).length,
    out:     data.filter(i => i.currentQty <= 0).length,
    value:   data.reduce((s, i) => s + i.costPrice * i.currentQty, 0),
  };

  const columns: Column<ApiInventoryItem>[] = [
    { key: "sku",  label: "SKU", render: i => i.sku ? <span className="font-mono text-xs">{i.sku}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "name", label: "Name" },
    { key: "category",    label: "Category", render: i => <Badge variant="outline">{CAT_LABELS[i.category] ?? i.category}</Badge> },
    { key: "currentQty", label: "Stock", render: i => (
      <span className={i.currentQty <= 0 ? "text-destructive font-semibold" : i.currentQty <= i.reorderLevel ? "text-amber-600 font-semibold" : ""}>
        {i.currentQty} {i.unit}
      </span>
    )},
    { key: "sellingPrice", label: "Price",    render: i => `Ksh ${i.sellingPrice.toLocaleString()}` },
    { key: "costPrice",    label: "Cost",     render: i => `Ksh ${i.costPrice.toLocaleString()}` },
    { key: "status",       label: "Status",   render: i => <StockPill item={i} /> },
  ];

  const filters: FilterOption[] = [
    { key: "category", label: "Category", options: CATEGORIES.map(c => ({ label: CAT_LABELS[c], value: c })) },
    { key: "status",   label: "Stock", options: [
      { label: "In Stock",    value: "in_stock" },
      { label: "Low Stock",   value: "low_stock" },
      { label: "Out of Stock", value: "out_of_stock" },
    ]},
  ];

  const rowActions = canAdjust
    ? (item: ApiInventoryItem) => (
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openAdjust(item)}>
          <SlidersHorizontal className="h-3 w-3 mr-1" />Adjust
        </Button>
      )
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Products & Stock Items</h3>
          <p className="text-sm text-muted-foreground">Central item catalogue across all modules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
          {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Item</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total SKUs",   value: stats.total },
          { label: "In Stock",     value: stats.inStock, color: "text-green-600" },
          { label: "Low Stock",    value: stats.low,     color: "text-amber-600" },
          { label: "Out of Stock", value: stats.out,     color: "text-destructive" },
          { label: "Stock Value",  value: `Ksh ${stats.value.toLocaleString()}`, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color ?? ""}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {stats.low + stats.out > 0 && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {stats.low + stats.out} item(s) need restocking. Create a Purchase Order to restock.
          </CardContent>
        </Card>
      )}

      {data.length === 0 && !loading && (
        <div className="py-16 text-center text-muted-foreground">
          <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No items yet</p>
          <p className="text-sm mt-1">Add items to track your inventory</p>
        </div>
      )}

      <DataTable
        data={data} columns={columns} loading={loading} filters={filters}
        searchKeys={["name", "sku", "barcode"]} searchPlaceholder="Search by name, SKU or barcode..."
        onEdit={canUpdate ? openEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        rowActions={rowActions}
      />

      {/* Add / Edit Item Modal */}
      <ModalForm open={modalOpen} onClose={() => setModal(false)}
        title={editing ? "Edit Item" : "Add Inventory Item"}
        onSubmit={handleSave} submitLabel={saving ? "Saving…" : editing ? "Update" : "Add Item"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div><Label>SKU</Label><Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="Auto if blank" /></div>
          <div><Label>Barcode</Label><Input value={form.barcode} onChange={e => set("barcode", e.target.value)} /></div>
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CAT_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Unit</Label>
            <Select value={form.unit} onValueChange={v => set("unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Cost Price (Ksh)</Label><Input type="number" min={0} value={form.costPrice} onChange={e => set("costPrice", Number(e.target.value))} /></div>
          <div><Label>Selling Price (Ksh)</Label><Input type="number" min={0} value={form.sellingPrice} onChange={e => set("sellingPrice", Number(e.target.value))} /></div>
          <div><Label>Reorder Level</Label><Input type="number" min={0} value={form.reorderLevel} onChange={e => set("reorderLevel", Number(e.target.value))} /></div>
          <div><Label>Reorder Qty</Label><Input type="number" min={0} value={form.reorderQty} onChange={e => set("reorderQty", Number(e.target.value))} /></div>
          <div><Label>Supplier</Label>
            <Select value={form.supplierId || "__none__"} onValueChange={v => set("supplierId", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No supplier</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Storage Location</Label><Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Shelf A3" /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)} /></div>
        </div>
      </ModalForm>

      {/* Stock Adjustment Modal */}
      <ModalForm open={adjustOpen} onClose={() => setAdjust(false)}
        title={`Adjust Stock — ${adjustItem?.name ?? ""}`}
        onSubmit={handleAdjust} submitLabel={saving ? "Adjusting…" : "Apply Adjustment"}>
        <div className="space-y-4">
          {adjustItem && (
            <div className="rounded-lg bg-muted/50 px-4 py-2 text-sm">
              Current stock: <strong>{adjustItem.currentQty} {adjustItem.unit}</strong>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Movement Type</Label>
              <Select value={adjForm.type} onValueChange={v => setAdj("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt (Stock In)</SelectItem>
                  <SelectItem value="issue">Issue (Stock Out)</SelectItem>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="transfer_in">Transfer In</SelectItem>
                  <SelectItem value="transfer_out">Transfer Out</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="damage">Damage / Write-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><Input type="number" min={1} value={adjForm.qty} onChange={e => setAdj("qty", Number(e.target.value))} /></div>
            <div><Label>Reference</Label><Input value={adjForm.reference} onChange={e => setAdj("reference", e.target.value)} placeholder="Doc no., PO no., etc." /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={adjForm.notes} onChange={e => setAdj("notes", e.target.value)} /></div>
        </div>
      </ModalForm>
    </div>
  );
}
