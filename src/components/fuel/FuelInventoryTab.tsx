import { useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";

interface FuelInventory {
  id: string;
  fuelType: string;
  currentStock: number;
  unit: string;
  buyingPrice: number;
  markedPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  supplier: string;
  supplierContact: string;
  lastRestockDate: string;
  status: string;
}

const initialData: FuelInventory[] = [
  { id: "FI001", fuelType: "Super", currentStock: 17400, unit: "Litres", buyingPrice: 155.0, markedPrice: 185.0, sellingPrice: 179.5, reorderLevel: 5000, supplier: "TotalEnergies Kenya", supplierContact: "+254 700 111 222", lastRestockDate: "2026-04-07", status: "active" },
  { id: "FI002", fuelType: "Diesel", currentStock: 4200, unit: "Litres", buyingPrice: 140.0, markedPrice: 172.0, sellingPrice: 165.0, reorderLevel: 5000, supplier: "Vivo Energy", supplierContact: "+254 700 333 444", lastRestockDate: "2026-04-05", status: "low" },
  { id: "FI003", fuelType: "Kerosene", currentStock: 12800, unit: "Litres", buyingPrice: 130.0, markedPrice: 162.0, sellingPrice: 155.0, reorderLevel: 3000, supplier: "TotalEnergies Kenya", supplierContact: "+254 700 111 222", lastRestockDate: "2026-04-06", status: "active" },
  { id: "FI004", fuelType: "V-Power", currentStock: 7500, unit: "Litres", buyingPrice: 170.0, markedPrice: 205.0, sellingPrice: 195.0, reorderLevel: 2000, supplier: "Shell Kenya", supplierContact: "+254 700 555 666", lastRestockDate: "2026-04-08", status: "active" },
];

const emptyForm: Omit<FuelInventory, "id"> = { fuelType: "", currentStock: 0, unit: "Litres", buyingPrice: 0, markedPrice: 0, sellingPrice: 0, reorderLevel: 0, supplier: "", supplierContact: "", lastRestockDate: "", status: "active" };

export function FuelInventoryTab() {
  const [data, setData] = useState<FuelInventory[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: FuelInventory | null } | null>(null);
  const [form, setForm] = useState<Omit<FuelInventory, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<FuelInventory | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm(emptyForm); setModal({ mode: "create", item: null }); };
  const openEdit = (i: FuelInventory) => { setForm({ ...i }); setModal({ mode: "edit", item: i }); };
  const openView = (i: FuelInventory) => { setForm({ ...i }); setModal({ mode: "view", item: i }); };

  const handleSave = () => {
    if (!form.fuelType) { toast({ title: "Error", description: "Fuel type is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      setData([...data, { ...form, id: `FI${String(data.length + 1).padStart(3, "0")}` }]);
      toast({ title: "Inventory Added" });
    } else if (modal?.mode === "edit" && modal.item) {
      setData(data.map((d) => (d.id === modal.item!.id ? { ...modal.item!, ...form } : d)));
      toast({ title: "Inventory Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setData(data.filter((d) => d.id !== deleteConfirm.id));
      toast({ title: "Item Deleted" });
      setDeleteConfirm(null);
    }
  };

  const margin = (i: FuelInventory) => ((i.sellingPrice - i.buyingPrice) / i.buyingPrice * 100).toFixed(1);

  const columns: Column<FuelInventory>[] = [
    { key: "id", label: "ID", sortable: true },
    { key: "fuelType", label: "Fuel Type", sortable: true },
    { key: "currentStock", label: "Stock (L)", sortable: true, render: (i) => i.currentStock.toLocaleString() },
    { key: "buyingPrice", label: "Buy (Ksh)", sortable: true, render: (i) => i.buyingPrice.toFixed(2) },
    { key: "markedPrice", label: "Marked (Ksh)", render: (i) => i.markedPrice.toFixed(2) },
    { key: "sellingPrice", label: "Sell (Ksh)", sortable: true, render: (i) => i.sellingPrice.toFixed(2) },
    { key: "margin", label: "Margin", render: (i) => <span className="text-success font-mono text-xs">{margin(i)}%</span> },
    { key: "supplier", label: "Supplier" },
    { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Low", value: "low" }, { label: "Critical", value: "critical" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage fuel inventory, pricing, and suppliers</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Item</Button>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["fuelType", "supplier"]} searchPlaceholder="Search inventory..." filters={filters}
        actions={(i) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(i)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(i)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "Add Inventory" : modal.mode === "edit" ? "Edit Inventory" : "Inventory Details"} onSubmit={modal.mode !== "view" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Fuel Type</Label><Input value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Current Stock (L)</Label><Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Buying Price (Ksh)</Label><Input type="number" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Marked Price (Ksh)</Label><Input type="number" value={form.markedPrice} onChange={(e) => setForm({ ...form, markedPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Selling Price (Ksh)</Label><Input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Reorder Level (L)</Label><Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Supplier Contact</Label><Input value={form.supplierContact} onChange={(e) => setForm({ ...form, supplierContact: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Last Restock</Label><Input type="date" value={form.lastRestockDate} onChange={(e) => setForm({ ...form, lastRestockDate: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}

      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Delete Item" onSubmit={handleDelete} submitLabel="Delete">
          <p className="text-sm text-muted-foreground">Delete <strong>{deleteConfirm.fuelType}</strong> inventory?</p>
        </ModalForm>
      )}
    </div>
  );
}
