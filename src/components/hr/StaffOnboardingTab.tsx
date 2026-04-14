import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  joinDate: string;
  status: string;
  idNumber: string;
}

const mockData: Employee[] = [
  { id: "EMP-001", name: "James Mwangi", email: "james@isms.co.ke", phone: "0712345678", department: "Fuel", role: "Attendant", joinDate: "2025-01-15", status: "active", idNumber: "12345678" },
  { id: "EMP-002", name: "Grace Wanjiku", email: "grace@isms.co.ke", phone: "0723456789", department: "LPG", role: "Manager", joinDate: "2024-11-01", status: "active", idNumber: "23456789" },
  { id: "EMP-003", name: "Peter Ochieng", email: "peter@isms.co.ke", phone: "0734567890", department: "Car Wash", role: "Attendant", joinDate: "2025-03-10", status: "onboarding", idNumber: "34567890" },
  { id: "EMP-004", name: "Mary Akinyi", email: "mary@isms.co.ke", phone: "0745678901", department: "Water", role: "Technician", joinDate: "2024-06-20", status: "active", idNumber: "45678901" },
  { id: "EMP-005", name: "David Kimani", email: "david@isms.co.ke", phone: "0756789012", department: "Automotive", role: "Technician", joinDate: "2025-02-01", status: "inactive", idNumber: "56789012" },
];

const columns: Column<Employee>[] = [
  { key: "id", label: "Emp ID", sortable: true },
  { key: "name", label: "Full Name", sortable: true },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "joinDate", label: "Join Date", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status", render: (item) => <StatusBadge status={item.status} /> },
];

const filters: FilterOption[] = [
  { key: "department", label: "Department", options: [{ label: "Fuel", value: "Fuel" }, { label: "LPG", value: "LPG" }, { label: "Water", value: "Water" }, { label: "Automotive", value: "Automotive" }, { label: "Car Wash", value: "Car Wash" }] },
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Onboarding", value: "onboarding" }, { label: "Inactive", value: "inactive" }] },
];

export default function StaffOnboardingTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", department: "Fuel", role: "Attendant", joinDate: "", status: "onboarding", idNumber: "" });

  const openNew = () => { setEditing(null); setForm({ name: "", email: "", phone: "", department: "Fuel", role: "Attendant", joinDate: new Date().toISOString().split("T")[0], status: "onboarding", idNumber: "" }); setModalOpen(true); };
  const openEdit = (item: Employee) => { setEditing(item); setForm({ name: item.name, email: item.email, phone: item.phone, department: item.department, role: item.role, joinDate: item.joinDate, status: item.status, idNumber: item.idNumber }); setModalOpen(true); };
  const handleSave = () => {
    if (editing) {
      setData((d) => d.map((i) => (i.id === editing.id ? { ...i, ...form } : i)));
    } else {
      setData((d) => [...d, { id: `EMP-${String(d.length + 1).padStart(3, "0")}`, ...form }]);
    }
    setModalOpen(false);
  };
  const handleDelete = (item: Employee) => setData((d) => d.filter((i) => i.id !== item.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Staff Onboarding</h3>
          <p className="text-sm text-muted-foreground">Manage employee registration and onboarding</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "email", "id"]} searchPlaceholder="Search employees..." filters={filters} onView={(item) => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Employee" : "New Employee"} description="Enter employee details" onSubmit={handleSave} submitLabel={editing ? "Update" : "Register"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>ID Number</Label><Input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Department</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Fuel", "LPG", "Water", "Automotive", "Car Wash"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Attendant", "Technician", "Manager", "Accountant"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Join Date</Label><Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="onboarding">Onboarding</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Employee Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">ID:</span> {viewing.id}</div>
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Email:</span> {viewing.email}</div>
            <div><span className="text-muted-foreground">Phone:</span> {viewing.phone}</div>
            <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
            <div><span className="text-muted-foreground">Role:</span> {viewing.role}</div>
            <div><span className="text-muted-foreground">ID Number:</span> {viewing.idNumber}</div>
            <div><span className="text-muted-foreground">Join Date:</span> {viewing.joinDate}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
