import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Revenue {
  id: string;
  date: string;
  module: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  status: string;
}

const modules = ["Fuel", "LPG", "Water", "Automotive", "Car Wash"];
const categories = ["Product Sales", "Service Revenue", "Delivery Charges", "Deposits", "Refill Income"];
const paymentMethods = ["Cash", "M-Pesa", "Card", "Bank Transfer", "Credit"];

const demoData: Revenue[] = [
  { id: "REV-001", date: "2025-01-15", module: "Fuel", category: "Product Sales", description: "Diesel sales - Pump 1", amount: 245000, paymentMethod: "Cash", reference: "TXN-8821", status: "completed" },
  { id: "REV-002", date: "2025-01-15", module: "LPG", category: "Refill Income", description: "6kg cylinder refills x12", amount: 18000, paymentMethod: "M-Pesa", reference: "TXN-8822", status: "completed" },
  { id: "REV-003", date: "2025-01-14", module: "Water", category: "Delivery Charges", description: "20L deliveries - Kilimani route", amount: 32000, paymentMethod: "Cash", reference: "TXN-8810", status: "pending" },
  { id: "REV-004", date: "2025-01-14", module: "Automotive", category: "Service Revenue", description: "Full service - KBZ 123A", amount: 8500, paymentMethod: "Card", reference: "TXN-8809", status: "completed" },
  { id: "REV-005", date: "2025-01-13", module: "Car Wash", category: "Product Sales", description: "Premium wash x8", amount: 12000, paymentMethod: "M-Pesa", reference: "TXN-8799", status: "completed" },
];

const columns: Column<Revenue>[] = [
  { key: "id", label: "ID" },
  { key: "date", label: "Date", sortable: true },
  { key: "module", label: "Module" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount (Ksh)", sortable: true, render: (r) => `Ksh ${r.amount.toLocaleString()}` },
  { key: "paymentMethod", label: "Payment" },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "module", label: "Module", options: modules.map(m => ({ label: m, value: m })) },
  { key: "status", label: "Status", options: [{ label: "Completed", value: "completed" }, { label: "Pending", value: "pending" }] },
];

export function RevenueTab() {
  const [data, setData] = useState(demoData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item?: Revenue } | null>(null);
  const [form, setForm] = useState<Partial<Revenue>>({});

  const openAdd = () => { setForm({ date: new Date().toISOString().slice(0, 10), status: "pending" }); setModal({ mode: "add" }); };
  const openEdit = (item: Revenue) => { setForm({ ...item }); setModal({ mode: "edit", item }); };
  const openView = (item: Revenue) => { setForm({ ...item }); setModal({ mode: "view", item }); };
  const handleDelete = (item: Revenue) => setData(d => d.filter(r => r.id !== item.id));

  const handleSubmit = () => {
    if (modal?.mode === "add") {
      setData(d => [...d, { ...form, id: `REV-${String(d.length + 1).padStart(3, "0")}` } as Revenue]);
    } else if (modal?.mode === "edit" && modal.item) {
      setData(d => d.map(r => r.id === modal.item!.id ? { ...r, ...form } as Revenue : r));
    }
    setModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Record Revenue</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["id", "description", "reference"]} searchPlaceholder="Search revenue..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Record Revenue" : modal.mode === "edit" ? "Edit Revenue" : "Revenue Details"} onClose={() => setModal(null)} onSubmit={handleSubmit} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Module</Label><Select value={form.module || ""} onValueChange={v => setForm(f => ({ ...f, module: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Category</Label><Select value={form.category || ""} onValueChange={v => setForm(f => ({ ...f, category: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Amount (Ksh)</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Payment Method</Label><Select value={form.paymentMethod || ""} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{paymentMethods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Reference</Label><Input value={form.reference || ""} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label><Select value={form.status || ""} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
