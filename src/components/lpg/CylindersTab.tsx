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

interface Cylinder {
  id: string;
  serialNo: string;
  size: string;
  weight: number;
  condition: string;
  status: string;
  buyingPrice: number;
  markedPrice: number;
  sellingPrice: number;
  supplier: string;
  lastRefillDate: string;
  location: string;
}

const sizes = ["6kg", "13kg", "22.5kg", "25kg", "50kg"];
const conditions = ["full", "empty", "damaged"];

const initialData: Cylinder[] = [
  { id: "CY001", serialNo: "LPG-6K-0012", size: "6kg", weight: 6, condition: "full", status: "available", buyingPrice: 800, markedPrice: 1200, sellingPrice: 1100, supplier: "KenolKobil Gas", lastRefillDate: "2026-04-08", location: "Main Yard" },
  { id: "CY002", serialNo: "LPG-6K-0013", size: "6kg", weight: 6, condition: "full", status: "available", buyingPrice: 800, markedPrice: 1200, sellingPrice: 1100, supplier: "KenolKobil Gas", lastRefillDate: "2026-04-08", location: "Main Yard" },
  { id: "CY003", serialNo: "LPG-13K-0045", size: "13kg", weight: 13, condition: "full", status: "available", buyingPrice: 1800, markedPrice: 2600, sellingPrice: 2400, supplier: "Total Gas", lastRefillDate: "2026-04-07", location: "Main Yard" },
  { id: "CY004", serialNo: "LPG-13K-0046", size: "13kg", weight: 13, condition: "empty", status: "available", buyingPrice: 1800, markedPrice: 2600, sellingPrice: 2400, supplier: "Total Gas", lastRefillDate: "2026-04-01", location: "Refill Bay" },
  { id: "CY005", serialNo: "LPG-22K-0021", size: "22.5kg", weight: 22.5, condition: "full", status: "available", buyingPrice: 3200, markedPrice: 4500, sellingPrice: 4200, supplier: "Hashi Gas", lastRefillDate: "2026-04-06", location: "Main Yard" },
  { id: "CY006", serialNo: "LPG-13K-0047", size: "13kg", weight: 13, condition: "damaged", status: "inactive", buyingPrice: 1800, markedPrice: 2600, sellingPrice: 2400, supplier: "Total Gas", lastRefillDate: "2026-03-20", location: "Repair Bay" },
  { id: "CY007", serialNo: "LPG-6K-0014", size: "6kg", weight: 6, condition: "empty", status: "available", buyingPrice: 800, markedPrice: 1200, sellingPrice: 1100, supplier: "KenolKobil Gas", lastRefillDate: "2026-03-28", location: "Refill Bay" },
  { id: "CY008", serialNo: "LPG-50K-0003", size: "50kg", weight: 50, condition: "full", status: "available", buyingPrice: 8500, markedPrice: 12000, sellingPrice: 11000, supplier: "Hashi Gas", lastRefillDate: "2026-04-05", location: "Main Yard" },
  { id: "CY009", serialNo: "LPG-25K-0009", size: "25kg", weight: 25, condition: "full", status: "available", buyingPrice: 4000, markedPrice: 5500, sellingPrice: 5200, supplier: "Total Gas", lastRefillDate: "2026-04-07", location: "Main Yard" },
  { id: "CY010", serialNo: "LPG-13K-0048", size: "13kg", weight: 13, condition: "full", status: "available", buyingPrice: 1800, markedPrice: 2600, sellingPrice: 2400, supplier: "KenolKobil Gas", lastRefillDate: "2026-04-08", location: "Main Yard" },
  { id: "CY011", serialNo: "LPG-6K-0015", size: "6kg", weight: 6, condition: "full", status: "available", buyingPrice: 800, markedPrice: 1200, sellingPrice: 1100, supplier: "KenolKobil Gas", lastRefillDate: "2026-04-09", location: "Main Yard" },
  { id: "CY012", serialNo: "LPG-22K-0022", size: "22.5kg", weight: 22.5, condition: "empty", status: "available", buyingPrice: 3200, markedPrice: 4500, sellingPrice: 4200, supplier: "Hashi Gas", lastRefillDate: "2026-03-30", location: "Refill Bay" },
];

const emptyForm: Omit<Cylinder, "id"> = { serialNo: "", size: "13kg", weight: 13, condition: "full", status: "available", buyingPrice: 0, markedPrice: 0, sellingPrice: 0, supplier: "", lastRefillDate: "", location: "Main Yard" };

export function CylindersTab() {
  const [data, setData] = useState<Cylinder[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: Cylinder | null } | null>(null);
  const [form, setForm] = useState<Omit<Cylinder, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Cylinder | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm(emptyForm); setModal({ mode: "create", item: null }); };
  const openEdit = (c: Cylinder) => { setForm({ ...c }); setModal({ mode: "edit", item: c }); };
  const openView = (c: Cylinder) => { setForm({ ...c }); setModal({ mode: "view", item: c }); };

  const handleSave = () => {
    if (!form.serialNo) { toast({ title: "Error", description: "Serial number is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      setData([...data, { ...form, id: `CY${String(data.length + 1).padStart(3, "0")}` }]);
      toast({ title: "Cylinder Added" });
    } else if (modal?.mode === "edit" && modal.item) {
      setData(data.map((d) => (d.id === modal.item!.id ? { ...modal.item!, ...form } : d)));
      toast({ title: "Cylinder Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setData(data.filter((d) => d.id !== deleteConfirm.id));
      toast({ title: "Cylinder Deleted" });
      setDeleteConfirm(null);
    }
  };

  // Summary cards
  const fullCount = data.filter((c) => c.condition === "full").length;
  const emptyCount = data.filter((c) => c.condition === "empty").length;
  const damagedCount = data.filter((c) => c.condition === "damaged").length;

  const columns: Column<Cylinder>[] = [
    { key: "serialNo", label: "Serial No.", sortable: true },
    { key: "size", label: "Size", sortable: true },
    { key: "condition", label: "Condition", render: (c) => <StatusBadge status={c.condition} /> },
    { key: "buyingPrice", label: "Buy (Ksh)", sortable: true, render: (c) => c.buyingPrice.toLocaleString() },
    { key: "sellingPrice", label: "Sell (Ksh)", sortable: true, render: (c) => c.sellingPrice.toLocaleString() },
    { key: "supplier", label: "Supplier" },
    { key: "lastRefillDate", label: "Last Refill", sortable: true },
    { key: "location", label: "Location" },
    { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "size", label: "Size", options: sizes.map((s) => ({ label: s, value: s })) },
    { key: "condition", label: "Condition", options: conditions.map((c) => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c })) },
    { key: "status", label: "Status", options: [{ label: "Available", value: "available" }, { label: "Inactive", value: "inactive" }] },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{fullCount}</p>
          <p className="text-xs text-muted-foreground">Full Cylinders</p>
        </div>
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{emptyCount}</p>
          <p className="text-xs text-muted-foreground">Empty Cylinders</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{damagedCount}</p>
          <p className="text-xs text-muted-foreground">Damaged</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track all cylinders: full, empty, damaged</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Cylinder</Button>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["serialNo", "supplier", "location"]} searchPlaceholder="Search cylinders..." filters={filters}
        actions={(c) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(c)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "Add Cylinder" : modal.mode === "edit" ? "Edit Cylinder" : "Cylinder Details"} onSubmit={modal.mode !== "view" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Serial No.</Label><Input value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{conditions.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Buying Price (Ksh)</Label><Input type="number" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Marked Price (Ksh)</Label><Input type="number" value={form.markedPrice} onChange={(e) => setForm({ ...form, markedPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Selling Price (Ksh)</Label><Input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Last Refill Date</Label><Input type="date" value={form.lastRefillDate} onChange={(e) => setForm({ ...form, lastRefillDate: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}

      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Delete Cylinder" onSubmit={handleDelete} submitLabel="Delete">
          <p className="text-sm text-muted-foreground">Delete cylinder <strong>{deleteConfirm.serialNo}</strong>?</p>
        </ModalForm>
      )}
    </div>
  );
}
