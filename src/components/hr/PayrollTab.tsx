import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PayrollRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  month: string;
  basicSalary: number;
  houseAllowance: number;
  transportAllowance: number;
  overtimePay: number;
  grossPay: number;
  nhif: number;
  nssf: number;
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  payDate: string;
}

const fmt = (n: number) => `Ksh ${n.toLocaleString()}`;

const mockData: PayrollRecord[] = [
  { id: "PAY-001", employeeName: "James Mwangi", employeeId: "EMP-001", department: "Fuel", month: "2026-03", basicSalary: 35000, houseAllowance: 5000, transportAllowance: 3000, overtimePay: 2000, grossPay: 45000, nhif: 1700, nssf: 2160, paye: 5400, otherDeductions: 0, totalDeductions: 9260, netPay: 35740, status: "paid", payDate: "2026-03-28" },
  { id: "PAY-002", employeeName: "Grace Wanjiku", employeeId: "EMP-002", department: "LPG", month: "2026-03", basicSalary: 55000, houseAllowance: 8000, transportAllowance: 5000, overtimePay: 0, grossPay: 68000, nhif: 1700, nssf: 2160, paye: 12600, otherDeductions: 500, totalDeductions: 16960, netPay: 51040, status: "paid", payDate: "2026-03-28" },
  { id: "PAY-003", employeeName: "Peter Ochieng", employeeId: "EMP-003", department: "Car Wash", month: "2026-04", basicSalary: 28000, houseAllowance: 3000, transportAllowance: 2000, overtimePay: 1500, grossPay: 34500, nhif: 1700, nssf: 2160, paye: 3900, otherDeductions: 0, totalDeductions: 7760, netPay: 26740, status: "pending", payDate: "" },
  { id: "PAY-004", employeeName: "Mary Akinyi", employeeId: "EMP-004", department: "Water", month: "2026-04", basicSalary: 40000, houseAllowance: 6000, transportAllowance: 3000, overtimePay: 0, grossPay: 49000, nhif: 1700, nssf: 2160, paye: 7200, otherDeductions: 0, totalDeductions: 11060, netPay: 37940, status: "processing", payDate: "" },
  { id: "PAY-005", employeeName: "David Kimani", employeeId: "EMP-005", department: "Automotive", month: "2026-04", basicSalary: 38000, houseAllowance: 5000, transportAllowance: 3000, overtimePay: 3000, grossPay: 49000, nhif: 1700, nssf: 2160, paye: 7200, otherDeductions: 0, totalDeductions: 11060, netPay: 37940, status: "pending", payDate: "" },
];

const departments = ["Fuel", "LPG", "Water", "Automotive", "Car Wash"];

const columns: Column<PayrollRecord>[] = [
  { key: "id", label: "Pay ID", sortable: true },
  { key: "employeeName", label: "Employee", sortable: true },
  { key: "department", label: "Dept", render: (i) => <Badge variant="outline">{i.department}</Badge> },
  { key: "month", label: "Month", sortable: true },
  { key: "grossPay", label: "Gross", render: (i) => fmt(i.grossPay) },
  { key: "totalDeductions", label: "Deductions", render: (i) => <span className="text-destructive">{fmt(i.totalDeductions)}</span> },
  { key: "netPay", label: "Net Pay", render: (i) => <span className="font-bold">{fmt(i.netPay)}</span> },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "department", label: "Department", options: departments.map(d => ({ label: d, value: d })) },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Processing", value: "processing" }, { label: "Paid", value: "paid" }] },
];

export default function PayrollTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollRecord | null>(null);
  const [viewing, setViewing] = useState<PayrollRecord | null>(null);
  const [form, setForm] = useState({ employeeName: "", employeeId: "", department: "Fuel", month: "", basicSalary: 0, houseAllowance: 0, transportAllowance: 0, overtimePay: 0, nhif: 1700, nssf: 2160, paye: 0, otherDeductions: 0, status: "pending", payDate: "" });

  const grossPay = form.basicSalary + form.houseAllowance + form.transportAllowance + form.overtimePay;
  const totalDeductions = form.nhif + form.nssf + form.paye + form.otherDeductions;
  const netPay = grossPay - totalDeductions;

  const stats = {
    totalPayroll: data.reduce((s, d) => s + d.netPay, 0),
    pending: data.filter(d => d.status === "pending").length,
    paid: data.filter(d => d.status === "paid").length,
    processing: data.filter(d => d.status === "processing").length,
  };

  const openNew = () => { setEditing(null); setForm({ employeeName: "", employeeId: "", department: "Fuel", month: new Date().toISOString().slice(0, 7), basicSalary: 0, houseAllowance: 0, transportAllowance: 0, overtimePay: 0, nhif: 1700, nssf: 2160, paye: 0, otherDeductions: 0, status: "pending", payDate: "" }); setModalOpen(true); };
  const openEdit = (item: PayrollRecord) => { setEditing(item); setForm({ employeeName: item.employeeName, employeeId: item.employeeId, department: item.department, month: item.month, basicSalary: item.basicSalary, houseAllowance: item.houseAllowance, transportAllowance: item.transportAllowance, overtimePay: item.overtimePay, nhif: item.nhif, nssf: item.nssf, paye: item.paye, otherDeductions: item.otherDeductions, status: item.status, payDate: item.payDate }); setModalOpen(true); };

  const handleSave = () => {
    const record = { ...form, grossPay, totalDeductions, netPay };
    if (editing) {
      setData(d => d.map(i => (i.id === editing.id ? { ...i, ...record } : i)));
    } else {
      setData(d => [...d, { id: `PAY-${String(d.length + 1).padStart(3, "0")}`, ...record }]);
    }
    setModalOpen(false);
  };
  const handleDelete = (item: PayrollRecord) => setData(d => d.filter(i => i.id !== item.id));
  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payroll Processing</h3>
          <p className="text-sm text-muted-foreground">Process and track monthly payroll with full breakdown</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Payroll Entry</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Payroll</p><p className="text-xl font-bold">{fmt(stats.totalPayroll)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Processing</p><p className="text-2xl font-bold text-blue-600">{stats.processing}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-600">{stats.paid}</p></CardContent></Card>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["employeeName", "id", "employeeId"]} searchPlaceholder="Search payroll..." filters={filterOpts} onView={item => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Payroll" : "New Payroll Entry"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Save"}>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">Employee</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Employee Name *</Label><Input value={form.employeeName} onChange={e => set("employeeName", e.target.value)} /></div>
            <div><Label>Employee ID</Label><Input value={form.employeeId} onChange={e => set("employeeId", e.target.value)} placeholder="EMP-XXX" /></div>
            <div><Label>Department</Label>
              <Select value={form.department} onValueChange={v => set("department", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Month</Label><Input type="month" value={form.month} onChange={e => set("month", e.target.value)} /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Earnings</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Basic Salary (Ksh)</Label><Input type="number" value={form.basicSalary} onChange={e => set("basicSalary", Number(e.target.value))} /></div>
            <div><Label>House Allowance (Ksh)</Label><Input type="number" value={form.houseAllowance} onChange={e => set("houseAllowance", Number(e.target.value))} /></div>
            <div><Label>Transport Allowance (Ksh)</Label><Input type="number" value={form.transportAllowance} onChange={e => set("transportAllowance", Number(e.target.value))} /></div>
            <div><Label>Overtime Pay (Ksh)</Label><Input type="number" value={form.overtimePay} onChange={e => set("overtimePay", Number(e.target.value))} /></div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg flex justify-between">
            <span className="text-sm text-muted-foreground">Gross Pay:</span>
            <span className="font-bold">{fmt(grossPay)}</span>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Deductions</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>NHIF (Ksh)</Label><Input type="number" value={form.nhif} onChange={e => set("nhif", Number(e.target.value))} /></div>
            <div><Label>NSSF (Ksh)</Label><Input type="number" value={form.nssf} onChange={e => set("nssf", Number(e.target.value))} /></div>
            <div><Label>PAYE (Ksh)</Label><Input type="number" value={form.paye} onChange={e => set("paye", Number(e.target.value))} /></div>
            <div><Label>Other Deductions (Ksh)</Label><Input type="number" value={form.otherDeductions} onChange={e => set("otherDeductions", Number(e.target.value))} /></div>
          </div>
          <div className="p-3 bg-destructive/10 rounded-lg flex justify-between">
            <span className="text-sm text-muted-foreground">Total Deductions:</span>
            <span className="font-bold text-destructive">{fmt(totalDeductions)}</span>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">NET PAY:</span>
            <span className="text-2xl font-bold">{fmt(netPay)}</span>
          </div>

          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Pay Date</Label><Input type="date" value={form.payDate} onChange={e => set("payDate", e.target.value)} /></div>
            </div>
          )}
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Payroll Details" isView>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">{viewing.id} — {viewing.employeeId}</Badge>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
              <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
              <div><span className="text-muted-foreground">Month:</span> {viewing.month}</div>
              <div><span className="text-muted-foreground">Pay Date:</span> {viewing.payDate || "—"}</div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">EARNINGS</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Basic Salary</span><span className="text-right">{fmt(viewing.basicSalary)}</span>
                <span className="text-muted-foreground">House Allowance</span><span className="text-right">{fmt(viewing.houseAllowance)}</span>
                <span className="text-muted-foreground">Transport Allowance</span><span className="text-right">{fmt(viewing.transportAllowance)}</span>
                <span className="text-muted-foreground">Overtime</span><span className="text-right">{fmt(viewing.overtimePay)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-sm"><span>Gross Pay</span><span>{fmt(viewing.grossPay)}</span></div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">DEDUCTIONS</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">NHIF</span><span className="text-right">{fmt(viewing.nhif)}</span>
                <span className="text-muted-foreground">NSSF</span><span className="text-right">{fmt(viewing.nssf)}</span>
                <span className="text-muted-foreground">PAYE</span><span className="text-right">{fmt(viewing.paye)}</span>
                <span className="text-muted-foreground">Other</span><span className="text-right">{fmt(viewing.otherDeductions)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-sm text-destructive"><span>Total Deductions</span><span>{fmt(viewing.totalDeductions)}</span></div>
            </div>
            <div className="rounded-lg bg-primary/10 p-4 flex justify-between items-center">
              <span className="text-sm font-medium">Net Pay</span>
              <span className="text-2xl font-bold">{fmt(viewing.netPay)}</span>
            </div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
