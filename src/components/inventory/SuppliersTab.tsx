import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  category: string;
  paymentTerms: string;
  status: string;
}

const initial: Supplier[] = [
  { id: "SUP-001", name: "Bidco Africa Ltd", contact: "Jane Mutua", phone: "0700123456", email: "orders@bidco.co.ke", category: "Groceries", paymentTerms: "Net 30", status: "active" },
  { id: "SUP-002", name: "Coca-Cola Beverages", contact: "Mark Otieno", phone: "0700234567", email: "trade@cocacola.co.ke", category: "Beverages", paymentTerms: "Net 14", status: "active" },
  { id: "SUP-003", name: "GlaxoSmithKline EA", contact: "Dr. Wairimu", phone: "0700345678", email: "ke-orders@gsk.com", category: "Pharmacy", paymentTerms: "Net 30", status: "active" },
];

const emptyForm: Omit<Supplier, "id"> = { name: "", contact: "", phone: "", email: "", category: "Groceries", paymentTerms: "Net 30", status: "active" };

export default function SuppliersTab() {
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);

  const columns: Column<Supplier>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Supplier" },
    { key: "contact", label: "Contact" },
    { key: "phone", label: "Phone" },
    { key: "category", label: "Category" },
    { key: "paymentTerms", label: "Terms" },
    { key: "status", label: "Status", render: s => <StatusBadge status={s.status} /> },
  ];

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm(s); setModalOpen(true); };
  const handleSave = () => {
    if (editing) setData(d => d.map(x => x.id === editing.id ? { ...x, ...form } : x));
    else setData(d => [...d, { id: `SUP-${String(d.length + 1).padStart(3, "0")}`, ...form }]);
    setModalOpen(false);
  };
  const handleDelete = (s: Supplier) => setData(d => d.filter(x => x.id !== s.id));
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Suppliers</h3>
          <p className="text-sm text-muted-foreground">Vendors supplying the sub-businesses</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Supplier</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: data.length },
          { label: "Active", value: data.filter(d => d.status === "active").length, color: "text-green-600" },
          { label: "Categories", value: new Set(data.map(d => d.category)).size, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "contact"]} searchPlaceholder="Search suppliers..." onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"} onSubmit={handleSave}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact} onChange={e => set("contact", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={e => set("category", e.target.value)} /></div>
            <div><Label>Payment Terms</Label><Input value={form.paymentTerms} onChange={e => set("paymentTerms", e.target.value)} /></div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
