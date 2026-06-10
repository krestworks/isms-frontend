import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { hrApi, ApiEmployee, ApiPayroll } from "@/lib/hrApi";

const fmt = (n: number) => `Ksh ${n.toLocaleString()}`;

const emptyForm = {
  employeeId: "", month: "", basicSalary: 0, houseAllowance: 0,
  transportAllowance: 0, overtimePay: 0, nhif: 1700, nssf: 2160,
  paye: 0, otherDeductions: 0, status: "pending", payDate: "",
};

const columns: Column<ApiPayroll>[] = [
  { key: "id", label: "Pay ID", sortable: true },
  { key: "employeeId", label: "Employee", render: i => i.employee?.user.name ?? i.employeeId },
  { key: "employeeId", label: "Dept", render: i => i.employee?.department?.name ? <Badge variant="outline">{i.employee.department.name}</Badge> : <span className="text-muted-foreground">—</span> },
  { key: "month", label: "Month", sortable: true },
  { key: "grossPay", label: "Gross", render: i => fmt(i.grossPay) },
  { key: "totalDeductions", label: "Deductions", render: i => <span className="text-destructive">{fmt(i.totalDeductions)}</span> },
  { key: "netPay", label: "Net Pay", render: i => <span className="font-bold">{fmt(i.netPay)}</span> },
  { key: "status", label: "Status", render: i => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Processing", value: "processing" }, { label: "Paid", value: "paid" }] },
];

export default function PayrollTab() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [data, setData]           = useState<ApiPayroll[]>([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<ApiPayroll | null>(null);
  const [viewing, setViewing]     = useState<ApiPayroll | null>(null);
  const [form, setForm]           = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, empsRes] = await Promise.all([
        hrApi.payroll.list({ limit: 500 } as any),
        hrApi.employees.list({ limit: 200 } as any),
      ]);
      setData(payRes.data ?? []);
      setEmployees(empsRes.data ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grossPay       = form.basicSalary + form.houseAllowance + form.transportAllowance + form.overtimePay;
  const totalDeductions = form.nhif + form.nssf + form.paye + form.otherDeductions;
  const netPay         = grossPay - totalDeductions;

  const stats = {
    totalPayroll: data.reduce((s, d) => s + d.netPay, 0),
    pending:   data.filter(d => d.status === "pending").length,
    paid:      data.filter(d => d.status === "paid").length,
    processing: data.filter(d => d.status === "processing").length,
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, month: new Date().toISOString().slice(0, 7) });
    setModalOpen(true);
  };
  const openEdit = (item: ApiPayroll) => {
    setEditing(item);
    setForm({
      employeeId: item.employeeId, month: item.month,
      basicSalary: item.basicSalary, houseAllowance: item.houseAllowance,
      transportAllowance: item.transportAllowance, overtimePay: item.overtimePay,
      nhif: item.nhif, nssf: item.nssf, paye: item.paye,
      otherDeductions: item.otherDeductions, status: item.status,
      payDate: item.payDate ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeId) return toast.error("Select an employee");
    if (!form.month) return toast.error("Month is required");
    try {
      if (editing) {
        const res = await hrApi.payroll.update(editing.id, form);
        setData(d => d.map(i => i.id === editing.id ? res.data : i));
        toast.success("Payroll updated");
      } else {
        const res = await hrApi.payroll.create({ ...form, employeeId: form.employeeId, month: form.month });
        setData(d => [...d, res.data]);
        toast.success("Payroll entry created");
      }
      setModalOpen(false);
    } catch (e: any) {
      if (e?.message?.includes("409") || e?.message?.includes("duplicate") || e?.status === 409) {
        toast.error("A payroll record already exists for this employee and month");
      } else {
        toast.error(e?.message || "Save failed");
      }
    }
  };

  const handleDelete = async (item: ApiPayroll) => {
    try {
      await hrApi.payroll.remove(item.id);
      setData(d => d.filter(i => i.id !== item.id));
      toast.success("Payroll entry removed");
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payroll Processing</h3>
          <p className="text-sm text-muted-foreground">Process and track monthly payroll with full breakdown</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Entry</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Payroll</p><p className="text-xl font-bold">{fmt(stats.totalPayroll)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Processing</p><p className="text-2xl font-bold text-blue-600">{stats.processing}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-600">{stats.paid}</p></CardContent></Card>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["id", "employeeId", "month"]} searchPlaceholder="Search payroll…" filters={filterOpts} onView={item => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Payroll" : "New Payroll Entry"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Save"}>
        <div className="space-y-4">
          <div><Label>Employee *</Label>
            <Select value={form.employeeId} onValueChange={v => set("employeeId", v)} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user.name} — {e.employeeNumber}</SelectItem>)}</SelectContent>
            </Select>
            {editing && <p className="text-xs text-muted-foreground mt-1">Employee cannot be changed after creation.</p>}
          </div>
          <div><Label>Month *</Label><Input type="month" value={form.month} onChange={e => set("month", e.target.value)} disabled={!!editing} /></div>

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
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
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
              <Badge variant="outline" className="text-sm">{viewing.id}</Badge>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Employee:</span> {viewing.employee?.user.name ?? viewing.employeeId}</div>
              <div><span className="text-muted-foreground">Department:</span> {viewing.employee?.department?.name ?? "—"}</div>
              <div><span className="text-muted-foreground">Month:</span> {viewing.month}</div>
              <div><span className="text-muted-foreground">Pay Date:</span> {viewing.payDate ?? "—"}</div>
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
