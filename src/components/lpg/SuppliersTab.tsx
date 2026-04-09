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

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  cylinderTypes: string;
  paymentTerms: string;
  rating: number;
  status: string;
  totalOrders: number;
  lastOrderDate: string;
}

const initialData: Supplier[] = [
  { id: "SP001", name: "Total Gas", contactPerson: "John Mwangi", phone: "+254 700 111 222", email: "gas@total.co.ke", address: "Industrial Area, Nairobi", cylinderTypes: "6kg, 13kg, 22.5kg, 25kg", paymentTerms: "Net 30", rating: 4.5, status: "active", totalOrders: 156, lastOrderDate: "2026-04-08" },
  { id: "SP002", name: "KenolKobil Gas", contactPerson: "Sarah Odhiambo", phone: "+254 700 333 444", email: "supply@kenolkobil.co.ke", address: "Mombasa Road, Nairobi", cylinderTypes: "6kg, 13kg", paymentTerms: "Net 14", rating: 4.2, status: "active", totalOrders: 98, lastOrderDate: "2026-04-07" },
  { id: "SP003", name: "Hashi Gas", contactPerson: "Ahmed Hassan", phone: "+254 700 555 666", email: "orders@hashigas.co.ke", address: "Eastleigh, Nairobi", cylinderTypes: "22.5kg, 50kg", paymentTerms: "COD", rating: 3.8, status: "active", totalOrders: 45, lastOrderDate: "2026-04-06" },
  { id: "SP004", name: "Pro Gas Ltd", contactPerson: "Jane Wambui", phone: "+254 700 777 888", email: "info@progas.co.ke", address: "Thika Road, Nairobi", cylinderTypes: "6kg, 13kg, 25kg", paymentTerms: "Net 30", rating: 4.0, status: "inactive", totalOrders: 23, lastOrderDate: "2026-02-15" },
];

const emptyForm: Omit<Supplier, "id"> = { name: "", contactPerson: "", phone: "", email: "", address: "", cylinderTypes: "", paymentTerms: "Net 30", rating: 0, status: "active", totalOrders: 0, lastOrderDate: "" };

export function SuppliersTab() {
  const [data, setData] = useState<Supplier[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: Supplier | null } | null>(null);
  const [form, setForm] = useState<Omit<Supplier, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm(emptyForm); setModal({ mode: "create", item: null }); };
  const openEdit = (s: Supplier) => { setForm({ ...s }); setModal({ mode: "edit", item: s }); };
  const openView = (s: Supplier) => { setForm({ ...s }); setModal({ mode: "view", item: s }); };

  const handleSave = () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      setData([...data, { ...form, id: `SP${String(data.length + 1).padStart(3, "0")}` }]);
      toast({ title: "Supplier Added" });
    } else if (modal?.mode === "edit" && modal.item) {
      setData(data.map((d) => (d.id === modal.item!.id ? { ...modal.item!, ...form } : d)));
      toast({ title: "Supplier Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setData(data.filter((d) => d.id !== deleteConfirm.id));
      toast({ title: "Supplier Deleted" });
      setDeleteConfirm(null);
    }
  };

  const columns: Column<Supplier>[] = [
    { key: "name", label: "Company", sortable: true },
    { key: "contactPerson", label: "Contact" },
    { key: "phone", label: "Phone" },
    { key: "cylinderTypes", label: "Cylinder Types" },
    { key: "paymentTerms", label: "Terms" },
    { key: "rating", label: "Rating", sortable: true, render: (s) => <span className="font-mono">{"★".repeat(Math.round(s.rating))}{"☆".repeat(5 - Math.round(s.rating))} {s.rating}</span> },
    { key: "totalOrders", label: "Orders", sortable: true },
    { key: "lastOrderDate", label: "Last Order", sortable: true },
    { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage LPG cylinder suppliers</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Supplier</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "contactPerson", "phone", "cylinderTypes"]} searchPlaceholder="Search suppliers..." filters={filters}
        actions={(s) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(s)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "Add Supplier" : modal.mode === "edit" ? "Edit Supplier" : "Supplier Details"} onSubmit={modal.mode !== "view" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Company Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="col-span-2 space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Cylinder Types</Label><Input value={form.cylinderTypes} onChange={(e) => setForm({ ...form, cylinderTypes: e.target.value })} disabled={modal.mode === "view"} placeholder="6kg, 13kg, 22.5kg" /></div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="COD">COD</SelectItem><SelectItem value="Net 7">Net 7</SelectItem><SelectItem value="Net 14">Net 14</SelectItem><SelectItem value="Net 30">Net 30</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Delete Supplier" onSubmit={handleDelete} submitLabel="Delete">
          <p className="text-sm text-muted-foreground">Delete supplier <strong>{deleteConfirm.name}</strong>?</p>
        </ModalForm>
      )}
    </div>
  );
}
