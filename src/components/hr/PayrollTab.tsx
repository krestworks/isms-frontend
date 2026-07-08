import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { esc } from "@/lib/sanitize";
import {
  Calculator, ChevronLeft, ChevronRight, Download, FileText,
  Mail, Plus, Printer, RefreshCw, CheckCircle2, AlertCircle,
} from "lucide-react";
import PayrollBatchEntryPage from "./PayrollBatchEntryPage";
import PayrollCalculatorModal from "./PayrollCalculatorModal";
import { useSession } from "@/data/sessionStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { hrApi, ApiEmployee, ApiPayroll, ApiDepartment, ApiPayrollRunRow } from "@/lib/hrApi";
import { stationsApi, ApiStationFull } from "@/lib/stationsApi";
import { brandingStore } from "@/data/brandingStore";
import { sessionStore } from "@/data/sessionStore";
import { usePermissions } from "@/lib/permissions";

const fmt    = (n: number) => `Ksh ${Math.round(n).toLocaleString()}`;
const fmtNum = (n: number) => Math.round(n).toLocaleString();

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
  if (taxable <= 24000)       paye = taxable * 0.10;
  else if (taxable <= 32333)  paye = 2400   + (taxable - 24000)  * 0.25;
  else if (taxable <= 500000) paye = 4483   + (taxable - 32333)  * 0.30;
  else if (taxable <= 800000) paye = 144642 + (taxable - 500000) * 0.325;
  else                         paye = 242142 + (taxable - 800000) * 0.35;
  return Math.max(0, Math.round(paye - 2400));
}

// ── CSV Helpers ───────────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}
function buildCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvEscape).join(","), ...rows.map(r => r.map(csvEscape).join(","))].join("\n");
}
function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── Form Types ────────────────────────────────────────────────────────────────

const emptyForm = {
  employeeId: "", month: "", basicSalary: 0, houseAllowance: 0,
  transportAllowance: 0, overtimePay: 0, benefitInKind: 0,
  sha: 0, nssf: 0, paye: 0, otherDeductions: 0,
  status: "pending", payDate: "",
};

const LS_KEY = "hr_payroll_form";
function loadForm() {
  try { const s = localStorage.getItem(LS_KEY); if (s) return { ...emptyForm, ...JSON.parse(s) }; } catch { /**/ }
  return emptyForm;
}

// ── Table Columns (Records Tab) ───────────────────────────────────────────────

const columns: Column<ApiPayroll>[] = [
  { key: "id",         label: "Pay ID",   sortable: true, render: i => <span className="font-mono text-xs">{i.id.slice(-8).toUpperCase()}</span> },
  { key: "employeeId", label: "Employee", render: i => i.employee?.user?.name ?? i.employeeId },
  { key: "employeeId", label: "Dept",     render: i => i.employee?.department?.name
      ? <Badge variant="outline">{i.employee.department.name}</Badge>
      : <span className="text-muted-foreground">—</span> },
  { key: "month",          label: "Month",      sortable: true },
  { key: "grossPay",       label: "Gross",      render: i => fmt(i.grossPay) },
  { key: "totalDeductions",label: "Deductions", render: i => <span className="text-destructive">{fmt(i.totalDeductions)}</span> },
  { key: "netPay",         label: "Net Pay",    render: i => <span className="font-bold">{fmt(i.netPay)}</span> },
  { key: "status",         label: "Status",     render: i => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "status", label: "Status", options: [
    { label: "Pending",    value: "pending"    },
    { label: "Processing", value: "processing" },
    { label: "Paid",       value: "paid"       },
  ]},
];

// ─────────────────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 100;

export default function PayrollTab() {
  const can = usePermissions();
  const { activeLocation } = useSession();
  const slipRef = useRef<HTMLDivElement>(null);

  // ── Records tab ─────────────────────────────────────────────────────────────
  const [data, setData]           = useState<ApiPayroll[]>([]);
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterMonth, setFilterMonth]   = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");

  // Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<ApiPayroll | null>(null);
  const [viewing, setViewing]     = useState<ApiPayroll | null>(null);
  const [form, setForm]           = useState(loadForm);

  // Bulk status update modal
  const [bulkOpen, setBulkOpen]   = useState(false);
  const [bulkForm, setBulkForm]   = useState({ month: new Date().toISOString().slice(0, 7), status: "paid", payDate: "" });
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── Reference data ───────────────────────────────────────────────────────────
  const [employees,   setEmployees]   = useState<ApiEmployee[]>([]);
  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [stations,    setStations]    = useState<ApiStationFull[]>([]);
  const refLoadedRef = useRef(false);

  // ── Batch entry page ──────────────────────────────────────────────────────────
  const [batchView, setBatchView] = useState(false);
  const [calcOpen,  setCalcOpen]  = useState(false);

  // ── Run Payroll tab (process existing records) ────────────────────────────────
  const [procMonth,         setProcMonth]         = useState(new Date().toISOString().slice(0, 7));
  const [procData,          setProcData]          = useState<ApiPayroll[]>([]);
  const [procLoading,       setProcLoading]       = useState(false);
  const [procActionLoading, setProcActionLoading] = useState(false);
  const [procConfirm,       setProcConfirm]       = useState<"processing" | "paid" | null>(null);

  // ── Payslip email + settings ──────────────────────────────────────────────────
  const [sendingPayslip,   setSendingPayslip]   = useState(false);
  const [payrollSettings,  setPayrollSettings]  = useState<Record<string, string>>({});

  // ── Bulk Send Payslip modal ───────────────────────────────────────────────────
  const [sendSlipOpen,     setSendSlipOpen]     = useState(false);
  const [sendSlipMonth,    setSendSlipMonth]    = useState(new Date().toISOString().slice(0, 7));
  const [sendSlipScope,    setSendSlipScope]    = useState<"all" | "specific">("all");
  const [sendSlipEmpIds,   setSendSlipEmpIds]   = useState<string[]>([]);
  const [sendSlipSearch,   setSendSlipSearch]   = useState("");
  const [sendSlipLoading,  setSendSlipLoading]  = useState(false);

  // ── Reports tab ──────────────────────────────────────────────────────────────
  const [reportMonth,    setReportMonth]    = useState(new Date().toISOString().slice(0, 7));
  const [reportYear,     setReportYear]     = useState(String(new Date().getFullYear()));
  const [reportData,     setReportData]     = useState<ApiPayroll[]>([]);
  const [reportLoading,  setReportLoading]  = useState(false);
  const [varMonth1,      setVarMonth1]      = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7);
  });
  const [varMonth2,      setVarMonth2]      = useState(new Date().toISOString().slice(0, 7));
  const [varData1,       setVarData1]       = useState<ApiPayroll[]>([]);
  const [varData2,       setVarData2]       = useState<ApiPayroll[]>([]);
  const [varLoading,     setVarLoading]     = useState(false);

  // ── Load records ─────────────────────────────────────────────────────────────

  const loadRecords = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: PAGE_LIMIT };
      if (filterMonth)                             params.month  = filterMonth;
      if (filterStatus && filterStatus !== "__all__") params.status = filterStatus;
      const res = await hrApi.payroll.list(params as any);
      setData(res.data ?? []);
      setPage(res.meta?.page ?? 1);
      setTotalPages(res.meta?.pages ?? 1);
      setTotalCount(res.meta?.total ?? 0);
    } catch { /**/ }
    finally { setLoading(false); }
  }, [filterMonth, filterStatus]);

  // Load reference data (employees, departments, stations) once
  const loadRef = useCallback(async () => {
    if (refLoadedRef.current) return;
    refLoadedRef.current = true;
    try {
      const [eRes, dRes, sRes, psRes] = await Promise.all([
        hrApi.employees.list({ status: "Active", limit: 500 } as any),
        hrApi.setup.departments.list(),
        stationsApi.list(),
        hrApi.payrollSettings.get(),
      ]);
      setEmployees(eRes.data ?? []);
      setDepartments(dRes.data ?? []);
      setStations(sRes.data ?? []);
      setPayrollSettings(psRes.data ?? {});
    } catch (e) {
      refLoadedRef.current = false;
      // Also try to load employees alone in case only settings fails
      try {
        const eRes = await hrApi.employees.list({ status: "Active", limit: 500 } as any);
        setEmployees(eRes.data ?? []);
      } catch { /* silently fail */ }
    }
  }, []);

  useEffect(() => { loadRecords(1); loadRef(); }, [loadRecords, loadRef]);

  // ── Summary stats (current page) ─────────────────────────────────────────────
  const stats = {
    totalNet:   data.reduce((s, d) => s + d.netPay, 0),
    pending:    data.filter(d => d.status === "pending").length,
    paid:       data.filter(d => d.status === "paid").length,
    processing: data.filter(d => d.status === "processing").length,
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const set = (field: string, value: unknown) => {
    setForm(f => { const nf = { ...f, [field]: value }; try { localStorage.setItem(LS_KEY, JSON.stringify(nf)); } catch { /**/ } return nf; });
  };

  const gross          = form.basicSalary + form.houseAllowance + form.transportAllowance + form.overtimePay;
  const totalDeductions = form.sha + form.nssf + form.paye + form.otherDeductions;
  const netPay          = gross - totalDeductions;

  const autoCalculate = () => {
    const sha  = calcSHA(gross);
    const nssf = calcNSSF(gross);
    const paye = calcPAYE(gross, nssf, form.benefitInKind);
    setForm(f => { const nf = { ...f, sha, nssf, paye }; try { localStorage.setItem(LS_KEY, JSON.stringify(nf)); } catch { /**/ } return nf; });
    toast.success("Statutory deductions calculated");
  };

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    set("employeeId", empId);
    if (emp?.basicSalary && !editing) set("basicSalary", emp.basicSalary);
  };

  const openNew = () => {
    setEditing(null);
    const emp = employees[0];
    const nf = { ...emptyForm, month: new Date().toISOString().slice(0, 7), employeeId: emp?.id || "" };
    if (emp?.basicSalary) nf.basicSalary = emp.basicSalary;
    setForm(nf);
    try { localStorage.setItem(LS_KEY, JSON.stringify(nf)); } catch { /**/ }
    setModalOpen(true);
  };

  const openEdit = (item: ApiPayroll) => {
    setEditing(item);
    setForm({
      employeeId: item.employeeId, month: item.month,
      basicSalary: item.basicSalary, houseAllowance: item.houseAllowance,
      transportAllowance: item.transportAllowance, overtimePay: item.overtimePay,
      benefitInKind: item.benefitInKind ?? 0,
      sha: item.nhif, nssf: item.nssf, paye: item.paye,
      otherDeductions: item.otherDeductions, status: item.status, payDate: item.payDate ?? "",
    });
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
        benefitInKind: form.benefitInKind,
        nhif: form.sha, nssf: form.nssf, paye: form.paye,
        otherDeductions: form.otherDeductions, status: form.status,
        payDate: form.payDate || undefined,
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
      toast.error(e?.message?.includes("409") || e?.status === 409
        ? "A payroll record already exists for this employee and month"
        : e?.message || "Save failed");
    }
  };

  const handleDelete = async (item: ApiPayroll) => {
    if (item.status === "paid" || item.status === "processing") {
      toast.error("Cannot delete a submitted payroll record");
      return;
    }
    try {
      await hrApi.payroll.remove(item.id);
      setData(d => d.filter(i => i.id !== item.id));
      toast.success("Payroll entry removed");
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  // ── Bulk Status Update ────────────────────────────────────────────────────────

  const handleBulkStatusUpdate = async () => {
    if (!bulkForm.month) return toast.error("Month is required");
    if (!bulkForm.status) return toast.error("Select a status");
    setBulkLoading(true);
    try {
      const res = await hrApi.payroll.bulkUpdateStatus({
        month: bulkForm.month,
        status: bulkForm.status,
        payDate: bulkForm.payDate || undefined,
      });
      toast.success(res.message || `Records updated to "${bulkForm.status}"`);
      setBulkOpen(false);
      loadRecords(page);
    } catch (e: any) { toast.error(e?.message || "Update failed"); }
    finally { setBulkLoading(false); }
  };

  // ── Print payslip ─────────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!viewing) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const _b    = brandingStore.get();
    const b     = { ..._b, name: esc(_b?.name), tagline: esc(_b?.tagline), address: esc(_b?.address) };
    const loc   = sessionStore.activeLocation();
    const branch = esc(loc !== "All Locations" ? loc : "");
    const empKraPin  = esc(viewing.employee?.kraPin || "—");
    const empName    = esc(viewing.employee?.user?.name ?? viewing.employeeId);
    const empNo      = esc(viewing.employee?.employeeNumber ?? "—");
    const dept       = esc(viewing.employee?.department?.name ?? "—");
    const title      = esc(viewing.employee?.jobTitle?.title ?? "—");
    const erKraPin   = esc(payrollSettings.employerKraPin || "—");
    const fmtK = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

    win.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${viewing.month}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 0; margin: 0; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  .hdr-logo { display: flex; align-items: center; gap: 10px; }
  .hdr-logo img { height: 52px; width: 52px; object-fit: contain; border-radius: 5px; }
  .biz-name { font-size: 16px; font-weight: 700; color: #111; }
  .biz-sub { font-size: 10px; color: #555; margin-top: 2px; }
  .doc-title { font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #111; text-align: right; }
  .doc-sub { font-size: 10px; color: #666; text-align: right; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { border: 1px solid #ddd; padding: 5px 8px; font-size: 10.5px; }
  th { background: #f0f0f0; font-weight: 600; text-align: left; }
  .right { text-align: right; }
  .section-hdr td { background: #2563eb; color: #fff; font-weight: 700; font-size: 11px; padding: 6px 8px; border-color: #1d4ed8; }
  .subtotal td { background: #f0f4ff; font-weight: 700; border-top: 2px solid #aaa; }
  .deduct-tot td { background: #fff0f0; font-weight: 700; color: #b91c1c; border-top: 2px solid #aaa; }
  .net td { background: #1e3a5f; color: #fff; font-weight: 700; font-size: 14px; text-align: center; padding: 10px; border-color: #1e3a5f; }
  .footer { display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px; font-size: 10px; color: #777; }
</style></head><body>
<div class="hdr">
  <div class="hdr-logo">
    ${b?.logo ? `<img src="${b.logo}" alt="">` : ""}
    <div>
      <div class="biz-name">${b?.name || "ISMS"}</div>
      ${b?.tagline ? `<div class="biz-sub">${b.tagline}</div>` : ""}
      ${b?.address ? `<div class="biz-sub">${b.address}</div>` : ""}
      ${erKraPin !== "—" ? `<div class="biz-sub">Employer KRA PIN: ${erKraPin}</div>` : ""}
    </div>
  </div>
  <div>
    <div class="doc-title">PAYSLIP</div>
    ${branch ? `<div class="doc-sub">${branch}</div>` : ""}
    <div class="doc-sub">Period: ${viewing.month}</div>
    <div class="doc-sub">Ref: ${viewing.id.slice(-8).toUpperCase()}</div>
  </div>
</div>
<table>
  <tr><th>Employee Name</th><td>${empName}</td><th>Emp No.</th><td>${empNo}</td></tr>
  <tr><th>Department</th><td>${dept}</td><th>Job Title</th><td>${title}</td></tr>
  <tr><th>Employee KRA PIN</th><td>${empKraPin}</td><th>Pay Date</th><td>${viewing.payDate ?? "—"}</td></tr>
</table>
<table>
  <tr class="section-hdr"><td>EARNINGS</td><td class="right">Amount (KES)</td></tr>
  <tr><td>Basic Salary</td><td class="right">${fmtK(viewing.basicSalary)}</td></tr>
  ${viewing.houseAllowance > 0 ? `<tr><td>House Allowance</td><td class="right">${fmtK(viewing.houseAllowance)}</td></tr>` : ""}
  ${viewing.transportAllowance > 0 ? `<tr><td>Transport Allowance</td><td class="right">${fmtK(viewing.transportAllowance)}</td></tr>` : ""}
  ${viewing.overtimePay > 0 ? `<tr><td>Overtime Pay</td><td class="right">${fmtK(viewing.overtimePay)}</td></tr>` : ""}
  <tr class="subtotal"><td>GROSS PAY (Cash)</td><td class="right">${fmtK(viewing.grossPay)}</td></tr>
  ${(viewing.benefitInKind ?? 0) > 0 ? `<tr style="background:#fff8e1"><td>Benefit in Kind (non-cash, taxable)</td><td class="right">${fmtK(viewing.benefitInKind)}</td></tr>` : ""}
</table>
<table>
  <tr class="section-hdr"><td>DEDUCTIONS</td><td class="right">Amount (KES)</td></tr>
  ${viewing.nhif > 0 ? `<tr><td>SHA (Social Health Authority)</td><td class="right">${fmtK(viewing.nhif)}</td></tr>` : ""}
  ${viewing.nssf > 0 ? `<tr><td>NSSF</td><td class="right">${fmtK(viewing.nssf)}</td></tr>` : ""}
  ${viewing.paye > 0 ? `<tr><td>PAYE Tax</td><td class="right">${fmtK(viewing.paye)}</td></tr>` : ""}
  ${viewing.otherDeductions > 0 ? `<tr><td>Other Deductions</td><td class="right">${fmtK(viewing.otherDeductions)}</td></tr>` : ""}
  <tr class="deduct-tot"><td>TOTAL DEDUCTIONS</td><td class="right">${fmtK(viewing.totalDeductions)}</td></tr>
</table>
<table>
  <tr class="net"><td colspan="2">NET PAY: ${fmtK(viewing.netPay)}</td></tr>
</table>
<div class="footer">
  <span>Status: ${viewing.status.toUpperCase()}</span>
  <span>Generated: ${new Date().toLocaleDateString("en-KE")}</span>
  <span>This is a computer-generated payslip and requires no signature.</span>
</div>
</body></html>`);
    win.document.close();
    win.print();
  };

  // ── Send payslip by email ─────────────────────────────────────────────────────

  const handleSendPayslip = async () => {
    if (!viewing) return;
    setSendingPayslip(true);
    try {
      const res = await hrApi.payroll.sendPayslip(viewing.id);
      toast.success(res.message || "Payslip sent");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send payslip");
    } finally {
      setSendingPayslip(false);
    }
  };

  // ── Run Payroll tab (process existing records) ───────────────────────────────

  const loadProcBatch = async () => {
    if (!procMonth) return toast.error("Select a payroll month");
    setProcLoading(true);
    try {
      const res = await hrApi.payroll.list({ month: procMonth, limit: 1000 } as any);
      setProcData(res.data ?? []);
      setProcConfirm(null);
      if (!(res.data ?? []).length) toast.info("No payroll records found for that month");
    } catch (e: any) { toast.error(e?.message || "Failed to load batch"); }
    finally { setProcLoading(false); }
  };

  const handleRunBatch = async (targetStatus: "processing" | "paid") => {
    setProcActionLoading(true);
    try {
      const payDate = targetStatus === "paid" ? new Date().toISOString().slice(0, 10) : undefined;
      await hrApi.payroll.bulkUpdateStatus({ month: procMonth, status: targetStatus, ...(payDate ? { payDate } : {}) });
      toast.success(`Marked as ${targetStatus}`);
      await loadProcBatch();
      loadRecords(1);
    } catch (e: any) { toast.error(e?.message || "Failed to update status"); }
    finally { setProcActionLoading(false); setProcConfirm(null); }
  };

  // ── Bulk Send Payslips ────────────────────────────────────────────────────────

  const filteredSendSlipEmps = employees.filter(e =>
    !sendSlipSearch || (e.user?.name ?? "").toLowerCase().includes(sendSlipSearch.toLowerCase()) || e.employeeNumber?.includes(sendSlipSearch)
  ).slice(0, 100);

  const handleBulkSendPayslips = async () => {
    if (!sendSlipMonth) return toast.error("Select a month");
    setSendSlipLoading(true);
    try {
      const payload: { month: string; employeeIds?: string[] } = { month: sendSlipMonth };
      if (sendSlipScope === "specific" && sendSlipEmpIds.length) payload.employeeIds = sendSlipEmpIds;
      const res = await hrApi.payroll.bulkSendPayslips(payload);
      toast.success(res.message || `Sent ${res.sent} payslip(s)`);
      setSendSlipOpen(false);
      setSendSlipEmpIds([]);
    } catch (e: any) { toast.error(e?.message || "Failed to send payslips"); }
    finally { setSendSlipLoading(false); }
  };

  // ── Reports helpers ───────────────────────────────────────────────────────────

  const loadReportData = async (useYear = false) => {
    setReportLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 5000 };
      if (useYear) {
        // Fetch entire year — call for all 12 months (simplified: pass year as month prefix)
        params.month = reportYear;
      } else {
        params.month = reportMonth;
      }
      const res = await hrApi.payroll.list(params as any);
      setReportData(res.data ?? []);
      if ((res.data ?? []).length === 0) toast.info("No payroll records found for selected period");
    } catch (e: any) { toast.error(e?.message || "Failed to load report data"); }
    finally { setReportLoading(false); }
  };

  const downloadReport = (type: string) => {
    if (!reportData.length) { toast.error("Load data first"); return; }
    const period = reportData[0]?.month ?? reportMonth;

    switch (type) {
      case "master": {
        const hdrs = ["Emp No","Name","Department","Job Title","Month","Basic","House Allow","Transport","Overtime","Gross Pay","SHA","NSSF","PAYE","Other Deduct","Total Deduct","Net Pay","Status"];
        const rows = reportData.map(p => [
          p.employee?.employeeNumber ?? "—", p.employee?.user?.name ?? "—",
          p.employee?.department?.name ?? "—", p.employee?.jobTitle?.title ?? "—", p.month,
          p.basicSalary, p.houseAllowance, p.transportAllowance, p.overtimePay, p.grossPay,
          p.nhif, p.nssf, p.paye, p.otherDeductions, p.totalDeductions, p.netPay, p.status,
        ]);
        // Summary row
        const totGross  = reportData.reduce((s,r) => s + r.grossPay, 0);
        const totNet    = reportData.reduce((s,r) => s + r.netPay, 0);
        const totDed    = reportData.reduce((s,r) => s + r.totalDeductions, 0);
        rows.push(["","TOTALS","","","","","","","",totGross,"","","","",totDed,totNet,""]);
        downloadCsv(buildCsv(hdrs, rows), `master-payroll-${period}.csv`);
        break;
      }
      case "gross-to-net": {
        const hdrs = ["Emp No","Name","Gross Pay","SHA","NSSF","PAYE","Other Deductions","Total Deductions","Net Pay"];
        const rows = reportData.map(p => [
          p.employee?.employeeNumber ?? "—", p.employee?.user?.name ?? "—",
          p.grossPay, p.nhif, p.nssf, p.paye, p.otherDeductions, p.totalDeductions, p.netPay,
        ]);
        downloadCsv(buildCsv(hdrs, rows), `gross-to-net-${period}.csv`);
        break;
      }
      case "statutory": {
        const hdrs = ["Emp No","Name","Month","Gross Pay","SHA (2.75%)","NSSF Employee","PAYE","Total Statutory"];
        const rows = reportData.map(p => [
          p.employee?.employeeNumber ?? "—", p.employee?.user?.name ?? "—", p.month,
          p.grossPay, p.nhif, p.nssf, p.paye, p.nhif + p.nssf + p.paye,
        ]);
        // Statutory totals
        const tSHA  = reportData.reduce((s,r) => s + r.nhif, 0);
        const tNSSF = reportData.reduce((s,r) => s + r.nssf, 0);
        const tPAYE = reportData.reduce((s,r) => s + r.paye, 0);
        rows.push(["","TOTALS","",reportData.reduce((s,r) => s + r.grossPay,0), tSHA, tNSSF, tPAYE, tSHA+tNSSF+tPAYE]);
        downloadCsv(buildCsv(hdrs, rows), `statutory-deductions-${period}.csv`);
        break;
      }
      case "p9": {
        const hdrs = ["Emp No","Name","Month","Gross Pay","NSSF (Exempt)","Taxable Pay","PAYE Withheld","Personal Relief","Net PAYE"];
        const rows = reportData.map(p => [
          p.employee?.employeeNumber ?? "—", p.employee?.user?.name ?? "—", p.month,
          p.grossPay, p.nssf, p.grossPay - p.nssf, p.paye, 2400, p.paye,
        ]);
        downloadCsv(buildCsv(hdrs, rows), `p9-tax-certificate-${reportYear}.csv`);
        break;
      }
      case "disbursement": {
        const hdrs = ["Emp No","Name","Month","Net Pay","Status"];
        const rows = reportData.filter(p => p.status === "paid" || p.status === "processing").map(p => [
          p.employee?.employeeNumber ?? "—", p.employee?.user?.name ?? "—", p.month, p.netPay, p.status,
        ]);
        if (!rows.length) { toast.info("No paid/processing records to disburse"); return; }
        downloadCsv(buildCsv(hdrs, rows), `disbursement-list-${period}.csv`);
        break;
      }
      case "ledger": {
        const hdrs = ["Account Code","Account Name","Description","Debit","Credit","Department"];
        const byDept: Record<string, { gross: number; sha: number; nssf: number; paye: number; net: number }> = {};
        for (const p of reportData) {
          const d = p.employee?.department?.name ?? "General";
          if (!byDept[d]) byDept[d] = { gross: 0, sha: 0, nssf: 0, paye: 0, net: 0 };
          byDept[d].gross += p.grossPay;
          byDept[d].sha   += p.nhif;
          byDept[d].nssf  += p.nssf;
          byDept[d].paye  += p.paye;
          byDept[d].net   += p.netPay;
        }
        const rows: unknown[][] = [];
        for (const [dept, g] of Object.entries(byDept)) {
          rows.push(["6000","Salary Expense",  `Gross Payroll - ${period}`,  g.gross, "",      dept]);
          rows.push(["2200","SHA Payable",      `SHA - ${period}`,            "",      g.sha,   dept]);
          rows.push(["2201","NSSF Payable",     `NSSF - ${period}`,           "",      g.nssf,  dept]);
          rows.push(["2202","PAYE Payable",     `PAYE - ${period}`,           "",      g.paye,  dept]);
          rows.push(["2100","Salaries Payable", `Net Salary - ${period}`,     "",      g.net,   dept]);
        }
        downloadCsv(buildCsv(hdrs, rows), `gl-posting-${period}.csv`);
        break;
      }
      case "third-party": {
        const hdrs = ["Emp No","Name","Month","Other Deductions"];
        const rows = reportData.filter(p => p.otherDeductions > 0).map(p => [
          p.employee?.employeeNumber ?? "—", p.employee?.user?.name ?? "—", p.month, p.otherDeductions,
        ]);
        if (!rows.length) { toast.info("No third-party deductions found"); return; }
        downloadCsv(buildCsv(hdrs, rows), `third-party-deductions-${period}.csv`);
        break;
      }
      default: break;
    }
    toast.success("CSV downloaded");
  };

  // ── PDF report helper ─────────────────────────────────────────────────────────

  const downloadReportPdf = (type: string, landscape = false) => {
    if (!reportData.length) { toast.error("Load data first"); return; }
    const period = type === "p9" ? reportYear : (reportData[0]?.month ?? reportMonth);
    const _br = brandingStore.get();
    const b = { name: esc(_br?.name) || "ISMS", address: esc(_br?.address) };
    const erKraPin = esc(payrollSettings.employerKraPin || "");
    const brandHdr = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:14px">
      <div>
        <strong style="font-size:15px">${b.name}</strong>
        ${b.address ? `<br><span style="font-size:11px;color:#555">${b.address}</span>` : ""}
        ${erKraPin ? `<br><span style="font-size:11px;color:#555">KRA PIN: ${erKraPin}</span>` : ""}
      </div>
      <div style="text-align:right"><strong>${reportTitle(type)}</strong><br><span style="font-size:11px;color:#555">Period: ${period}</span></div>
    </div>`;

    const r = reportData;
    const fmtK = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
    let body = "";

    if (type === "sha") {
      const totalGross = r.reduce((s, x) => s + x.grossPay, 0);
      const totalSHA   = r.reduce((s, x) => s + x.nhif, 0);
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th>Month</th><th class="r">Gross Pay</th><th class="r">SHA (2.75%)</th></tr></thead><tbody>
        ${r.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td>${p.month}</td><td class="r">${fmtK(p.grossPay)}</td><td class="r">${fmtK(p.nhif)}</td></tr>`).join("")}
        <tr class="tot"><td colspan="4">TOTALS</td><td class="r">${fmtK(totalGross)}</td><td class="r">${fmtK(totalSHA)}</td></tr>
      </tbody></table>`;
    } else if (type === "nssf") {
      const tGross = r.reduce((s, x) => s + x.grossPay, 0);
      const tNSSF  = r.reduce((s, x) => s + x.nssf, 0);
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th>Month</th><th class="r">Gross Pay</th><th class="r">NSSF Employee</th></tr></thead><tbody>
        ${r.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td>${p.month}</td><td class="r">${fmtK(p.grossPay)}</td><td class="r">${fmtK(p.nssf)}</td></tr>`).join("")}
        <tr class="tot"><td colspan="4">TOTALS</td><td class="r">${fmtK(tGross)}</td><td class="r">${fmtK(tNSSF)}</td></tr>
      </tbody></table>`;
    } else if (type === "paye") {
      const tGross = r.reduce((s, x) => s + x.grossPay, 0);
      const tPAYE  = r.reduce((s, x) => s + x.paye, 0);
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th>KRA PIN</th><th>Month</th><th class="r">Gross Pay</th><th class="r">NSSF Relief</th><th class="r">Taxable Pay</th><th class="r">PAYE</th><th class="r">Personal Relief</th><th class="r">Net PAYE</th></tr></thead><tbody>
        ${r.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td>${p.employee?.kraPin ?? "—"}</td><td>${p.month}</td><td class="r">${fmtK(p.grossPay)}</td><td class="r">${fmtK(p.nssf)}</td><td class="r">${fmtK(p.grossPay - p.nssf)}</td><td class="r">${fmtK(p.paye + 2400)}</td><td class="r">${fmtK(2400)}</td><td class="r">${fmtK(p.paye)}</td></tr>`).join("")}
        <tr class="tot"><td colspan="5">TOTALS</td><td class="r">${fmtK(tGross)}</td><td class="r"></td><td class="r"></td><td class="r"></td><td class="r"></td><td class="r">${fmtK(tPAYE)}</td></tr>
      </tbody></table>`;
    } else if (type === "helb") {
      const rows = r.filter(p => p.otherDeductions > 0);
      if (!rows.length) { toast.info("No third-party/HELB deductions found"); return; }
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th>Month</th><th class="r">Other Deductions</th></tr></thead><tbody>
        ${rows.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td>${p.month}</td><td class="r">${fmtK(p.otherDeductions)}</td></tr>`).join("")}
        <tr class="tot"><td colspan="4">TOTALS</td><td class="r">${fmtK(rows.reduce((s,x) => s + x.otherDeductions, 0))}</td></tr>
      </tbody></table>`;
    } else if (type === "p9") {
      const yr = r.filter(p => p.month?.startsWith(reportYear));
      if (!yr.length) { toast.info(`No records found for ${reportYear} — load annual data first`); return; }
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th>Employee KRA PIN</th><th>Month</th><th class="r">Gross Pay</th><th class="r">NSSF (Exempt)</th><th class="r">Taxable Pay</th><th class="r">PAYE Withheld</th><th class="r">Personal Relief</th><th class="r">Net PAYE</th></tr></thead><tbody>
        ${yr.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td>${p.employee?.kraPin ?? "—"}</td><td>${p.month}</td><td class="r">${fmtK(p.grossPay)}</td><td class="r">${fmtK(p.nssf)}</td><td class="r">${fmtK(p.grossPay - p.nssf)}</td><td class="r">${fmtK(p.paye + 2400)}</td><td class="r">${fmtK(2400)}</td><td class="r">${fmtK(p.paye)}</td></tr>`).join("")}
      </tbody></table>`;
    } else if (type === "master") {
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th>Dept</th><th>Month</th><th class="r">Basic</th><th class="r">House Allow</th><th class="r">Transport</th><th class="r">OT</th><th class="r">Gross</th><th class="r">SHA</th><th class="r">NSSF</th><th class="r">PAYE</th><th class="r">Other</th><th class="r">Total Ded</th><th class="r">Net Pay</th></tr></thead><tbody>
        ${r.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td>${p.employee?.department?.name ?? "—"}</td><td>${p.month}</td><td class="r">${fmtK(p.basicSalary)}</td><td class="r">${fmtK(p.houseAllowance)}</td><td class="r">${fmtK(p.transportAllowance)}</td><td class="r">${fmtK(p.overtimePay)}</td><td class="r">${fmtK(p.grossPay)}</td><td class="r">${fmtK(p.nhif)}</td><td class="r">${fmtK(p.nssf)}</td><td class="r">${fmtK(p.paye)}</td><td class="r">${fmtK(p.otherDeductions)}</td><td class="r">${fmtK(p.totalDeductions)}</td><td class="r">${fmtK(p.netPay)}</td></tr>`).join("")}
        <tr class="tot"><td colspan="9">TOTALS</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.grossPay,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.nhif,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.nssf,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.paye,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.otherDeductions,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.totalDeductions,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.netPay,0))}</td></tr>
      </tbody></table>`;
    } else if (type === "gross-to-net") {
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th class="r">Gross Pay</th><th class="r">SHA</th><th class="r">NSSF</th><th class="r">PAYE</th><th class="r">Other</th><th class="r">Total Ded</th><th class="r">Net Pay</th></tr></thead><tbody>
        ${r.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td class="r">${fmtK(p.grossPay)}</td><td class="r">${fmtK(p.nhif)}</td><td class="r">${fmtK(p.nssf)}</td><td class="r">${fmtK(p.paye)}</td><td class="r">${fmtK(p.otherDeductions)}</td><td class="r">${fmtK(p.totalDeductions)}</td><td class="r">${fmtK(p.netPay)}</td></tr>`).join("")}
        <tr class="tot"><td colspan="3">TOTALS</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.grossPay,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.nhif,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.nssf,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.paye,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.otherDeductions,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.totalDeductions,0))}</td><td class="r">${fmtK(r.reduce((s,x)=>s+x.netPay,0))}</td></tr>
      </tbody></table>`;
    } else if (type === "disbursement") {
      const paid = r.filter(p => p.status === "paid" || p.status === "processing");
      if (!paid.length) { toast.info("No paid/processing records"); return; }
      body = `<table><thead><tr><th>#</th><th>Emp No</th><th>Name</th><th>Month</th><th class="r">Net Pay</th><th>Status</th></tr></thead><tbody>
        ${paid.map((p, i) => `<tr><td>${i+1}</td><td>${p.employee?.employeeNumber ?? "—"}</td><td>${p.employee?.user?.name ?? "—"}</td><td>${p.month}</td><td class="r">${fmtK(p.netPay)}</td><td>${p.status}</td></tr>`).join("")}
        <tr class="tot"><td colspan="4">TOTALS</td><td class="r">${fmtK(paid.reduce((s,x)=>s+x.netPay,0))}</td><td></td></tr>
      </tbody></table>`;
    } else if (type === "ledger") {
      const byDept: Record<string,{gross:number,sha:number,nssf:number,paye:number,net:number}> = {};
      for (const p of r) {
        const d = p.employee?.department?.name ?? "General";
        if (!byDept[d]) byDept[d] = {gross:0,sha:0,nssf:0,paye:0,net:0};
        byDept[d].gross += p.grossPay; byDept[d].sha += p.nhif; byDept[d].nssf += p.nssf; byDept[d].paye += p.paye; byDept[d].net += p.netPay;
      }
      body = `<table><thead><tr><th>Account Code</th><th>Account Name</th><th>Description</th><th class="r">Debit</th><th class="r">Credit</th><th>Department</th></tr></thead><tbody>
        ${Object.entries(byDept).flatMap(([dept, g]) => [
          `<tr><td>6000</td><td>Salary Expense</td><td>Gross Payroll - ${period}</td><td class="r">${fmtK(g.gross)}</td><td></td><td>${dept}</td></tr>`,
          `<tr><td>2200</td><td>SHA Payable</td><td>SHA - ${period}</td><td></td><td class="r">${fmtK(g.sha)}</td><td>${dept}</td></tr>`,
          `<tr><td>2201</td><td>NSSF Payable</td><td>NSSF - ${period}</td><td></td><td class="r">${fmtK(g.nssf)}</td><td>${dept}</td></tr>`,
          `<tr><td>2202</td><td>PAYE Payable</td><td>PAYE - ${period}</td><td></td><td class="r">${fmtK(g.paye)}</td><td>${dept}</td></tr>`,
          `<tr><td>2100</td><td>Salaries Payable</td><td>Net Salary - ${period}</td><td></td><td class="r">${fmtK(g.net)}</td><td>${dept}</td></tr>`,
        ]).join("")}
      </tbody></table>`;
    }

    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup blocked — allow popups to download PDF"); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>${reportTitle(type)} — ${period}</title>
      <style>
        @page { size: ${landscape ? "A4 landscape" : "A4"}; margin: 12mm 10mm; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; }
        th { background: #f0f0f0; font-weight: 600; white-space: nowrap; }
        .r { text-align: right; }
        .tot { font-weight: 700; background: #e8eaf0; }
      </style>
    </head><body>${brandHdr}${body}</body></html>`);
    win.document.close();
    win.print();
  };

  const reportTitle = (type: string) => ({
    sha: "SHA Schedule", nssf: "NSSF Schedule", paye: "PAYE Schedule",
    helb: "Third-Party Deductions (HELB/Other)", p9: "P9 Tax Certificates",
    master: "Master Payroll Register", "gross-to-net": "Gross-to-Net Summary",
    disbursement: "Disbursement List", ledger: "General Ledger Posting",
  }[type] ?? type);

  // ── Variance Report helpers ───────────────────────────────────────────────────

  const loadVarianceData = async () => {
    if (!varMonth1 || !varMonth2) return toast.error("Select both months");
    setVarLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        hrApi.payroll.list({ month: varMonth1, limit: 2000 } as any),
        hrApi.payroll.list({ month: varMonth2, limit: 2000 } as any),
      ]);
      setVarData1(r1.data ?? []);
      setVarData2(r2.data ?? []);
      if (!r1.data?.length && !r2.data?.length) toast.info("No records found for either month");
    } catch (e: any) { toast.error(e?.message || "Failed to load variance data"); }
    finally { setVarLoading(false); }
  };

  const downloadVariance = (format: "csv" | "pdf") => {
    if (!varData1.length && !varData2.length) { toast.error("Load variance data first"); return; }

    // Build employee map: key=employeeId, value={ m1: ..., m2: ... }
    const map = new Map<string, { name: string; empNo: string; dept: string; m1?: ApiPayroll; m2?: ApiPayroll }>();
    for (const p of varData1) {
      const key = p.employeeId;
      if (!map.has(key)) map.set(key, { name: p.employee?.user?.name ?? key, empNo: p.employee?.employeeNumber ?? "—", dept: p.employee?.department?.name ?? "—" });
      map.get(key)!.m1 = p;
    }
    for (const p of varData2) {
      const key = p.employeeId;
      if (!map.has(key)) map.set(key, { name: p.employee?.user?.name ?? key, empNo: p.employee?.employeeNumber ?? "—", dept: p.employee?.department?.name ?? "—" });
      map.get(key)!.m2 = p;
    }

    const rows = Array.from(map.values());
    const diff = (a?: number, b?: number) => (b ?? 0) - (a ?? 0);
    const pct  = (a?: number, b?: number) => a ? (((b ?? 0) - a) / a * 100).toFixed(1) + "%" : "—";

    if (format === "csv") {
      const hdrs = ["Emp No","Name","Dept",
        `Gross ${varMonth1}`, `Gross ${varMonth2}`, "Gross Variance", "Gross %",
        `Net ${varMonth1}`, `Net ${varMonth2}`, "Net Variance", "Net %",
        `PAYE ${varMonth1}`, `PAYE ${varMonth2}`, "PAYE Variance",
      ];
      const data = rows.map(r => [
        r.empNo, r.name, r.dept,
        r.m1?.grossPay ?? 0, r.m2?.grossPay ?? 0, diff(r.m1?.grossPay, r.m2?.grossPay), pct(r.m1?.grossPay, r.m2?.grossPay),
        r.m1?.netPay ?? 0, r.m2?.netPay ?? 0, diff(r.m1?.netPay, r.m2?.netPay), pct(r.m1?.netPay, r.m2?.netPay),
        r.m1?.paye ?? 0, r.m2?.paye ?? 0, diff(r.m1?.paye, r.m2?.paye),
      ]);
      downloadCsv(buildCsv(hdrs, data), `payroll-variance-${varMonth1}-vs-${varMonth2}.csv`);
      toast.success("Variance CSV downloaded");
    } else {
      const _bv = brandingStore.get();
      const b = { name: esc(_bv?.name) || "ISMS" };
      const fmtK = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
      const varRows = rows.map((r, i) => {
        const gDiff = diff(r.m1?.grossPay, r.m2?.grossPay);
        const nDiff = diff(r.m1?.netPay, r.m2?.netPay);
        const color = gDiff > 0 ? "#155724" : gDiff < 0 ? "#c00" : "";
        return `<tr>
          <td>${i+1}</td><td>${esc(r.empNo)}</td><td>${esc(r.name)}</td><td>${esc(r.dept)}</td>
          <td class="r">${fmtK(r.m1?.grossPay ?? 0)}</td><td class="r">${fmtK(r.m2?.grossPay ?? 0)}</td>
          <td class="r" style="color:${color}">${gDiff >= 0 ? "+" : ""}${fmtK(gDiff)}</td>
          <td class="r">${pct(r.m1?.grossPay, r.m2?.grossPay)}</td>
          <td class="r">${fmtK(r.m1?.netPay ?? 0)}</td><td class="r">${fmtK(r.m2?.netPay ?? 0)}</td>
          <td class="r" style="color:${nDiff >= 0 ? "#155724" : "#c00"}">${nDiff >= 0 ? "+" : ""}${fmtK(nDiff)}</td>
          <td class="r">${pct(r.m1?.netPay, r.m2?.netPay)}</td>
        </tr>`;
      }).join("");
      const win = window.open("", "_blank");
      if (!win) { toast.error("Popup blocked — allow popups"); return; }
      win.document.write(`<!DOCTYPE html><html><head><title>Payroll Variance</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Arial; font-size: 9px; }
  h2 { font-size: 13px; margin: 0 0 4px; } p { font-size: 10px; color: #555; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 3px 5px; }
  th { background: #f0f0f0; font-size: 8.5px; } .r { text-align: right; }
</style></head><body>
<h2>${b?.name || "ISMS"} — Payroll Variance Report</h2>
<p>Comparing ${varMonth1} vs ${varMonth2}</p>
<table><thead><tr>
  <th>#</th><th>Emp No</th><th>Name</th><th>Dept</th>
  <th>Gross ${varMonth1}</th><th>Gross ${varMonth2}</th><th>Gross Var</th><th>%</th>
  <th>Net ${varMonth1}</th><th>Net ${varMonth2}</th><th>Net Var</th><th>%</th>
</tr></thead><tbody>${varRows}</tbody></table>
</body></html>`);
      win.document.close();
      win.print();
    }
  };


  // ─────────────────────────────────────────────────────────────────────────────

  // ── Batch page override ───────────────────────────────────────────────────────
  if (batchView) {
    return (
      <PayrollBatchEntryPage
        onBack={() => setBatchView(false)}
        onSuccess={(month) => { setBatchView(false); setFilterMonth(month); loadRecords(1); }}
        employees={employees}
        departments={departments}
        stations={stations}
        activeLocation={activeLocation}
      />
    );
  }

  return (
    <div className="space-y-4">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Net (page)</p>
          <p className="text-xl font-bold">{fmt(stats.totalNet)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Processing</p>
          <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
        </CardContent></Card>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="records">
        <TabsList className="bg-muted/50 p-1 h-auto">
          <TabsTrigger value="records"  className="text-xs">Payroll Records</TabsTrigger>
          <TabsTrigger value="run"      className="text-xs">Run Payroll</TabsTrigger>
          <TabsTrigger value="reports"  className="text-xs">Reports & Downloads</TabsTrigger>
        </TabsList>

        {/* ── Records Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="records" className="space-y-3">
          {/* Filters & Actions */}
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <Label className="text-xs mb-1 block">Month</Label>
              <Input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }} className="h-8 text-xs w-36" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadRecords(page)} disabled={loading} className="h-8">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <div className="flex-1" />
            {can("hr.payroll.view") && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => { setSendSlipMonth(filterMonth || new Date().toISOString().slice(0,7)); setSendSlipScope("all"); setSendSlipEmpIds([]); setSendSlipOpen(true); }}>
                <Mail className="h-3.5 w-3.5 mr-1" /> Send Payslips
              </Button>
            )}
            {can("hr.payroll.process") && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => setBulkOpen(true)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Bulk Update Status
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCalcOpen(true)}>
              <Calculator className="h-3.5 w-3.5 mr-1" /> Payroll Calculator
            </Button>
            {can("hr.payroll.process") && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => { loadRef(); openNew(); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Single Entry
              </Button>
            )}
            {can("hr.payroll.process") && (
              <Button size="sm" className="h-8" onClick={() => { loadRef(); setBatchView(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Payroll Batch
              </Button>
            )}
          </div>

          <DataTable
            data={data}
            columns={columns}
            searchKeys={["id", "employeeId", "month"]}
            searchPlaceholder="Search payrollâ€¦"
            filters={filterOpts}
            onView={item => setViewing(item)}
            onEdit={can("hr.payroll.process") ? openEdit : undefined}
            onDelete={can("hr.payroll.process") ? handleDelete : undefined}
            pageSize={25}
          />

          {/* Server-side pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
              <span>{totalCount} records total · Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => loadRecords(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => loadRecords(page + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Run Payroll Tab (process & approve existing records) ─────────────── */}
        <TabsContent value="run" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Select a payroll month to load all records, then mark them as <strong>Processing</strong> or <strong>Paid</strong>.
            To create new payroll records go to the <strong>Records</strong> tab → <strong>New Payroll Batch</strong>.
          </p>

          {/* Month selector */}
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block">Payroll Month</Label>
              <Input type="month" value={procMonth} onChange={e => setProcMonth(e.target.value)} className="w-40 h-8 text-xs" />
            </div>
            <Button onClick={loadProcBatch} disabled={procLoading} size="sm" className="h-8">
              {procLoading ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Loadingâ€¦</> : "Load Batch"}
            </Button>
          </div>

          {procData.length > 0 && (
            <>
              {/* Summary cards */}
              <div className="flex gap-3 flex-wrap">
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{procData.filter(r => r.status === "pending").length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">{procData.filter(r => r.status === "processing").length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-green-600">{procData.filter(r => r.status === "paid").length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total Net Pay</p>
                  <p className="text-sm font-bold text-green-700">{fmt(procData.reduce((s, r) => s + r.netPay, 0))}</p>
                </CardContent></Card>
              </div>

              {/* Records table */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Employee</th>
                      <th className="px-3 py-2 text-left font-medium">Dept</th>
                      <th className="px-2 py-2 text-right font-medium">Gross</th>
                      <th className="px-2 py-2 text-right font-medium">Total Deductions</th>
                      <th className="px-2 py-2 text-right font-bold">Net Pay</th>
                      <th className="px-2 py-2 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procData.map(r => (
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-1.5">
                          <div className="font-medium">{r.employee?.user?.name ?? "—"}</div>
                          <div className="text-muted-foreground text-[10px]">{r.employee?.employeeNumber}</div>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.employee?.department?.name ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(r.grossPay)}</td>
                        <td className="px-2 py-1.5 text-right text-destructive">{fmt(r.totalDeductions)}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-primary">{fmt(r.netPay)}</td>
                        <td className="px-2 py-1.5 text-center"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirmation inline prompt */}
              {procConfirm && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Mark all <strong>{procData.filter(r => r.status === (procConfirm === "paid" ? "processing" : "pending")).length}</strong> record(s) as <strong>{procConfirm}</strong>?
                  <div className="flex-1" />
                  <Button size="sm" className="h-7" onClick={() => handleRunBatch(procConfirm)} disabled={procActionLoading}>
                    {procActionLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Confirm"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7" onClick={() => setProcConfirm(null)}>Cancel</Button>
                </div>
              )}

              {/* Action buttons */}
              {!procConfirm && (
                <div className="flex gap-3 pt-2 border-t flex-wrap">
                  {procData.some(r => r.status === "pending") && (
                    <Button variant="outline" size="sm" onClick={() => setProcConfirm("processing")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Mark Pending → Processing ({procData.filter(r => r.status === "pending").length})
                    </Button>
                  )}
                  {procData.some(r => r.status === "processing") && (
                    <Button size="sm" onClick={() => setProcConfirm("paid")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Mark Processing → Paid ({procData.filter(r => r.status === "processing").length})
                    </Button>
                  )}
                  {procData.every(r => r.status === "paid") && (
                    <p className="text-sm text-green-600 self-center font-medium">All {procData.length} records for {procMonth} are paid.</p>
                  )}
                </div>
              )}
            </>
          )}

          {procData.length === 0 && !procLoading && (
            <div className="py-10 text-center text-muted-foreground border rounded-lg">
              <p className="font-medium">No records loaded</p>
              <p className="text-xs mt-1">Select a month and click <strong>Load Batch</strong> to see payroll records.</p>
            </div>
          )}

        </TabsContent>

        {/* ── Reports Tab ───────────────────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-4">
          {/* Period selector */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Report Period</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <Label className="text-xs mb-1 block">Month (monthly reports)</Label>
                  <Input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="w-40 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Year (P9 annual)</Label>
                  <Select value={reportYear} onValueChange={setReportYear}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => loadReportData(false)} disabled={reportLoading}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${reportLoading ? "animate-spin" : ""}`} /> Load Monthly
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => loadReportData(true)} disabled={reportLoading}>
                    Load Annual (P9)
                  </Button>
                </div>
              </div>
              {reportData.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">{reportData.length} records loaded · Ksh {reportData.reduce((s,r) => s + r.grossPay, 0).toLocaleString()} gross payroll</p>
              )}
            </CardContent>
          </Card>

          {/* Helper: download row component */}
          {(() => {
            const Row = ({ type, label, desc, landscape = false, csvKey }: { type: string; label: string; desc: string; landscape?: boolean; csvKey?: string }) => (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadReport(csvKey ?? type)}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadReportPdf(type, landscape)}>
                    <Printer className="h-3 w-3" /> PDF
                  </Button>
                </div>
              </div>
            );

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payroll Registers */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Payroll Registers</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Row type="master"       csvKey="master"       label="Master Payroll Register" desc="All employees, all components" landscape />
                    <Row type="gross-to-net" csvKey="gross-to-net" label="Gross-to-Net Summary"    desc="Condensed earnings and deductions" />
                  </CardContent>
                </Card>

                {/* Statutory — individual */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Statutory Schedules</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Row type="sha"  csvKey="statutory" label="SHA Schedule"  desc="Social Health Authority (2.75% of gross)" />
                    <Row type="nssf" csvKey="statutory" label="NSSF Schedule" desc="National Social Security Fund (employee 6%)" />
                    <Row type="paye" csvKey="statutory" label="PAYE Schedule" desc="Pay As You Earn — KRA tax table" landscape />
                    <Row type="helb" csvKey="third-party" label="HELB / Other Deductions" desc="Third-party deductions schedule" />
                    <Row type="p9"   csvKey="p9"        label="P9 Tax Certificates" desc="Annual — load annual data first" landscape />
                  </CardContent>
                </Card>

                {/* Payment */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Payment & Disbursement</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Row type="disbursement" csvKey="disbursement" label="Disbursement List" desc="Paid/processing records for bank transfer" />
                  </CardContent>
                </Card>

                {/* GL */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Finance & General Ledger</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Row type="ledger" csvKey="ledger" label="General Ledger Posting" desc="Debit/credit journal entries by cost centre" landscape />
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Variance Report */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Payroll Variance Report</CardTitle>
              <p className="text-xs text-muted-foreground">Compare gross pay, net pay, and PAYE between two payroll periods</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <Label className="text-xs mb-1 block">Period 1 (base)</Label>
                  <Input type="month" value={varMonth1} onChange={e => setVarMonth1(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Period 2 (compare)</Label>
                  <Input type="month" value={varMonth2} onChange={e => setVarMonth2(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
                <Button variant="outline" size="sm" className="h-8" onClick={loadVarianceData} disabled={varLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${varLoading ? "animate-spin" : ""}`} />
                  Load Variance
                </Button>
              </div>
              {(varData1.length > 0 || varData2.length > 0) && (
                <div className="flex gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground self-center">{varData1.length} records in period 1 · {varData2.length} in period 2</p>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadVariance("csv")}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => downloadVariance("pdf")}>
                    <Printer className="h-3 w-3" /> PDF (Landscape)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <FileText className="h-4 w-4 shrink-0" />
            Individual payslips: click the eye icon on any record in the <strong>Records tab</strong> → Print or Send by email.
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────────── */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? "Edit Payroll" : "New Payroll Entry"}
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Save"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Employee *</Label>
              <Select value={form.employeeId || "_none_"} onValueChange={v => handleEmployeeChange(v === "_none_" ? "" : v)} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select —</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeNumber} — {e.employeeNumber}</SelectItem>)}
                </SelectContent>
              </Select>
              {editing && <p className="text-xs text-muted-foreground mt-1">Employee cannot be changed after creation.</p>}
            </div>
            <div className="col-span-2">
              <Label>Month *</Label>
              <Input type="month" value={form.month} onChange={e => set("month", e.target.value)} disabled={!!editing} />
            </div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Earnings</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Basic Salary (Ksh)</Label><Input type="number" value={form.basicSalary} onChange={e => set("basicSalary", Number(e.target.value))} /></div>
            <div><Label>House Allowance (Ksh)</Label><Input type="number" value={form.houseAllowance} onChange={e => set("houseAllowance", Number(e.target.value))} /></div>
            <div><Label>Transport Allowance (Ksh)</Label><Input type="number" value={form.transportAllowance} onChange={e => set("transportAllowance", Number(e.target.value))} /></div>
            <div><Label>Overtime Pay (Ksh)</Label><Input type="number" value={form.overtimePay} onChange={e => set("overtimePay", Number(e.target.value))} /></div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg flex justify-between">
            <span className="text-sm text-muted-foreground">Gross Pay (cash):</span>
            <span className="font-bold">{fmt(gross)}</span>
          </div>

          <div>
            <Label>Benefit in Kind / FBT (Ksh) <span className="text-muted-foreground font-normal text-xs">— non-cash benefit taxed on employer side</span></Label>
            <Input type="number" min={0} value={form.benefitInKind} onChange={e => set("benefitInKind", Number(e.target.value))} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Housing, vehicle use, loan subsidy, etc. Added to taxable income for PAYE only — not deducted from employee's cash net.</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Statutory Deductions</p>
            <Button type="button" variant="outline" size="sm" onClick={autoCalculate} disabled={gross <= 0}>
              <Calculator className="h-3.5 w-3.5 mr-1.5" /> Auto-Calculate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">SHA = 2.75% · NSSF = 6% (Tier I+II) · PAYE = graduated rates with Ksh 2,400 relief{form.benefitInKind > 0 ? ` · BIK ${fmt(form.benefitInKind)} added to taxable income` : ""}</p>
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
              <div>
                <Label>Status</Label>
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

      {/* ── View / Print Payslip ─────────────────────────────────────────────────── */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Payslip" isView>
        {viewing && (
          <>
            <div ref={slipRef} className="space-y-4">
              {/* Header — logo hidden here; print generates its own branded header */}
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <p className="font-bold text-sm">{brandingStore.get()?.name ?? "ISMS"}</p>
                  {payrollSettings.employerKraPin && (
                    <p className="text-xs text-muted-foreground">KRA PIN: {payrollSettings.employerKraPin}</p>
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-base font-bold tracking-wide">PAYSLIP</h2>
                  <p className="text-muted-foreground text-xs">Month: {viewing.month}</p>
                  <p className="text-muted-foreground text-xs">Ref: {viewing.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> {viewing.employee?.user?.name ?? viewing.employeeId}</div>
                <div><span className="text-muted-foreground">Emp No.:</span> {viewing.employee?.employeeNumber ?? "—"}</div>
                <div><span className="text-muted-foreground">Department:</span> {viewing.employee?.department?.name ?? "—"}</div>
                <div><span className="text-muted-foreground">Job Title:</span> {viewing.employee?.jobTitle?.title ?? "—"}</div>
                <div><span className="text-muted-foreground">Employee KRA PIN:</span> {viewing.employee?.kraPin ?? "—"}</div>
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
                  {([ ["Basic Salary", viewing.basicSalary], ["House Allowance", viewing.houseAllowance], ["Transport Allowance", viewing.transportAllowance], ["Overtime Pay", viewing.overtimePay] ] as [string, number][]).map(([l, v]) => (
                    <tr key={l} className="border">
                      <td className="px-3 py-1.5 border">{l}</td>
                      <td className="px-3 py-1.5 border text-right">{fmt(v)}</td>
                    </tr>
                  ))}
                  {(viewing.benefitInKind ?? 0) > 0 && (
                    <tr className="border bg-amber-50/50">
                      <td className="px-3 py-1.5 border">Benefit in Kind (non-cash, taxable)</td>
                      <td className="px-3 py-1.5 border text-right text-amber-700">{fmt(viewing.benefitInKind)}</td>
                    </tr>
                  )}
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
                  {([ ["SHA (Social Health Authority)", viewing.nhif], ["NSSF", viewing.nssf], ["PAYE Tax", viewing.paye], ["Other Deductions", viewing.otherDeductions] ] as [string, number][]).filter(([, v]) => v > 0).map(([l, v]) => (
                    <tr key={l} className="border">
                      <td className="px-3 py-1.5 border">{l}</td>
                      <td className="px-3 py-1.5 border text-right">{fmt(v)}</td>
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
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / Save PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendPayslip} disabled={sendingPayslip}>
                {sendingPayslip
                  ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sendingâ€¦</>
                  : <><Mail className="h-3.5 w-3.5 mr-1.5" /> Send to Employee</>}
              </Button>
            </div>
          </>
        )}
      </ModalForm>

      {/* ── Bulk Status Update Modal ──────────────────────────────────────────────── */}
      <ModalForm
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Update Payroll Status"
        description="Update the status of all payroll records matching the selected month."
        onSubmit={handleBulkStatusUpdate}
        submitLabel="Update Status"
        loading={bulkLoading}>
        <div className="space-y-4">
          <div>
            <Label>Payroll Month *</Label>
            <Input type="month" value={bulkForm.month} onChange={e => setBulkForm(f => ({ ...f, month: e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">All payroll records for this month within your scope will be updated.</p>
          </div>
          <div>
            <Label>New Status *</Label>
            <Select value={bulkForm.status} onValueChange={v => setBulkForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending (revert)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {bulkForm.status === "paid" && (
            <div>
              <Label>Pay Date</Label>
              <Input type="date" value={bulkForm.payDate} onChange={e => setBulkForm(f => ({ ...f, payDate: e.target.value }))} />
            </div>
          )}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            This updates ALL records for the selected month. To update individual records, use the edit button in the Records tab.
          </div>
        </div>
      </ModalForm>

      {/* ── Send Payslips Modal ───────────────────────────────────────────────── */}
      <ModalForm
        open={sendSlipOpen}
        onClose={() => setSendSlipOpen(false)}
        title="Send Payslips"
        description="Send payslips by email to employees for the selected month."
        onSubmit={handleBulkSendPayslips}
        submitLabel={sendSlipLoading ? "Sendingâ€¦" : "Send Payslips"}
        loading={sendSlipLoading}>
        <div className="space-y-4">
          <div>
            <Label>Payroll Month *</Label>
            <Input type="month" value={sendSlipMonth} onChange={e => setSendSlipMonth(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Send to</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={sendSlipScope === "all"} onChange={() => { setSendSlipScope("all"); setSendSlipEmpIds([]); }} className="accent-primary" />
                All employees with payroll for this month
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={sendSlipScope === "specific"} onChange={() => setSendSlipScope("specific")} className="accent-primary" />
                Specific employees
              </label>
            </div>
          </div>
          {sendSlipScope === "specific" && (
            <div className="space-y-2">
              <Input
                placeholder="Search employeesâ€¦"
                value={sendSlipSearch}
                onChange={e => setSendSlipSearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                {filteredSendSlipEmps.map(e => (
                  <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded">
                    <Checkbox
                      checked={sendSlipEmpIds.includes(e.id)}
                      onCheckedChange={() => {
                        setSendSlipEmpIds(prev =>
                          prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id]
                        );
                      }}
                    />
                    <span>{e.user?.name ?? e.employeeNumber}</span>
                    <span className="text-muted-foreground text-xs">{e.employeeNumber}</span>
                  </label>
                ))}
                {filteredSendSlipEmps.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">No employees found</p>
                )}
              </div>
              {sendSlipEmpIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{sendSlipEmpIds.length} employee(s) selected</p>
              )}
            </div>
          )}
        </div>
      </ModalForm>

      {/* ── Payroll Calculator Modal ─────────────────────────────────────────── */}
      <PayrollCalculatorModal open={calcOpen} onClose={() => setCalcOpen(false)} />

    </div>
  );
}
