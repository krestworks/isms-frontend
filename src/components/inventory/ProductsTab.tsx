import { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { usePermission, guardAction } from "@/lib/actionPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  subBusiness: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  reorderLevel: number;
  status: string;
}

const CATS = ["Groceries", "Beverages", "Snacks", "Personal Care", "Pharmacy OTC", "Pharmacy Rx", "Household", "Other"];
const SUB_BUSINESSES = ["Jirani Mini Mart — CBD", "Westlands Pharmacy", "Mombasa Rd Cafe"];

const initial: Product[] = [
  { id: "PRD-001", sku: "MM-001", name: "Maize Flour 2kg", category: "Groceries", subBusiness: "Jirani Mini Mart — CBD", unit: "pkt", costPrice: 180, sellPrice: 220, stock: 45, reorderLevel: 20, status: "in_stock" },
  { id: "PRD-002", sku: "MM-002", name: "Cooking Oil 1L", category: "Groceries", subBusiness: "Jirani Mini Mart — CBD", unit: "btl", costPrice: 320, sellPrice: 380, stock: 12, reorderLevel: 15, status: "low_stock" },
  { id: "PRD-003", sku: "MM-003", name: "Soda 500ml", category: "Beverages", subBusiness: "Jirani Mini Mart — CBD", unit: "btl", costPrice: 50, sellPrice: 80, stock: 200, reorderLevel: 50, status: "in_stock" },
  { id: "PRD-004", sku: "PH-001", name: "Paracetamol 500mg (10s)", category: "Pharmacy OTC", subBusiness: "Westlands Pharmacy", unit: "pkt", costPrice: 25, sellPrice: 50, stock: 80, reorderLevel: 30, status: "in_stock" },
  { id: "PRD-005", sku: "PH-002", name: "Amoxicillin 250mg", category: "Pharmacy Rx", subBusiness: "Westlands Pharmacy", unit: "pkt", costPrice: 180, sellPrice: 280, stock: 0, reorderLevel: 10, status: "out_of_stock" },
];

const emptyForm = { sku: "", name: "", category: "Groceries", subBusiness: SUB_BUSINESSES[0], unit: "pcs", costPrice: 0, sellPrice: 0, stock: 0, reorderLevel: 10, status: "in_stock" };

export default function ProductsTab() {
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const computed = data.map(p => ({ ...p, status: p.stock === 0 ? "out_of_stock" : p.stock <= p.reorderLevel ? "low_stock" : "in_stock" }));

  const stats = {
    total: computed.length,
    inStock: computed.filter(d => d.status === "in_stock").length,
    low: computed.filter(d => d.status === "low_stock").length,
    out: computed.filter(d => d.status === "out_of_stock").length,
    value: computed.reduce((s, p) => s + p.costPrice * p.stock, 0),
  };

  const columns: Column<Product>[] = [
    { key: "sku", label: "SKU", sortable: true },
    { key: "name", label: "Name" },
    { key: "category", label: "Category", render: p => <Badge variant="outline">{p.category}</Badge> },
    { key: "subBusiness", label: "Sub-Business" },
    { key: "stock", label: "Stock", render: p => <span className={p.stock === 0 ? "text-destructive font-semibold" : p.stock <= p.reorderLevel ? "text-amber-600 font-semibold" : ""}>{p.stock} {p.unit}</span> },
    { key: "sellPrice", label: "Price", render: p => `Ksh ${p.sellPrice.toLocaleString()}` },
    { key: "status", label: "Status", render: p => {
      const st = p.stock === 0 ? "out_of_stock" : p.stock <= p.reorderLevel ? "low_stock" : "in_stock";
      const cls = st === "in_stock" ? "bg-green-100 text-green-800" : st === "low_stock" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
      return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{st.replace("_", " ")}</span>;
    } },
  ];

  const filters: FilterOption[] = [
    { key: "category", label: "Category", options: CATS.map(c => ({ label: c, value: c })) },
    { key: "subBusiness", label: "Sub-Business", options: SUB_BUSINESSES.map(s => ({ label: s, value: s })) },
  ];

  const canCreate = usePermission("inventory.product.create");
  const canUpdate = usePermission("inventory.product.create");
  const canDelete = usePermission("inventory.product.delete");

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setForm({ sku: p.sku, name: p.name, category: p.category, subBusiness: p.subBusiness, unit: p.unit, costPrice: p.costPrice, sellPrice: p.sellPrice, stock: p.stock, reorderLevel: p.reorderLevel, status: p.status }); setModalOpen(true); };
  const handleSave = () => {
    if (editing) { if (!guardAction("inventory.product.create", "edit a product")) return; setData(d => d.map(x => x.id === editing.id ? { ...x, ...form } : x)); }
    else { if (!guardAction("inventory.product.create", "add a product")) return; setData(d => [...d, { id: `PRD-${String(d.length + 1).padStart(3, "0")}`, ...form }]); }
    setModalOpen(false);
  };
  const handleDelete = (p: Product) => { if (!guardAction("inventory.product.delete", "delete a product")) return; setData(d => d.filter(x => x.id !== p.id)); };
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Products & Stock</h3>
          <p className="text-sm text-muted-foreground">Inventory across mini marts, pharmacies & cafes</p>
        </div>
        {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total SKUs", value: stats.total },
          { label: "In Stock", value: stats.inStock, color: "text-green-600" },
          { label: "Low Stock", value: stats.low, color: "text-amber-600" },
          { label: "Out of Stock", value: stats.out, color: "text-destructive" },
          { label: "Stock Value", value: `Ksh ${stats.value.toLocaleString()}`, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      {stats.low + stats.out > 0 && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>{stats.low + stats.out} product(s) need restocking — review the low/out-of-stock items below.</span>
          </CardContent>
        </Card>
      )}

      <DataTable data={computed} columns={columns} searchKeys={["sku", "name"]} searchPlaceholder="Search products..." filters={filters} onView={p => setViewing(p)} onEdit={canUpdate ? openEdit : undefined} onDelete={canDelete ? handleDelete : undefined} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Add"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>SKU *</Label><Input value={form.sku} onChange={e => set("sku", e.target.value)} /></div>
            <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sub-Business</Label>
              <Select value={form.subBusiness} onValueChange={v => set("subBusiness", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUB_BUSINESSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Unit</Label><Input value={form.unit} onChange={e => set("unit", e.target.value)} /></div>
            <div><Label>Stock Qty</Label><Input type="number" value={form.stock} onChange={e => set("stock", Number(e.target.value))} /></div>
            <div><Label>Cost Price (Ksh)</Label><Input type="number" value={form.costPrice} onChange={e => set("costPrice", Number(e.target.value))} /></div>
            <div><Label>Sell Price (Ksh)</Label><Input type="number" value={form.sellPrice} onChange={e => set("sellPrice", Number(e.target.value))} /></div>
            <div><Label>Reorder Level</Label><Input type="number" value={form.reorderLevel} onChange={e => set("reorderLevel", Number(e.target.value))} /></div>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Product" isView>
        {viewing && (
          <div className="space-y-2 text-sm">
            <Badge variant="outline">{viewing.sku}</Badge>
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Category:</span> {viewing.category}</div>
            <div><span className="text-muted-foreground">Sub-Business:</span> {viewing.subBusiness}</div>
            <div><span className="text-muted-foreground">Stock:</span> {viewing.stock} {viewing.unit}</div>
            <div><span className="text-muted-foreground">Cost / Sell:</span> Ksh {viewing.costPrice} / Ksh {viewing.sellPrice}</div>
            <div><span className="text-muted-foreground">Margin:</span> {((viewing.sellPrice - viewing.costPrice) / Math.max(1, viewing.sellPrice) * 100).toFixed(1)}%</div>
            <div><span className="text-muted-foreground">Reorder at:</span> {viewing.reorderLevel} {viewing.unit}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
