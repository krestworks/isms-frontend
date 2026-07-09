import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Settings, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { fuelApi, ApiFuelProduct, ApiFuelPump, ApiFuelTank } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";

const FUEL_TYPES = ["Super", "Diesel", "Kerosene", "V-Power", "Jet A-1", "Heavy Fuel Oil"];

const emptyProductForm = {
  fuelType: "Super", buyingPrice: 0, markedPrice: 0, sellingPrice: 0,
  reorderLevel: 5000, supplier: "", supplierContact: "", isActive: true,
};

const emptyPumpForm = { pumpNumber: 1, name: "", tankId: "__none__", nozzles: 1, status: "active" };

export function FuelInventoryTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canEdit = can("fuel.tanks.edit");
  const canCreate = can("fuel.tanks.create");

  const [products, setProducts] = useState<ApiFuelProduct[]>([]);
  const [pumps, setPumps]       = useState<ApiFuelPump[]>([]);
  const [tanks, setTanks]       = useState<ApiFuelTank[]>([]);
  const [loading, setLoading]   = useState(true);

  // Product modal
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProd, setEditingProd]     = useState<ApiFuelProduct | null>(null);
  const [viewingProd, setViewingProd]     = useState<ApiFuelProduct | null>(null);
  const [productForm, setProductForm]     = useState(emptyProductForm);
  const [savingProd, setSavingProd]       = useState(false);

  // Pump modal
  const [pumpModalOpen, setPumpModalOpen] = useState(false);
  const [editingPump, setEditingPump]     = useState<ApiFuelPump | null>(null);
  const [pumpForm, setPumpForm]           = useState(emptyPumpForm);
  const [savingPump, setSavingPump]       = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [prodRes, pumpRes, tankRes] = await Promise.all([
        fuelApi.products.list(stationId),
        fuelApi.pumps.list(stationId),
        fuelApi.tanks.list(stationId),
      ]);
      setProducts(prodRes.data ?? []);
      setPumps(pumpRes.data ?? []);
      setTanks(tankRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load setup data"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  // ── Product handlers ──────────────────────────────────────────────────────

  const setP = (k: string, v: any) => setProductForm(f => ({ ...f, [k]: v }));

  const openNewProduct = () => { setEditingProd(null); setProductForm(emptyProductForm); setProdModalOpen(true); };
  const openEditProduct = (p: ApiFuelProduct) => {
    setEditingProd(p);
    setProductForm({
      fuelType: p.fuelType, buyingPrice: p.buyingPrice, markedPrice: p.markedPrice,
      sellingPrice: p.sellingPrice, reorderLevel: p.reorderLevel,
      supplier: p.supplier ?? "", supplierContact: p.supplierContact ?? "", isActive: p.isActive,
    });
    setProdModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.fuelType) return toast.error("Fuel type is required");
    setSavingProd(true);
    try {
      await fuelApi.products.upsert(productForm, stationId);
      toast.success(editingProd ? "Pricing updated" : "Pricing added");
      setProdModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save pricing"); }
    finally { setSavingProd(false); }
  };

  const handleDeleteProduct = async (p: ApiFuelProduct) => {
    try {
      await fuelApi.products.delete(p.id, stationId);
      toast.success("Removed");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
  };

  // ── Pump handlers ─────────────────────────────────────────────────────────

  const setQ = (k: string, v: any) => setPumpForm(f => ({ ...f, [k]: v }));

  const openNewPump = () => {
    setEditingPump(null);
    const nextNum = pumps.length > 0 ? Math.max(...pumps.map(p => p.pumpNumber)) + 1 : 1;
    setPumpForm({ ...emptyPumpForm, pumpNumber: nextNum });
    setPumpModalOpen(true);
  };
  const openEditPump = (p: ApiFuelPump) => {
    setEditingPump(p);
    setPumpForm({ pumpNumber: p.pumpNumber, name: p.name, tankId: p.tankId ?? "__none__", nozzles: p.nozzles, status: p.status });
    setPumpModalOpen(true);
  };

  const handleSavePump = async () => {
    if (!pumpForm.name || !pumpForm.pumpNumber) return toast.error("Pump number and name are required");
    setSavingPump(true);
    try {
      const tankId = pumpForm.tankId === "__none__" ? undefined : pumpForm.tankId || undefined;
      if (editingPump) {
        await fuelApi.pumps.update(editingPump.id, { ...pumpForm, tankId }, stationId);
        toast.success("Pump updated");
      } else {
        await fuelApi.pumps.create({ ...pumpForm, tankId }, stationId);
        toast.success("Pump added");
      }
      setPumpModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save pump"); }
    finally { setSavingPump(false); }
  };

  const handleDeletePump = async (p: ApiFuelPump) => {
    try {
      await fuelApi.pumps.delete(p.id, stationId);
      toast.success("Pump removed");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to delete pump"); }
  };

  // ── Columns ───────────────────────────────────────────────────────────────

  const margin = (p: ApiFuelProduct) =>
    p.buyingPrice > 0 ? ((p.sellingPrice - p.buyingPrice) / p.buyingPrice * 100).toFixed(1) : "—";

  const productCols: Column<ApiFuelProduct>[] = [
    { key: "fuelType",     label: "Fuel Type",  sortable: true },
    { key: "buyingPrice",  label: "Buy (Ksh)",  render: p => p.buyingPrice.toFixed(2) },
    { key: "markedPrice",  label: "Marked",     render: p => p.markedPrice.toFixed(2) },
    { key: "sellingPrice", label: "Sell (Ksh)", sortable: true, render: p => p.sellingPrice.toFixed(2) },
    { key: "margin",       label: "Margin",     render: p => <span className="text-green-600 font-mono text-xs">{margin(p)}%</span> },
    { key: "supplier",     label: "Supplier",   render: p => p.supplier || "—" },
    { key: "isActive",     label: "Status",     render: p => <StatusBadge status={p.isActive ? "active" : "inactive"} /> },
  ];

  const pumpCols: Column<ApiFuelPump>[] = [
    { key: "pumpNumber", label: "Pump #",    sortable: true, render: p => <span className="font-mono font-bold">Pump {p.pumpNumber}</span> },
    { key: "name",       label: "Name",      sortable: true },
    { key: "tank",       label: "Linked Tank", render: p => p.tank ? `${p.tank.name} (${p.tank.fuelType})` : <span className="text-muted-foreground text-xs">No tank</span> },
    { key: "nozzles",    label: "Nozzles",   render: p => String(p.nozzles) },
    { key: "status",     label: "Status",    render: p => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── Fuel Pricing ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Fuel Pricing</span>
            <span className="text-xs text-muted-foreground">— configure buying & selling prices per fuel type</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
            {canCreate && <Button size="sm" onClick={openNewProduct}><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>}
          </div>
        </div>

        <DataTable
          data={products}
          columns={productCols}
          searchKeys={["fuelType", "supplier"]}
          searchPlaceholder="Search products..."
          onView={p => setViewingProd(p)}
          onEdit={canEdit ? openEditProduct : undefined}
          onDelete={canEdit ? handleDeleteProduct : undefined}
        />
      </div>

      <Separator />

      {/* ── Pump Setup ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Pump Setup</span>
            <span className="text-xs text-muted-foreground">— register and configure fuel pumps</span>
          </div>
          {canCreate && <Button size="sm" onClick={openNewPump}><Plus className="h-4 w-4 mr-1.5" />Add Pump</Button>}
        </div>

        {pumps.length === 0 && !loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
            No pumps configured yet. Add pumps to enable sales recording.
          </div>
        ) : (
          <DataTable
            data={pumps}
            columns={pumpCols}
            searchKeys={["name"]}
            searchPlaceholder="Search pumps..."
            onEdit={canEdit ? openEditPump : undefined}
            onDelete={canEdit ? handleDeletePump : undefined}
          />
        )}
      </div>

      {/* Product Modal */}
      <ModalForm open={prodModalOpen} onClose={() => setProdModalOpen(false)}
        title={editingProd ? "Edit Pricing" : "Add Fuel Product"}
        onSubmit={handleSaveProduct} submitLabel={savingProd ? "Saving..." : "Save"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Fuel Type *</Label>
            <Select value={productForm.fuelType} onValueChange={v => setP("fuelType", v)} disabled={!!editingProd}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Buying Price (Ksh)</Label><Input type="number" step="0.01" value={productForm.buyingPrice || ""} onChange={e => setP("buyingPrice", +e.target.value)} /></div>
          <div><Label>Marked Price (Ksh)</Label><Input type="number" step="0.01" value={productForm.markedPrice || ""} onChange={e => setP("markedPrice", +e.target.value)} /></div>
          <div><Label>Selling Price (Ksh)</Label><Input type="number" step="0.01" value={productForm.sellingPrice || ""} onChange={e => setP("sellingPrice", +e.target.value)} /></div>
          <div><Label>Reorder Level (L)</Label><Input type="number" value={productForm.reorderLevel || ""} onChange={e => setP("reorderLevel", +e.target.value)} /></div>
          <div><Label>Supplier</Label><Input value={productForm.supplier} onChange={e => setP("supplier", e.target.value)} /></div>
          <div><Label>Supplier Contact</Label><Input value={productForm.supplierContact} onChange={e => setP("supplierContact", e.target.value)} /></div>
          <div className="col-span-2">
            <Label>Status</Label>
            <Select value={productForm.isActive ? "active" : "inactive"} onValueChange={v => setP("isActive", v === "active")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      {/* Pump Modal */}
      <ModalForm open={pumpModalOpen} onClose={() => setPumpModalOpen(false)}
        title={editingPump ? "Edit Pump" : "Add Pump"}
        onSubmit={handleSavePump} submitLabel={savingPump ? "Saving..." : "Save"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Pump Number *</Label><Input type="number" min={1} value={pumpForm.pumpNumber || ""} onChange={e => setQ("pumpNumber", +e.target.value)} /></div>
          <div><Label>Pump Name *</Label><Input value={pumpForm.name} onChange={e => setQ("name", e.target.value)} placeholder="e.g. Pump A, Island 1" /></div>
          <div className="col-span-2">
            <Label>Linked Tank</Label>
            <Select value={pumpForm.tankId} onValueChange={v => setQ("tankId", v)}>
              <SelectTrigger><SelectValue placeholder="Select tank (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No tank (unlinked)</SelectItem>
                {tanks.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.fuelType}) — {t.currentLevel.toLocaleString()}L
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Nozzles</Label><Input type="number" min={1} value={pumpForm.nozzles || ""} onChange={e => setQ("nozzles", +e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={pumpForm.status} onValueChange={v => setQ("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      {/* View Product */}
      <ModalForm open={!!viewingProd} onClose={() => setViewingProd(null)} title="Product Details" isView>
        {viewingProd && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Fuel Type:</span> {viewingProd.fuelType}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewingProd.isActive ? "active" : "inactive"} /></div>
            <div><span className="text-muted-foreground">Buying:</span> Ksh {viewingProd.buyingPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Marked:</span> Ksh {viewingProd.markedPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Selling:</span> Ksh {viewingProd.sellingPrice.toFixed(2)}</div>
            <div><span className="text-muted-foreground">Margin:</span> <span className="text-green-600">{margin(viewingProd)}%</span></div>
            <div><span className="text-muted-foreground">Reorder:</span> {viewingProd.reorderLevel.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Supplier:</span> {viewingProd.supplier || "—"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
