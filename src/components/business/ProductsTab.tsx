import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, AlertTriangle, Upload, Download, Package, TrendingDown, BarChart2, Tag, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizProduct, ApiBizCategory } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";

interface Props { business: ApiBizBusiness; }

const emptyForm = {
  name: "", sku: "", barcode: "", description: "", categoryId: "",
  markedPrice: 0, price: 0, costPrice: 0, unit: "pcs",
  stockQty: 0, reorderLevel: 5, imageUrl: "",
  expiryDate: "", requiresPrescription: false, status: "active",
};

// ── CSV helpers ───────────────────────────────────────────────────────────────

function downloadTemplate(products: ApiBizProduct[]) {
  const header = "Name,SKU,Barcode,Low Stock Alert Level,Current Stock,New Stock Qty,Adjustment Type,Notes";
  const rows = products.map(p =>
    [p.name, p.sku ?? "", p.barcode ?? "", p.reorderLevel, p.stockQty, "", "adjustment", ""].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stock-update-template.csv";
  a.click();
}

function parseStockCsv(text: string): { name: string; sku: string; barcode: string; newQty: number; type: string; notes: string }[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    return {
      name:    cols[0]?.trim() ?? "",
      sku:     cols[1]?.trim() ?? "",
      barcode: cols[2]?.trim() ?? "",
      newQty:  parseFloat(cols[4]?.trim() ?? "0") || 0,
      type:    cols[5]?.trim() || "adjustment",
      notes:   cols[6]?.trim() ?? "",
    };
  }).filter(r => r.name && !isNaN(r.newQty) && r.newQty >= 0);
}

export function ProductsTab({ business }: Props) {
  const can = usePermissions();
  const canManage = can("business.products.manage");

  const [records,    setRecords]    = useState<ApiBizProduct[]>([]);
  const [categories, setCategories] = useState<ApiBizCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState<ApiBizProduct | null>(null);
  const [viewing,    setViewing]    = useState<ApiBizProduct | null>(null);
  const [form,       setForm]       = useState(emptyForm);
  const [saving,     setSaving]     = useState(false);

  // stock adjust
  const [adjOpen,    setAdjOpen]    = useState(false);
  const [adjProduct, setAdjProduct] = useState<ApiBizProduct | null>(null);
  const [adjForm,    setAdjForm]    = useState({ type: "adjustment", qty: 0, notes: "" });

  // bulk upload
  const [uploadOpen,  setUploadOpen]  = useState(false);
  const [uploadRows,  setUploadRows]  = useState<ReturnType<typeof parseStockCsv>>([]);
  const [uploading,   setUploading]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef  = useRef<HTMLInputElement>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        bizApi.products.list(business.id),
        bizApi.categories.list(business.id),
      ]);
      setRecords(pRes.data ?? []);
      setCategories(cRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (p: ApiBizProduct) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku ?? "", barcode: p.barcode ?? "", description: p.description ?? "",
      categoryId: p.categoryId ?? "",
      markedPrice: p.markedPrice ?? 0, price: p.price, costPrice: p.costPrice, unit: p.unit,
      stockQty: p.stockQty, reorderLevel: p.reorderLevel, imageUrl: p.imageUrl ?? "",
      expiryDate: p.expiryDate ?? "", requiresPrescription: p.requiresPrescription, status: p.status,
    });
    setModalOpen(true);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("imageUrl", ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Product name is required");
    if (!form.price) return toast.error("Selling price is required");
    setSaving(true);
    try {
      const cat = categories.find(c => c.id === form.categoryId);
      const payload: any = {
        ...form,
        businessId: business.id,
        categoryName: cat?.name ?? "",
        markedPrice: form.markedPrice || 0,
        imageUrl: form.imageUrl || null,
      };
      if (!payload.categoryId)  delete payload.categoryId;
      if (!payload.sku)         delete payload.sku;
      if (!payload.barcode)     delete payload.barcode;
      if (!payload.expiryDate)  delete payload.expiryDate;
      if (!payload.description) delete payload.description;

      if (editing) {
        await bizApi.products.update(editing.id, payload);
        toast.success("Product updated");
      } else {
        await bizApi.products.create(payload);
        toast.success("Product added");
      }
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = (p: ApiBizProduct) => {
    setConfirmDlg({
      title: `Delete "${p.name}"?`,
      description: "This product will be permanently removed from inventory.",
      onConfirm: async () => {
        try { await bizApi.products.delete(p.id); toast.success("Product deleted"); load(); }
        catch (e: any) { toast.error(e?.message || "Failed to delete"); }
      },
    });
  };

  const handleAdjust = async () => {
    if (!adjProduct) return;
    if (adjForm.qty < 0) return toast.error("Quantity must be ≥ 0");
    try {
      await bizApi.products.adjustStock({ productId: adjProduct.id, ...adjForm });
      toast.success("Stock adjusted");
      setAdjOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to adjust stock"); }
  };

  // ── Bulk CSV upload ───────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseStockCsv(ev.target?.result as string);
      if (!rows.length) return toast.error("No valid rows found in CSV");
      setUploadRows(rows);
      setUploadOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBulkUpload = async () => {
    if (!uploadRows.length) return;
    setUploading(true);
    try {
      const res = await bizApi.products.bulkUpdateStock(business.id, uploadRows);
      const { updated, notFound, errors } = res.data;
      toast.success(`Updated ${updated} product(s)${notFound ? ` — ${notFound} not matched` : ""}${errors ? ` — ${errors} errors` : ""}`);
      setUploadOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Bulk update failed"); }
    finally { setUploading(false); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    total:    records.length,
    active:   records.filter(p => p.status === "active").length,
    lowStock: records.filter(p => p.status === "active" && p.stockQty > 0 && p.stockQty <= p.reorderLevel).length,
    outStock: records.filter(p => p.status === "active" && p.stockQty <= 0).length,
  };

  const stockValue = records.reduce((s, p) => s + p.stockQty * p.costPrice, 0);
  const retailValue = records.reduce((s, p) => s + p.stockQty * p.price, 0);

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: Column<ApiBizProduct>[] = [
    { key: "imageUrl", label: "", render: p => p.imageUrl
      ? <img src={p.imageUrl} alt={p.name} className="h-9 w-9 rounded-md object-cover border border-border" />
      : <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>
    },
    { key: "name",        label: "Product",  sortable: true },
    { key: "categoryName",label: "Category", render: p => p.categoryName || <span className="text-muted-foreground text-xs">—</span> },
    { key: "sku",         label: "SKU",      render: p => p.sku ? <span className="font-mono text-xs text-muted-foreground">{p.sku}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "markedPrice", label: "MRP",      render: p => p.markedPrice > 0 ? <span className="text-xs line-through text-muted-foreground">Ksh {p.markedPrice.toLocaleString()}</span> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "price",       label: "Selling",  render: p => <span className="font-semibold text-primary">Ksh {p.price.toLocaleString()}</span>, sortable: true },
    { key: "costPrice",   label: "Cost",     render: p => <span className="text-xs text-muted-foreground">Ksh {p.costPrice.toLocaleString()}</span>, sortable: true },
    { key: "stockQty",    label: "Stock",    render: p => (
      <span className={`font-semibold text-sm ${p.stockQty <= 0 ? "text-destructive" : p.stockQty <= p.reorderLevel ? "text-amber-600" : "text-green-600"}`}>
        {p.stockQty} <span className="font-normal text-xs text-muted-foreground">{p.unit}</span>
        {p.stockQty <= 0 && <Badge variant="destructive" className="ml-1 text-[10px] py-0 h-4">Out</Badge>}
        {p.stockQty > 0 && p.stockQty <= p.reorderLevel && <Badge variant="secondary" className="ml-1 text-[10px] py-0 h-4">Low</Badge>}
      </span>
    ), sortable: true },
    { key: "status", label: "Status", render: p => <StatusBadge status={p.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
    { key: "categoryName", label: "Category", options: categories.map(c => ({ label: c.name, value: c.name })) },
  ];

  const isPharmacy = business.type === "pharmacy";

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Products", value: stats.total,    color: "", icon: Package },
          { label: "Active",         value: stats.active,   color: "text-green-600", icon: BarChart2 },
          { label: "Low Stock",      value: stats.lowStock, color: "text-amber-600", icon: TrendingDown },
          { label: "Out of Stock",   value: stats.outStock, color: "text-destructive", icon: AlertTriangle },
          { label: "Stock Value (Cost)", value: `Ksh ${Math.round(stockValue).toLocaleString()}`, color: "text-blue-600", icon: Tag },
          { label: "Retail Value",   value: `Ksh ${Math.round(retailValue).toLocaleString()}`, color: "text-primary", icon: Tag },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3 w-3 ${color || "text-muted-foreground"}`} />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock warning */}
      {stats.lowStock > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{stats.lowStock} product{stats.lowStock > 1 ? "s are" : " is"} running low on stock — consider restocking</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{records.length} products in inventory</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => downloadTemplate(records)}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Stock
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" />Add Product
          </Button>
        </div>
      </div>

      <DataTable
        data={records} columns={columns} filters={filters}
        searchKeys={["name","sku","barcode"]}
        searchPlaceholder="Search by name, SKU or barcode..."
        onView={p => setViewing(p)}
        onEdit={openEdit}
        onDelete={canManage ? handleDelete : undefined}
        extraActions={[{
          label: "Adjust Stock",
          onClick: p => { setAdjProduct(p); setAdjForm({ type: "adjustment", qty: p.stockQty, notes: "" }); setAdjOpen(true); },
        }]}
      />

      <ConfirmDialog
        open={!!confirmDlg}
        title={confirmDlg?.title ?? ""}
        description={confirmDlg?.description}
        confirmLabel="Delete"
        onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
        onCancel={() => setConfirmDlg(null)}
      />

      {/* ── Add / Edit Product ── */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? `Edit — ${editing.name}` : "Add Product"}
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : editing ? "Update" : "Add Product"}>
        <div className="grid grid-cols-2 gap-3">
          {/* Image */}
          <div className="col-span-2">
            <Label>Product Image</Label>
            <div className="flex gap-2 items-center mt-1">
              {form.imageUrl ? (
                <div className="relative flex-shrink-0">
                  <img src={form.imageUrl} alt="preview" className="h-14 w-14 rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => set("imageUrl", "")}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center hover:bg-destructive/80">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center border border-dashed border-border flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="Paste image URL..." />
                <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()} className="w-full h-7 text-xs">
                  <Upload className="h-3 w-3 mr-1.5" /> Upload from device
                </Button>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <Label>Product Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Coca-Cola 500ml" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.categoryId || "__none__"} onValueChange={v => set("categoryId", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit of Measure</Label>
            <Input value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="pcs, kg, litre, box..." />
          </div>

          {/* Price section */}
          <div className="col-span-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Tag className="h-3 w-3" />Pricing
            </p>
          </div>
          <div>
            <Label>MRP / Marked Price (Ksh)</Label>
            <Input type="number" value={form.markedPrice || ""} onChange={e => set("markedPrice", +e.target.value)} placeholder="0 = no marked price" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Shown as strikethrough in POS</p>
          </div>
          <div>
            <Label>Selling Price (Ksh) *</Label>
            <Input type="number" value={form.price || ""} onChange={e => set("price", +e.target.value)} />
          </div>
          <div>
            <Label>Cost / Buying Price (Ksh)</Label>
            <Input type="number" value={form.costPrice || ""} onChange={e => set("costPrice", +e.target.value)} />
          </div>
          <div className="flex items-end pb-1">
            {form.price > 0 && form.costPrice > 0 && (
              <p className="text-xs text-green-600 font-medium">
                Margin: Ksh {(form.price - form.costPrice).toLocaleString()} ({Math.round(((form.price - form.costPrice) / form.price) * 100)}%)
              </p>
            )}
          </div>

          {/* Stock section */}
          <div className="col-span-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stock</p>
          </div>
          <div>
            <Label>Opening Stock Qty</Label>
            <Input type="number" value={form.stockQty || ""} onChange={e => set("stockQty", +e.target.value)} />
          </div>
          <div>
            <Label>Low Stock Alert Level</Label>
            <Input type="number" min={0} value={form.reorderLevel || ""} onChange={e => set("reorderLevel", +e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-0.5">Show "Low" badge when stock falls to or below this qty</p>
          </div>
          <div>
            <Label>SKU</Label>
            <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="Auto or manual" />
          </div>
          <div>
            <Label>Barcode</Label>
            <Input value={form.barcode} onChange={e => set("barcode", e.target.value)} />
          </div>

          {/* Pharmacy extras */}
          {isPharmacy && (
            <>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} />
              </div>
              <div className="flex items-center gap-3 mt-5">
                <Switch checked={form.requiresPrescription} onCheckedChange={v => set("requiresPrescription", v)} />
                <Label className="cursor-pointer">Requires Prescription</Label>
              </div>
            </>
          )}

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional product description" rows={2} />
          </div>
        </div>
      </ModalForm>

      {/* ── Stock Adjustment ── */}
      <ModalForm open={adjOpen} onClose={() => setAdjOpen(false)}
        title={`Stock Adjustment — ${adjProduct?.name}`}
        onSubmit={handleAdjust} submitLabel="Apply">
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current stock</span>
            <span className="font-bold text-lg">{adjProduct?.stockQty} {adjProduct?.unit}</span>
          </div>
          <div>
            <Label>Adjustment Type</Label>
            <Select value={adjForm.type} onValueChange={v => setAdjForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">Set Exact Quantity</SelectItem>
                <SelectItem value="purchase_in">Add Stock (Purchase / Return)</SelectItem>
                <SelectItem value="wastage">Remove Stock (Wastage / Loss)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{adjForm.type === "adjustment" ? "New Quantity" : adjForm.type === "purchase_in" ? "Quantity to Add" : "Quantity to Remove"}</Label>
            <Input type="number" min={0} value={adjForm.qty || ""} onChange={e => setAdjForm(f => ({ ...f, qty: +e.target.value }))} />
            {adjForm.type !== "adjustment" && adjProduct && (
              <p className="text-xs text-muted-foreground mt-1">
                New stock will be: <strong>
                  {adjForm.type === "purchase_in" ? adjProduct.stockQty + adjForm.qty : Math.max(0, adjProduct.stockQty - adjForm.qty)}
                </strong> {adjProduct.unit}
              </p>
            )}
          </div>
          <div>
            <Label>Notes / Reference</Label>
            <Input value={adjForm.notes} onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason or reference number" />
          </div>
        </div>
      </ModalForm>

      {/* ── Bulk CSV Upload Preview ── */}
      <ModalForm
        open={uploadOpen} onClose={() => setUploadOpen(false)}
        title="Bulk Stock Update Preview"
        onSubmit={handleBulkUpload}
        submitLabel={uploading ? "Applying..." : `Apply ${uploadRows.length} Updates`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Review the rows below. Products are matched by SKU, barcode, or name.
          </p>
          <div className="max-h-64 overflow-y-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold">Product</th>
                  <th className="text-right p-2 font-semibold">New Qty</th>
                  <th className="text-left p-2 font-semibold">Type</th>
                  <th className="text-left p-2 font-semibold">Match</th>
                </tr>
              </thead>
              <tbody>
                {uploadRows.map((row, i) => {
                  const match = records.find(p =>
                    (row.sku && p.sku === row.sku) ||
                    (row.barcode && p.barcode === row.barcode) ||
                    p.name.toLowerCase() === row.name.toLowerCase()
                  );
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.name}{row.sku && <span className="text-muted-foreground ml-1 font-mono">{row.sku}</span>}</td>
                      <td className="p-2 text-right font-semibold">{row.newQty}</td>
                      <td className="p-2 text-muted-foreground">{row.type}</td>
                      <td className="p-2">
                        {match
                          ? <span className="text-green-600 font-medium">✓ {match.name}</span>
                          : <span className="text-destructive">✗ Not found</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ModalForm>

      {/* ── View Product ── */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Product Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {viewing.imageUrl
                  ? <img src={viewing.imageUrl} alt={viewing.name} className="h-16 w-16 rounded-xl object-cover border flex-shrink-0" />
                  : <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center border flex-shrink-0"><Package className="h-6 w-6 text-muted-foreground/30" /></div>
                }
                <div className="min-w-0">
                  <h3 className="font-bold text-base truncate">{viewing.name}</h3>
                  <p className="text-muted-foreground text-xs">{viewing.categoryName || "Uncategorized"}</p>
                </div>
              </div>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="p-3 rounded-lg bg-muted/40 col-span-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">MRP</p>
                  <p className="font-bold text-sm">{viewing.markedPrice > 0 ? `Ksh ${viewing.markedPrice.toLocaleString()}` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Selling</p>
                  <p className="font-bold text-sm text-primary">Ksh {viewing.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-bold text-sm">Ksh {viewing.costPrice.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div><span className="text-muted-foreground text-xs">Stock</span><p className="font-semibold">{viewing.stockQty} {viewing.unit}</p></div>
            <div><span className="text-muted-foreground text-xs">Reorder Level</span><p>{viewing.reorderLevel} {viewing.unit}</p></div>
            <div><span className="text-muted-foreground text-xs">SKU</span><p className="font-mono">{viewing.sku || "—"}</p></div>
            <div><span className="text-muted-foreground text-xs">Barcode</span><p className="font-mono">{viewing.barcode || "—"}</p></div>
            {viewing.expiryDate && <div><span className="text-muted-foreground text-xs">Expiry</span><p>{viewing.expiryDate}</p></div>}
            {viewing.requiresPrescription && (
              <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                ⚠ Requires Prescription
              </div>
            )}
            {viewing.description && (
              <div className="col-span-2"><span className="text-muted-foreground text-xs">Description</span><p className="mt-0.5">{viewing.description}</p></div>
            )}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
