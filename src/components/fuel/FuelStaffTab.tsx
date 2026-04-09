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

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  shift: string;
  hireDate: string;
  status: string;
  salary: number;
}

const initialData: StaffMember[] = [
  { id: "ST001", name: "James Ochieng", role: "Senior Attendant", phone: "+254 712 345 678", shift: "Morning (6am-2pm)", hireDate: "2024-03-15", status: "on_duty", salary: 25000 },
  { id: "ST002", name: "Mary Wanjiku", role: "Attendant", phone: "+254 723 456 789", shift: "Afternoon (2pm-10pm)", hireDate: "2024-06-01", status: "on_duty", salary: 20000 },
  { id: "ST003", name: "Peter Mutua", role: "Attendant", phone: "+254 734 567 890", shift: "Morning (6am-2pm)", hireDate: "2025-01-10", status: "off_duty", salary: 20000 },
  { id: "ST004", name: "Grace Akinyi", role: "Attendant", phone: "+254 745 678 901", shift: "Night (10pm-6am)", hireDate: "2025-08-20", status: "on_duty", salary: 22000 },
  { id: "ST005", name: "David Kiprop", role: "Supervisor", phone: "+254 756 789 012", shift: "Morning (6am-2pm)", hireDate: "2023-11-05", status: "on_leave", salary: 35000 },
];

const emptyForm: Omit<StaffMember, "id"> = { name: "", role: "Attendant", phone: "", shift: "Morning (6am-2pm)", hireDate: "", status: "on_duty", salary: 0 };

export function FuelStaffTab() {
  const [data, setData] = useState<StaffMember[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; item: StaffMember | null } | null>(null);
  const [form, setForm] = useState<Omit<StaffMember, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);
  const { toast } = useToast();

  const openCreate = () => { setForm(emptyForm); setModal({ mode: "create", item: null }); };
  const openEdit = (i: StaffMember) => { setForm({ ...i }); setModal({ mode: "edit", item: i }); };
  const openView = (i: StaffMember) => { setForm({ ...i }); setModal({ mode: "view", item: i }); };

  const handleSave = () => {
    if (!form.name) { toast({ title: "Error", description: "Name is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      setData([...data, { ...form, id: `ST${String(data.length + 1).padStart(3, "0")}` }]);
      toast({ title: "Staff Added" });
    } else if (modal?.mode === "edit" && modal.item) {
      setData(data.map((d) => (d.id === modal.item!.id ? { ...modal.item!, ...form } : d)));
      toast({ title: "Staff Updated" });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setData(data.filter((d) => d.id !== deleteConfirm.id));
      toast({ title: "Staff Removed" });
      setDeleteConfirm(null);
    }
  };

  const columns: Column<StaffMember>[] = [
    { key: "id", label: "ID", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "role", label: "Role", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "shift", label: "Shift", sortable: true },
    { key: "salary", label: "Salary (Ksh)", sortable: true, render: (s) => `Ksh ${s.salary.toLocaleString()}` },
    { key: "hireDate", label: "Hire Date", sortable: true },
    { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "On Duty", value: "on_duty" }, { label: "Off Duty", value: "off_duty" }, { label: "On Leave", value: "on_leave" }] },
    { key: "shift", label: "Shift", options: [{ label: "Morning", value: "Morning (6am-2pm)" }, { label: "Afternoon", value: "Afternoon (2pm-10pm)" }, { label: "Night", value: "Night (10pm-6am)" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage fuel station staff and shift assignments</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Staff</Button>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "role", "phone"]} searchPlaceholder="Search staff..." filters={filters}
        actions={(s) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(s)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "Add Staff" : modal.mode === "edit" ? "Edit Staff" : "Staff Details"} onSubmit={modal.mode !== "view" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Attendant">Attendant</SelectItem>
                  <SelectItem value="Senior Attendant">Senior Attendant</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning (6am-2pm)">Morning (6am-2pm)</SelectItem>
                  <SelectItem value="Afternoon (2pm-10pm)">Afternoon (2pm-10pm)</SelectItem>
                  <SelectItem value="Night (10pm-6am)">Night (10pm-6am)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Salary (Ksh)</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Hire Date</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_duty">On Duty</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}

      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Remove Staff" onSubmit={handleDelete} submitLabel="Remove">
          <p className="text-sm text-muted-foreground">Remove <strong>{deleteConfirm.name}</strong> from fuel staff?</p>
        </ModalForm>
      )}
    </div>
  );
}
