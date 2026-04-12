import { useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  modules: string;
  lastLogin: string;
  status: string;
}

const initial: User[] = [
  { id: "USR-001", name: "John Kamau", email: "john@isms.co.ke", phone: "+254 700 111 111", role: "Admin", modules: "All", lastLogin: "2025-01-15 14:30", status: "active" },
  { id: "USR-002", name: "Grace Wanjiku", email: "grace@isms.co.ke", phone: "+254 700 222 222", role: "Manager", modules: "Fuel, LPG, Water", lastLogin: "2025-01-15 10:15", status: "active" },
  { id: "USR-003", name: "Peter Ochieng", email: "peter@isms.co.ke", phone: "+254 700 333 333", role: "Attendant", modules: "Fuel", lastLogin: "2025-01-15 08:00", status: "active" },
  { id: "USR-004", name: "Mary Akinyi", email: "mary@isms.co.ke", phone: "+254 700 444 444", role: "Accountant", modules: "Finance, Reports", lastLogin: "2025-01-14 16:45", status: "active" },
  { id: "USR-005", name: "David Mwangi", email: "david@isms.co.ke", phone: "+254 700 555 555", role: "Attendant", modules: "Car Wash", lastLogin: "2025-01-13 09:00", status: "inactive" },
];

const blank: Omit<User, "id"> = { name: "", email: "", phone: "", role: "Attendant", modules: "", lastLogin: "", status: "active" };

export function UsersTab() {
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: User } | null>(null);
  const [form, setForm] = useState<Omit<User, "id">>(blank);

  const openAdd = () => { setForm(blank); setModal({ mode: "add", item: {} as User }); };
  const openView = (u: User) => { setForm(u); setModal({ mode: "view", item: u }); };
  const openEdit = (u: User) => { setForm(u); setModal({ mode: "edit", item: u }); };
  const handleDelete = (u: User) => { setData(d => d.filter(x => x.id !== u.id)); toast.success("User removed"); };
  const handleSave = () => {
    if (modal?.mode === "add") {
      setData(d => [{ ...form, id: `USR-${String(d.length + 1).padStart(3, "0")}`, lastLogin: "—" }, ...d]);
      toast.success("User created");
    } else {
      setData(d => d.map(x => x.id === modal?.item.id ? { ...x, ...form } : x));
      toast.success("User updated");
    }
    setModal(null);
  };

  const columns: Column<User>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "modules", label: "Module Access" },
    { key: "lastLogin", label: "Last Login", sortable: true },
    { key: "status", label: "Status", render: u => <StatusBadge status={u.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "role", label: "Role", options: ["Admin", "Manager", "Attendant", "Accountant"].map(r => ({ label: r, value: r })) },
    { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
  ];

  const isView = modal?.mode === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">System Users</h3>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add User</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "email", "role"]} searchPlaceholder="Search users..." filters={filters} onView={openView} onEdit={openEdit} onDelete={handleDelete} />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={isView ? "User Details" : modal.mode === "add" ? "Add User" : "Edit User"} onSubmit={handleSave} isView={isView}>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} readOnly={isView} /></div>
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Admin", "Manager", "Attendant", "Accountant"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Module Access (comma-separated)</Label><Input value={form.modules} onChange={e => setForm(f => ({ ...f, modules: e.target.value }))} readOnly={isView} placeholder="e.g. Fuel, LPG, Water or All" /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={isView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            {isView && <div><Label>Last Login</Label><Input value={form.lastLogin} readOnly /></div>}
          </div>
        </ModalForm>
      )}
    </div>
  );
}
