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

interface Refill {
  id: string;
  date: string;
  batchNo: string;
  cylinderSize: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  supplier: string;
  receivedBy: string;
  status: string;
  notes: string;
}

const initialData: Refill[] = [
  { id: "RF001", date: "2026-04-08", batchNo: "B-2026-0089", cylinderSize: "13kg", quantity: 50, costPerUnit: 1800, totalCost: 90000, supplier: "Total Gas", receivedBy: "Alice Njeri", status: "completed", notes: "" },
  { id: "RF002", date: "2026-04-07", batchNo: "B-2026-0088", cylinderSize: "6kg", quantity: 100, costPerUnit: 800, totalCost: 80000, supplier: "KenolKobil Gas", receivedBy: "Brian Otieno", status: "completed", notes: "2 cylinders with dents" },
  { id: "RF003", date: "2026-04-06", batchNo: "B-2026-0087", cylinderSize: "22.5kg", quantity: 20, costPerUnit: 3200, totalCost: 64000, supplier: "Hashi Gas", receivedBy: "Alice Njeri", status: "completed", notes: "" },
  { id: "RF004", date: "2026-04-09", batchNo: "B-2026-0090", cylinderSize: "50kg", quantity: 10, costPerUnit: 8500, totalCost: 85000, supplier: "Hashi Gas", receivedBy: "Brian Otieno", status: "pending", notes: "Expected delivery 2pm" },
  { id: "RF005", date: "2026-04-05", batchNo: "B-2026-0086", cylinderSize: "25kg", quantity: 30, costPerUnit: 4000, totalCost: 120000, supplier: "Total Gas", receivedBy: "Alice Njeri", status: "completed", notes: "" },
];

const emptyForm: Omit<Refill, "id"> = { date: new Date().toISOString().split("T")[0], batchNo: "", cylinderSize: "13kg", quantity: 0, costPerUnit: 0, totalCost: 0, supplier: "", receivedBy: "", status: "pending", notes: "" };

export function RefillsTab() {
  const [data, setData] = useState<Refill[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: Refill | null } | null>(null);
  const [form, setForm] = useState<Omit<Refill, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Refill | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm({ ...emptyForm, batchNo: `B-2026-${String(90 + data.length + 1).padStart(4, "0")}` }); setModal({ mode: "create", item: null }); };
  const openEdit = (r: Refill) => { setForm({ ...r }); setModal({ mode: "edit", item: r }); };
  const openView = (r: Refill) => { setForm({ ...r }); setModal({ mode: "view", item: r }); };

  const updateForm = (u: Partial<Omit<Refill, "id">>) => {
    const next = { ...form, ...u };
    next.totalCost = next.quantity * next.costPerUnit;
    setForm(next);
  };

  const handleSave = () => {
    if (!form.supplier) { toast({ title: "Error", description: "Supplier is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      setData([{ ...form, id: `RF${String(data.length + 1).padStart(3, "0")}` }, ...data]);
      toast({ title: "Refill Recorded" });
    } else if (modal?.mode === "edit" && modal.item) {
      setData(data.map((d) => (d.id === modal.item!.id ? { ...modal.item!, ...form } : d)));
      toast({ title: "Refill Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setData(data.filter((d) => d.id !== deleteConfirm.id));
      toast({ title: "Refill Deleted" });
      setDeleteConfirm(null);
    }
  };

  const columns: Column<Refill>[] = [
    { key: "batchNo", label: "Batch #", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "cylinderSize", label: "Size", sortable: true },
    { key: "quantity", label: "Qty", sortable: true },
    { key: "costPerUnit", label: "Cost/Unit (Ksh)", render: (r) => r.costPerUnit.toLocaleString() },
    { key: "totalCost", label: "Total (Ksh)", sortable: true, render: (r) => <span className="font-mono">Ksh {r.totalCost.toLocaleString()}</span> },
    { key: "supplier", label: "Supplier" },
    { key: "receivedBy", label: "Received By" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "cylinderSize", label: "Size", options: ["6kg", "13kg", "22.5kg", "25kg", "50kg"].map((s) => ({ label: s, value: s })) },
    { key: "status", label: "Status", options: [{ label: "Completed", value: "completed" }, { label: "Pending", value: "pending" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track cylinder refills and deliveries from suppliers</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Record Refill</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["batchNo", "supplier", "receivedBy"]} searchPlaceholder="Search refills..." filters={filters}
        actions={(r) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(r)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "Record Refill" : modal.mode === "edit" ? "Edit Refill" : "Refill Details"} onSubmit={modal.mode !== "view" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Batch #</Label><Input value={form.batchNo} disabled className="font-mono" /></div>
            <div className="space-y-2">
              <Label>Cylinder Size</Label>
              <Select value={form.cylinderSize} onValueChange={(v) => updateForm({ cylinderSize: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["6kg", "13kg", "22.5kg", "25kg", "50kg"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => updateForm({ quantity: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Cost/Unit (Ksh)</Label><Input type="number" value={form.costPerUnit} onChange={(e) => updateForm({ costPerUnit: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Total Cost (Ksh)</Label><Input type="number" value={form.totalCost} disabled className="font-mono font-bold" /></div>
            <div className="space-y-2"><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => updateForm({ supplier: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Received By</Label><Input value={form.receivedBy} onChange={(e) => updateForm({ receivedBy: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateForm({ status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} disabled={modal.mode === "view"} /></div>
          </div>
        </ModalForm>
      )}
      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Delete Refill" onSubmit={handleDelete} submitLabel="Delete">
          <p className="text-sm text-muted-foreground">Delete refill <strong>{deleteConfirm.batchNo}</strong>?</p>
        </ModalForm>
      )}
    </div>
  );
}
