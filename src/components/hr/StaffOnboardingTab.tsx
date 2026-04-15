import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  kraPin: string;
  nhifNo: string;
  nssfNo: string;
  bankName: string;
  bankAccount: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
}

const mockData: Employee[] = [
  { id: "EMP-001", name: "James Mwangi", email: "james@isms.co.ke", phone: "0712345678", department: "Fuel", role: "Attendant", joinDate: "2025-01-15", status: "active", idNumber: "12345678", kraPin: "A001234567B", nhifNo: "1234567", nssfNo: "9876543", bankName: "Equity Bank", bankAccount: "0123456789", emergencyContact: "Jane Mwangi", emergencyPhone: "0711111111", notes: "" },
  { id: "EMP-002", name: "Grace Wanjiku", email: "grace@isms.co.ke", phone: "0723456789", department: "LPG", role: "Manager", joinDate: "2024-11-01", status: "active", idNumber: "23456789", kraPin: "B002345678C", nhifNo: "2345678", nssfNo: "8765432", bankName: "KCB", bankAccount: "9876543210", emergencyContact: "John Wanjiku", emergencyPhone: "0722222222", notes: "" },
  { id: "EMP-003", name: "Peter Ochieng", email: "peter@isms.co.ke", phone: "0734567890", department: "Car Wash", role: "Attendant", joinDate: "2025-03-10", status: "onboarding", idNumber: "34567890", kraPin: "", nhifNo: "", nssfNo: "", bankName: "", bankAccount: "", emergencyContact: "", emergencyPhone: "", notes: "Pending KRA PIN submission" },
  { id: "EMP-004", name: "Mary Akinyi", email: "mary@isms.co.ke", phone: "0745678901", department: "Water", role: "Technician", joinDate: "2024-06-20", status: "active", idNumber: "45678901", kraPin: "D004567890E", nhifNo: "4567890", nssfNo: "6543210", bankName: "Co-op Bank", bankAccount: "5432109876", emergencyContact: "Tom Akinyi", emergencyPhone: "0744444444", notes: "" },
  { id: "EMP-005", name: "David Kimani", email: "david@isms.co.ke", phone: "0756789012", department: "Automotive", role: "Technician", joinDate: "2025-02-01", status: "inactive", idNumber: "56789012", kraPin: "E005678901F", nhifNo: "5678901", nssfNo: "5432109", bankName: "NCBA", bankAccount: "1357924680", emergencyContact: "Susan Kimani", emergencyPhone: "0755555555", notes: "Resigned — final pay processed" },
];

const departments = ["Fuel", "LPG", "Water", "Automotive", "Car Wash"];
const roles = ["Attendant", "Technician", "Manager", "Accountant", "Supervisor", "Driver"];

const columns: Column<Employee>[] = [
  { key: "id", label: "Emp ID", sortable: true },
  { key: "name", label: "Full Name", sortable: true },
  { key: "department", label: "Department", render: (i) => <Badge variant="outline">{i.department}</Badge> },
  { key: "role", label: "Role" },
  { key: "joinDate", label: "Join Date", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status", render: (item) => <StatusBadge status={item.status} /> },
];

const filters: FilterOption[] = [
  { key: "department", label: "Department", options: departments.map(d => ({ label: d, value: d })) },
  { key: "role", label: "Role", options: roles.map(r => ({ label: r, value: r })) },
  { key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Onboarding", value: "onboarding" }, { label: "Inactive", value: "inactive" }] },
];

const emptyForm = { name: "", email: "", phone: "", department: "Fuel", role: "Attendant", joinDate: "", status: "onboarding", idNumber: "", kraPin: "", nhifNo: "", nssfNo: "", bankName: "", bankAccount: "", emergencyContact: "", emergencyPhone: "", notes: "" };

export default function StaffOnboardingTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);

  const stats = {
    total: data.length,
    active: data.filter(d => d.status === "active").length,
    onboarding: data.filter(d => d.status === "onboarding").length,
    inactive: data.filter(d => d.status === "inactive").length,
  };

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, joinDate: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const openEdit = (item: Employee) => { setEditing(item); setForm({ name: item.name, email: item.email, phone: item.phone, department: item.department, role: item.role, joinDate: item.joinDate, status: item.status, idNumber: item.idNumber, kraPin: item.kraPin, nhifNo: item.nhifNo, nssfNo: item.nssfNo, bankName: item.bankName, bankAccount: item.bankAccount, emergencyContact: item.emergencyContact, emergencyPhone: item.emergencyPhone, notes: item.notes }); setModalOpen(true); };
  const handleSave = () => {
    if (editing) {
      setData(d => d.map(i => (i.id === editing.id ? { ...i, ...form } : i)));
    } else {
      setData(d => [...d, { id: `EMP-${String(d.length + 1).padStart(3, "0")}`, ...form }]);
    }
    setModalOpen(false);
  };
  const handleDelete = (item: Employee) => setData(d => d.filter(i => i.id !== item.id));

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Staff Onboarding</h3>
          <p className="text-sm text-muted-foreground">Manage employee registration, documents & onboarding</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Staff", value: stats.total, color: "" },
          { label: "Active", value: stats.active, color: "text-green-600" },
          { label: "Onboarding", value: stats.onboarding, color: "text-amber-600" },
          { label: "Inactive", value: stats.inactive, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "email", "id", "idNumber"]} searchPlaceholder="Search employees..." filters={filters} onView={item => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Employee" : "New Employee"} description="Enter employee details for onboarding" onSubmit={handleSave} submitLabel={editing ? "Update" : "Register"}>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">Personal Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div><Label>ID Number *</Label><Input value={form.idNumber} onChange={e => set("idNumber", e.target.value)} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="07XX XXX XXX" /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Employment Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Department</Label>
              <Select value={form.department} onValueChange={v => set("department", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={v => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Join Date</Label><Input type="date" value={form.joinDate} onChange={e => set("joinDate", e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="onboarding">Onboarding</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Statutory & Bank Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>KRA PIN</Label><Input value={form.kraPin} onChange={e => set("kraPin", e.target.value)} placeholder="A001234567B" /></div>
            <div><Label>NHIF No.</Label><Input value={form.nhifNo} onChange={e => set("nhifNo", e.target.value)} /></div>
            <div><Label>NSSF No.</Label><Input value={form.nssfNo} onChange={e => set("nssfNo", e.target.value)} /></div>
            <div><Label>Bank Name</Label>
              <Select value={form.bankName || "none"} onValueChange={v => set("bankName", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select bank</SelectItem>
                  {["Equity Bank", "KCB", "Co-op Bank", "NCBA", "Stanbic", "Absa", "I&M Bank", "DTB", "Family Bank"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Bank Account No.</Label><Input value={form.bankAccount} onChange={e => set("bankAccount", e.target.value)} /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Emergency Contact</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Contact Name</Label><Input value={form.emergencyContact} onChange={e => set("emergencyContact", e.target.value)} /></div>
            <div><Label>Contact Phone</Label><Input value={form.emergencyPhone} onChange={e => set("emergencyPhone", e.target.value)} /></div>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional notes..." /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Employee Details" isView>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">{viewing.id}</Badge>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
              <div><span className="text-muted-foreground">ID Number:</span> {viewing.idNumber}</div>
              <div><span className="text-muted-foreground">Email:</span> {viewing.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {viewing.phone}</div>
              <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
              <div><span className="text-muted-foreground">Role:</span> {viewing.role}</div>
              <div><span className="text-muted-foreground">Join Date:</span> {viewing.joinDate}</div>
              <div><span className="text-muted-foreground">KRA PIN:</span> {viewing.kraPin || "—"}</div>
              <div><span className="text-muted-foreground">NHIF:</span> {viewing.nhifNo || "—"}</div>
              <div><span className="text-muted-foreground">NSSF:</span> {viewing.nssfNo || "—"}</div>
              <div><span className="text-muted-foreground">Bank:</span> {viewing.bankName || "—"}</div>
              <div><span className="text-muted-foreground">Account:</span> {viewing.bankAccount || "—"}</div>
              <div><span className="text-muted-foreground">Emergency:</span> {viewing.emergencyContact || "—"} ({viewing.emergencyPhone || "—"})</div>
              {viewing.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            </div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
