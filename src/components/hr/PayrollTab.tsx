import { useCallback, useEffect, useRef, useState } from "react";
import { Calculator, Download, Plus, Printer, RefreshCw } from "lucide-react";
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
import { brandingStore } from "@/data/brandingStore";
import { sessionStore } from "@/data/sessionStore";

const fmt = (n: number) => `Ksh ${Math.round(n).toLocaleString()}`;

// ── Kenya Statutory Tax Calculations ─────────────────────────────────────────

function calcSHA(gross: number): number {
  return Math.round(gross * 0.0275);
}

function calcNSSF(gross: number): number {
  const tier1 = Math.min(gross, 6000) * 0.06;
  const tier2 = Math.max(0, Math.min(gross, 18000) - 6000) * 0.06;
  return Math.round(tier1 + tier2);
}

function calcPAYE(gross: number, nssf: number): number {
  const taxable = gross - nssf;
  let paye = 0;
  if (taxable <= 24000) paye = taxable * 0.10;
  else if (taxable <= 32333) paye = 2400 + (taxable - 24000) * 0.25;
  else if (taxable <= 500000) paye = 4483 + (taxable - 32333) * 0.30;
  else if (taxable <= 800000) paye = 144642 + (taxable - 500000) * 0.325;
  else paye = 242142 + (taxable - 800000) * 0.35;
  const relief = 2400;
  return Math.max(0, Math.round(paye - relief));
}

const emptyForm = {
  employeeId: "", month: "", basicSalary: 0, houseAllowance: 0,
  transportAllowance: 0, overtimePay: 0,
  sha: 0, nssf: 0, paye: 0, otherDeductions: 0,
  status: "pending", payDate: "",
};

const LS_KEY = "hr_payroll_form";

function loadForm() {
  try { const s = localStorage.getItem(LS_KEY); if (s) return { ...emptyForm, ...JSON.parse(s) }; } catch { /* ignore */ }
  return emptyForm;
}

const columns: Column<ApiPayroll>[] = [
  { key: "id", label: "Pay ID", sortable: true, render: i => <span className="font-mono text-xs">{i.id.slice(-8).toUpperCase()}</span> },
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
  const [form, setForm]           = useState(loadForm);
  const slipRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, empsRes] = await Promise.all([
        hrApi.payroll.list({ limit: 500 } as any),
        hrApi.employees.list({ limit: 200, status: "Active" } as any),
      ]);
      setData(payRes.data ?? []);
      setEmployees(empsRes.data ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const gross         = form.basicSalary + form.houseAllowance + form.transportAllowance + form.overtimePay;
  const totalDeductions = form.sha + form.nssf + form.paye + form.otherDeductions;
  const netPay         = gross - totalDeductions;

  const set = (field: string, value: any) => {
    setForm(f => { const nf = { ...f, [field]: value }; try { localStorage.setItem(LS_KEY, JSON.stringify(nf)); } catch { /* ignore */ } return nf; });
  };

  const autoCalculate = () => {
    const sha  = calcSHA(gross);
    const nssf = calcNSSF(gross);
    const paye = calcPAYE(gross, nssf);
    setForm(f => { const nf = { ...f, sha, nssf, paye }; try { localStorage.setItem(LS_KEY, JSON.stringify(nf)); } catch { /* ignore */ } return nf; });
    toast.success("Statutory deductions calculated");
  };

  const stats = {
    totalPayroll: data.reduce((s, d) => s + d.netPay, 0),
    pending:    data.filter(d => d.status === "pending").length,
    paid:       data.filter(d => d.status === "paid").length,
    processing: data.filter(d => d.status === "processing").length,
  };

  const openNew = () => {
    setEditing(null);
    const emp = employees[0];
    const nf = { ...emptyForm, month: new Date().toISOString().slice(0, 7), employeeId: emp?.id || "" };
    if (emp?.basicSalary) {
      nf.basicSalary = emp.basicSalary;
    }
    setForm(nf);
    try { localStorage.setItem(LS_KEY, JSON.stringify(nf)); } catch { /* ignore */ }
    setModalOpen(true);
  };

  const openEdit = (item: ApiPayroll) => {
    setEditing(item);
    const nf = {
      employeeId: item.employeeId, month: item.month,
      basicSalary: item.basicSalary, houseAllowance: item.houseAllowance,
      transportAllowance: item.transportAllowance, overtimePay: item.overtimePay,
      sha: item.nhif, nssf: item.nssf, paye: item.paye,
      otherDeductions: item.otherDeductions, status: item.status,
      payDate: item.payDate ?? "",
    };
    setForm(nf);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeId) return toast.error("Select an employee");
    if (!form.month) return toast.error("Month is required");
    try {
      const payload = {
        employeeId: form.employeeId, month: form.month,
        basicSalary: form.basicSalary, houseAllowance: form.houseAllowance,
        transportAllowance: form.transportAllowance, overtimePay: form.overtimePay,
        nhif: form.sha, nssf: form.nssf, paye: form.paye,
        otherDeductions: form.otherDeductions,
        status: form.status, payDate: form.payDate || undefined,
      };
      if (editing) {
        const res = await hrApi.payroll.update(editing.id, payload);
        setData(d => d.map(i => i.id === editing.id ? res.data : i));
        toast.success("Payroll updated");
      } else {
        const res = await hrApi.payroll.create(payload as any);
        setData(d => [...d, res.data]);
        toast.success("Payroll entry created");
      }
      setModalOpen(false);
      localStorage.removeItem(LS_KEY);
    } catch (e: any) {
      if (e?.message?.includes("409") || e?.status === 409) {
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

  const handlePrint = () => {
    if (!slipRef.current || !viewing) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const b = brandingStore.get();
    const loc = sessionStore.activeLocation();
    const branch = loc !== "All Locations" ? loc : "";
    const brandHeader = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:14px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px">
          ${b?.logo ? `<img src="${b.logo}" style="height:56px;width:56px;object-fit:contain;border-radius:6px">` : ""}
          <div>
            <div style="font-size:17px;font-weight:700;color:#111">${b?.name ?? "ISMS"}</div>
            ${b?.tagline ? `<div style="font-size:11px;color:#666;margin-top:2px">${b.tagline}</div>` : ""}
            ${b?.address ? `<div style="font-size:11px;color:#666">${b.address}</div>` : ""}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:700;letter-spacing:1px;color:#111">PAYSLIP</div>
          ${branch ? `<div style="font-size:12px;color:#555;margin-top:4px">${branch}</div>` : ""}
          <div style="font-size:11px;color:#777;margin-top:2px">${viewing.month}</div>
          <div style="font-size:11px;color:#999">Ref: ${viewing.id.slice(-8).toUpperCase()}</div>
        </div>
      </div>`.replace(/\s{2,}/g, " ").trim();
    win.document.write(`<html><head><title>Payslip - ${viewing.month}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:16px}td,th{padding:6px 10px;border:1px solid #ddd;text-align:left}th{background:#f5f5f5}.right{text-align:right}</style>
    </head><body>${brandHeader}${slipRef.current.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleExportPayroll = () => {
    const rows = data.map(d => ({
      "Employee": d.employee?.user.name || d.employeeId,
      "Month": d.month,
      "Basic Salary": d.basicSalary,
      "House Allowance": d.houseAllowance,
      "Transport": d.transportAllowance,
      "Overtime": d.overtimePay,
      "Gross": d.grossPay,
      "SHA": d.nhif,
      "NSSF": d.nssf,
      "PAYE": d.paye,
      "Other Deductions": d.otherDeductions,
      "Total Deductions": d.totalDeductions,
      "Net Pay": d.netPay,
      "Status": d.status,
    }));
    if (!rows.length) return toast.error("No payroll records to export");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String((r as any)[h] ?? "")}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "payroll.csv"; a.click();
  };

  // When employee changes, prefill basic salary
  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    set("employeeId", empId);
    if (emp?.basicSalary && !editing) set("basicSalary", emp.basicSalary);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payroll Processing</h3>
          <p className="text-sm text-muted-foreground">Process and track monthly payroll with statutory deductions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPayroll}><Download className="h-4 w-4 mr-1" /> Export</Button>
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

      {/* Create / Edit */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Payroll" : "New Payroll Entry"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Save"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Employee *</Label>
              <Select value={form.employeeId || "_none_"} onValueChange={v => handleEmployeeChange(v === "_none_" ? "" : v)} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select —</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user.name} — {e.employeeNumber}</SelectItem>)}
                </SelectContent>
              </Select>
              {editing && <p className="text-xs text-muted-foreground mt-1">Employee cannot be changed after creation.</p>}
            </div>
            <div className="col-span-2"><Label>Month *</Label><Input type="month" value={form.month} onChange={e => set("month", e.target.value)} disabled={!!editing} /></div>
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
            <span className="font-bold">{fmt(gross)}</span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Statutory Deductions</p>
            <Button type="button" variant="outline" size="sm" onClick={autoCalculate} disabled={gross <= 0}>
              <Calculator className="h-3.5 w-3.5 mr-1.5" /> Auto-Calculate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">SHA = 2.75% of gross | NSSF = 6% (Tier I+II) | PAYE = graduated rates with Ksh 2,400 relief</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>SHA / Social Health (Ksh)</Label><Input type="number" value={form.sha} onChange={e => set("sha", Number(e.target.value))} /></div>
            <div><Label>NSSF (Ksh)</Label><Input type="number" value={form.nssf} onChange={e => set("nssf", Number(e.target.value))} /></div>
            <div><Label>PAYE Tax (Ksh)</Label><Input type="number" value={form.paye} onChange={e => set("paye", Number(e.target.value))} /></div>
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

      {/* View / Print Payslip */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Payslip" isView>
        {viewing && (
          <>
            <div ref={slipRef} className="space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  {brandingStore.get()?.logo && (
                    <img src={brandingStore.get()!.logo!} alt="" className="h-10 w-10 object-contain rounded" />
                  )}
                  <div>
                    <p className="font-bold text-sm">{brandingStore.get()?.name ?? "ISMS"}</p>
                    {brandingStore.get()?.tagline && <p className="text-xs text-muted-foreground">{brandingStore.get()?.tagline}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold tracking-wide">PAYSLIP</h2>
                  <p className="text-muted-foreground text-xs">Month: {viewing.month}</p>
                  <p className="text-muted-foreground text-xs">Ref: {viewing.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> {viewing.employee?.user.name ?? viewing.employeeId}</div>
                <div><span className="text-muted-foreground">Department:</span> {viewing.employee?.department?.name ?? "—"}</div>
                <div><span className="text-muted-foreground">Job Title:</span> {viewing.employee?.jobTitle?.title ?? "—"}</div>
                <div><span className="text-muted-foreground">Pay Date:</span> {viewing.payDate ?? "—"}</div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-3 py-2 border text-left">Earnings</th>
                    <th className="px-3 py-2 border text-right">Amount (Ksh)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Basic Salary", viewing.basicSalary],
                    ["House Allowance", viewing.houseAllowance],
                    ["Transport Allowance", viewing.transportAllowance],
                    ["Overtime Pay", viewing.overtimePay],
                  ].map(([l, v]) => (
                    <tr key={String(l)} className="border">
                      <td className="px-3 py-1.5 border">{l}</td>
                      <td className="px-3 py-1.5 border text-right">{fmt(Number(v))}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/20 border">
                    <td className="px-3 py-2 border">Gross Pay</td>
                    <td className="px-3 py-2 border text-right">{fmt(viewing.grossPay)}</td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-3 py-2 border text-left">Deductions</th>
                    <th className="px-3 py-2 border text-right">Amount (Ksh)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["SHA (Social Health Authority)", viewing.nhif],
                    ["NSSF", viewing.nssf],
                    ["PAYE Tax", viewing.paye],
                    ["Other Deductions", viewing.otherDeductions],
                  ].map(([l, v]) => (
                    <tr key={String(l)} className="border">
                      <td className="px-3 py-1.5 border">{l}</td>
                      <td className="px-3 py-1.5 border text-right">{fmt(Number(v))}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold text-destructive bg-destructive/5 border">
                    <td className="px-3 py-2 border">Total Deductions</td>
                    <td className="px-3 py-2 border text-right">{fmt(viewing.totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="rounded-lg bg-primary/10 p-4 flex justify-between items-center">
                <span className="font-medium">NET PAY</span>
                <span className="text-2xl font-bold">{fmt(viewing.netPay)}</span>
              </div>
              <div className="flex justify-between pt-4 border-t text-xs text-muted-foreground">
                <StatusBadge status={viewing.status} />
                <span>Generated: {new Date().toLocaleDateString("en-KE")}</span>
              </div>
            </div>
            <Button className="mt-3" variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Payslip
            </Button>
          </>
        )}
      </ModalForm>
    </div>
  );
}
