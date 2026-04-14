import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface PayrollRecord {
  id: string;
  employeeName: string;
  department: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: string;
  payDate: string;
}

const fmt = (n: number) => `Ksh ${n.toLocaleString()}`;

const mockData: PayrollRecord[] = [
  { id: "PAY-001", employeeName: "James Mwangi", department: "Fuel", month: "2026-03", basicSalary: 35000, allowances: 5000, deductions: 3500, netPay: 36500, status: "paid", payDate: "2026-03-28" },
  { id: "PAY-002", employeeName: "Grace Wanjiku", department: "LPG", month: "2026-03", basicSalary: 55000, allowances: 10000, deductions: 8000, netPay: 57000, status: "paid", payDate: "2026-03-28" },
  { id: "PAY-003", employeeName: "Peter Ochieng", department: "Car Wash", month: "2026-04", basicSalary: 28000, allowances: 3000, deductions: 2500, netPay: 28500, status: "pending", payDate: "" },
  { id: "PAY-004", employeeName: "Mary Akinyi", department: "Water", month: "2026-04", basicSalary: 40000, allowances: 6000, deductions: 4000, netPay: 42000, status: "processing", payDate: "" },
  { id: "PAY-005", employeeName: "David Kimani", department: "Automotive", month: "2026-04", basicSalary: 38000, allowances: 5000, deductions: 3800, netPay: 39200, status: "pending", payDate: "" },
];

const columns: Column<PayrollRecord>[] = [
  { key: "id", label: "Pay ID", sortable: true },
  { key: "employeeName", label: "Employee", sortable: true },
  { key: "department", label: "Department" },
  { key: "month", label: "Month", sortable: true },
  { key: "basicSalary", label: "Basic", render: (i) => fmt(i.basicSalary) },
  { key: "deductions", label: "Deductions", render: (i) => fmt(i.deductions) },
  { key: "netPay", label: "Net Pay", render: (i) => <span className="font-semibold">{fmt(i.netPay)}</span> },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "department", label: "Department", options: ["Fuel", "LPG", "Water", "Automotive", "Car Wash"].map((d) => ({ label: d, value: d })) },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Processing", value: "processing" }, { label: "Paid", value: "paid" }] },
];

export default function PayrollTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollRecord | null>(null);
  const [viewing, setViewing] = useState<PayrollRecord | null>(null);
  const [form, setForm] = useState({ employeeName: "", department: "Fuel", month: "", basicSalary: 0, allowances: 0, deductions: 0, status: "pending", payDate: "" });

  const netPay = form.basicSalary + form.allowances - form.deductions;

  const openNew = () => { setEditing(null); setForm({ employeeName: "", department: "Fuel", month: new Date().toISOString().slice(0, 7), basicSalary: 0, allowances: 0, deductions: 0, status: "pending", payDate: "" }); setModalOpen(true); };
  const openEdit = (item: PayrollRecord) => { setEditing(item); setForm({ employeeName: item.employeeName, department: item.department, month: item.month, basicSalary: item.basicSalary, allowances: item.allowances, deductions: item.deductions, status: item.status, payDate: item.payDate }); setModalOpen(true); };
  const handleSave = () => {
    const record = { ...form, netPay };
    if (editing) {
      setData((d) => d.map((i) => (i.id === editing.id ? { ...i, ...record } : i)));
    } else {
      setData((d) => [...d, { id: `PAY-${String(d.length + 1).padStart(3, "0")}`, ...record }]);
    }
    setModalOpen(false);
  };
  const handleDelete = (item: PayrollRecord) => setData((d) => d.filter((i) => i.id !== item.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payroll Processing</h3>
          <p className="text-sm text-muted-foreground">Process and track monthly payroll</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Payroll Entry</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["employeeName", "id"]} searchPlaceholder="Search payroll..." filters={filterOpts} onView={(item) => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Payroll" : "New Payroll Entry"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Save"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Employee</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} /></div>
          <div><Label>Department</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Fuel", "LPG", "Water", "Automotive", "Car Wash"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Month</Label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
          <div><Label>Basic Salary (Ksh)</Label><Input type="number" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: Number(e.target.value) })} /></div>
          <div><Label>Allowances (Ksh)</Label><Input type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: Number(e.target.value) })} /></div>
          <div><Label>Deductions (Ksh)</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} /></div>
          <div className="col-span-2 p-3 bg-muted/50 rounded-lg"><span className="text-sm text-muted-foreground">Net Pay:</span> <span className="font-bold text-lg">{fmt(netPay)}</span></div>
          {editing && (
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
          )}
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Payroll Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Pay ID:</span> {viewing.id}</div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
            <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
            <div><span className="text-muted-foreground">Month:</span> {viewing.month}</div>
            <div><span className="text-muted-foreground">Basic:</span> {fmt(viewing.basicSalary)}</div>
            <div><span className="text-muted-foreground">Allowances:</span> {fmt(viewing.allowances)}</div>
            <div><span className="text-muted-foreground">Deductions:</span> {fmt(viewing.deductions)}</div>
            <div><span className="text-muted-foreground">Net Pay:</span> <span className="font-bold">{fmt(viewing.netPay)}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Pay Date:</span> {viewing.payDate || "—"}</div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
