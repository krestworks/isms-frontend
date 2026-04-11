import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Expense {
  id: string;
  date: string;
  module: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
  paymentMethod: string;
  approvedBy: string;
  status: string;
}

const modules = ["General", "Fuel", "LPG", "Water", "Automotive", "Car Wash"];
const expenseCategories = ["Fuel Purchase", "LPG Stock", "Utilities", "Salaries", "Maintenance", "Supplies", "Transport", "Rent", "Insurance", "Miscellaneous"];
const paymentMethods = ["Cash", "M-Pesa", "Bank Transfer", "Cheque"];

const demoData: Expense[] = [
  { id: "EXP-001", date: "2025-01-15", module: "Fuel", category: "Fuel Purchase", vendor: "KPC Supplies", description: "Diesel delivery 10,000L", amount: 1450000, paymentMethod: "Bank Transfer", approvedBy: "Admin", status: "paid" },
  { id: "EXP-002", date: "2025-01-14", module: "General", category: "Utilities", vendor: "KPLC", description: "Electricity bill - January", amount: 45000, paymentMethod: "M-Pesa", approvedBy: "Manager", status: "paid" },
  { id: "EXP-003", date: "2025-01-14", module: "LPG", category: "LPG Stock", vendor: "Total Gas", description: "13kg cylinders x50", amount: 175000, paymentMethod: "Bank Transfer", approvedBy: "Admin", status: "pending" },
  { id: "EXP-004", date: "2025-01-13", module: "General", category: "Salaries", vendor: "Staff Payroll", description: "January wages - 12 staff", amount: 360000, paymentMethod: "Bank Transfer", approvedBy: "Admin", status: "paid" },
  { id: "EXP-005", date: "2025-01-12", module: "Automotive", category: "Supplies", vendor: "AutoParts Kenya", description: "Brake pads, filters, oil", amount: 28000, paymentMethod: "Cash", approvedBy: "Manager", status: "paid" },
];

const columns: Column<Expense>[] = [
  { key: "id", label: "ID" },
  { key: "date", label: "Date", sortable: true },
  { key: "module", label: "Module" },
  { key: "category", label: "Category" },
  { key: "vendor", label: "Vendor" },
  { key: "amount", label: "Amount (Ksh)", sortable: true, render: (r) => `Ksh ${r.amount.toLocaleString()}` },
  { key: "paymentMethod", label: "Payment" },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "module", label: "Module", options: modules.map(m => ({ label: m, value: m })) },
  { key: "category", label: "Category", options: expenseCategories.map(c => ({ label: c, value: c })) },
];

export function ExpensesTab() {
  const [data, setData] = useState(demoData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item?: Expense } | null>(null);
  const [form, setForm] = useState<Partial<Expense>>({});

  const openAdd = () => { setForm({ date: new Date().toISOString().slice(0, 10), status: "pending" }); setModal({ mode: "add" }); };
  const openEdit = (item: Expense) => { setForm({ ...item }); setModal({ mode: "edit", item }); };
  const openView = (item: Expense) => { setForm({ ...item }); setModal({ mode: "view", item }); };
  const handleDelete = (item: Expense) => setData(d => d.filter(r => r.id !== item.id));

  const handleSubmit = () => {
    if (modal?.mode === "add") {
      setData(d => [...d, { ...form, id: `EXP-${String(d.length + 1).padStart(3, "0")}` } as Expense]);
    } else if (modal?.mode === "edit" && modal.item) {
      setData(d => d.map(r => r.id === modal.item!.id ? { ...r, ...form } as Expense : r));
    }
    setModal(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Log Expense</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["id", "vendor", "description"]} searchPlaceholder="Search expenses..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Log Expense" : modal.mode === "edit" ? "Edit Expense" : "Expense Details"} onClose={() => setModal(null)} onSubmit={handleSubmit} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Module</Label><Select value={form.module || ""} onValueChange={v => setForm(f => ({ ...f, module: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Category</Label><Select value={form.category || ""} onValueChange={v => setForm(f => ({ ...f, category: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Amount (Ksh)</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Vendor</Label><Input value={form.vendor || ""} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Payment Method</Label><Select value={form.paymentMethod || ""} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{paymentMethods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Approved By</Label><Input value={form.approvedBy || ""} onChange={e => setForm(f => ({ ...f, approvedBy: e.target.value }))} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label><Select value={form.status || ""} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={modal.mode === "view"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
