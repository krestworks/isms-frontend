import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calculator, ChevronLeft, ChevronRight, Download, FileText,
  Mail, Plus, Printer, RefreshCw, CheckCircle2, AlertCircle,
} from "lucide-react";
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
  transportAllowance: 0, overtimePay: 0,
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

  // ── Run Payroll tab ──────────────────────────────────────────────────────────
  type RunStep = "configure" | "adjustments" | "preview" | "done";
  interface EmpOverride { houseAllow: number; transportAllow: number; bonus: number; extraDeduction: number; note: string; }
  const [runStep, setRunStep] = useState<RunStep>("configure");
  const [runScope, setRunScope] = useState<"all" | "location" | "department" | "specific">("all");
  const [runMonth, setRunMonth] = useState(new Date().toISOString().slice(0, 7));
  const [runStationIds,  setRunStationIds]  = useState<string[]>([]);
  const [runDeptIds,     setRunDeptIds]     = useState<string[]>([]);
  const [runEmpSearch,   setRunEmpSearch]   = useState("");
  const [runEmpIds,      setRunEmpIds]      = useState<string[]>([]);
  const [runAttendance,  setRunAttendance]  = useState(false);
  const [runLeave,       setRunLeave]       = useState(false);
  const [previewRows,    setPreviewRows]    = useState<ApiPayrollRunRow[]>([]);
  const [previewMeta,    setPreviewMeta]    = useState<{ total: number; toCreate: number; toSkip: number; noSalary: number } | null>(null);
  const [previewPage,    setPreviewPage]    = useState(1);
  const [runLoading,     setRunLoading]     = useState(false);
  const [runResult,      setRunResult]      = useState<{ created: number; skipped: number; failed: number } | null>(null);
  const [empOverrides,   setEmpOverrides]   = useState<Record<string, EmpOverride>>({});
  const [savedDraftMonths, setSavedDraftMonths] = useState<string[]>(() => {
    try {
      return Object.keys(localStorage).filter(k => k.startsWith("isms_pr_draft_")).map(k => k.replace("isms_pr_draft_", ""));
    } catch { return []; }
  });

  const PREVIEW_PAGE_SIZE = 50;
  const previewPages = Math.max(1, Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE));
  const previewSlice = previewRows.slice((previewPage - 1) * PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE);

  const setEmpOverride = (empId: string, field: keyof EmpOverride, value: number | string) => {
    setEmpOverrides(prev => ({
      ...prev,
      [empId]: { houseAllow: 0, transportAllow: 0, bonus: 0, extraDeduction: 0, note: "", ...prev[empId], [field]: value },
    }));
  };

  // ── Payslip email + settings ──────────────────────────────────────────────────
  const [sendingPayslip,   setSendingPayslip]   = useState(false);
  const [payrollSettings,  setPayrollSettings]  = useState<Record<string, string>>({});

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
    const paye = calcPAYE(gross, nssf);
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
    const b     = brandingStore.get();
    const loc   = sessionStore.activeLocation();
    const branch = loc !== "All Locations" ? loc : "";
    const empKraPin  = viewing.employee?.kraPin || "—";
    const empName    = viewing.employee?.user?.name ?? viewing.employeeId;
    const empNo      = viewing.employee?.employeeNumber ?? "—";
    const dept       = viewing.employee?.department?.name ?? "—";
    const title      = viewing.employee?.jobTitle?.title ?? "—";
    const erKraPin   = payrollSettings.employerKraPin || "—";
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
      <div class="biz-name">${b?.name ?? "ISMS"}</div>
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
  <tr class="subtotal"><td>GROSS PAY</td><td class="right">${fmtK(viewing.grossPay)}</td></tr>
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

  // ── Run Payroll helpers ───────────────────────────────────────────────────────

  const buildRunPayload = (dryRun: boolean) => {
    const payload: Parameters<typeof hrApi.payroll.run>[0] = {
      month: runMonth, dryRun,
      includeAttendance: runAttendance,
      includeLeave: runLeave,
    };
    if (runScope === "location"   && runStationIds.length)  payload.stationIds   = runStationIds;
    if (runScope === "department" && runDeptIds.length)     payload.departmentIds = runDeptIds;
    if (runScope === "specific"   && runEmpIds.length)      payload.employeeIds   = runEmpIds;
    return payload;
  };

  const handlePreview = async () => {
    if (!runMonth) return toast.error("Select a payroll month");
    if (runScope === "location"   && !runStationIds.length)  return toast.error("Select at least one location");
    if (runScope === "department" && !runDeptIds.length)     return toast.error("Select at least one department");
    if (runScope === "specific"   && !runEmpIds.length)      return toast.error("Select at least one employee");
    setRunLoading(true);
    try {
      const res = await hrApi.payroll.run(buildRunPayload(true));
      setPreviewRows((res.data as ApiPayrollRunRow[]) ?? []);
      setPreviewMeta(res.meta ?? null);
      setPreviewPage(1);
      setEmpOverrides({});
      setRunStep("adjustments"); // go to configure/adjust step first
    } catch (e: any) { toast.error(e?.message || "Preview failed"); }
    finally { setRunLoading(false); }
  };

  const handleGoToPreview = () => {
    setPreviewPage(1);
    setRunStep("preview");
  };

  const handleSubmitAdjusted = async () => {
    const rows = previewRows.filter(r => !r.noSalary);
    if (!rows.length) { toast.error("No employees to process"); return; }
    setRunLoading(true);
    try {
      const results = await Promise.allSettled(
        rows.map(r => {
          const ov = empOverrides[r.employeeId];
          const houseAllowance    = ov?.houseAllow || 0;
          const transportAllowance = ov?.transportAllow || 0;
          const overtimePay       = ov?.bonus || 0;
          const otherDeductions   = ov?.extraDeduction || 0;
          return hrApi.payroll.create({
            employeeId: r.employeeId, month: r.month,
            basicSalary: r.basicSalary, houseAllowance, transportAllowance, overtimePay,
            nhif: r.nhif, nssf: r.nssf, paye: r.paye, otherDeductions,
            status: "pending",
          } as any);
        })
      );
      const created = results.filter(x => x.status === "fulfilled").length;
      const failed  = results.filter(x => x.status === "rejected").length;
      setRunResult({ created, skipped: 0, failed });
      setRunStep("done");
      loadRecords(1);
    } catch (e: any) { toast.error(e?.message || "Failed to process payroll"); }
    finally { setRunLoading(false); }
  };

  const handleSaveDraft = () => {
    try {
      const key = `isms_pr_draft_${runMonth}`;
      localStorage.setItem(key, JSON.stringify({ runMonth, runScope, runStationIds, runDeptIds, runEmpIds, runAttendance, runLeave, previewRows, empOverrides }));
      setSavedDraftMonths(prev => prev.includes(runMonth) ? prev : [...prev, runMonth]);
      toast.success(`Draft saved for ${runMonth}`);
    } catch { toast.error("Failed to save draft"); }
  };

  const handleLoadDraft = (month: string) => {
    try {
      const saved = localStorage.getItem(`isms_pr_draft_${month}`);
      if (!saved) { toast.error("Draft not found"); return; }
      const d = JSON.parse(saved);
      setRunMonth(d.runMonth); setRunScope(d.runScope);
      setRunStationIds(d.runStationIds || []); setRunDeptIds(d.runDeptIds || []);
      setRunEmpIds(d.runEmpIds || []); setRunAttendance(d.runAttendance); setRunLeave(d.runLeave);
      setPreviewRows(d.previewRows || []); setPreviewMeta(null);
      setEmpOverrides(d.empOverrides || {}); setPreviewPage(1);
      setRunStep("adjustments");
      toast.success(`Draft loaded for ${month}`);
    } catch { toast.error("Failed to load draft"); }
  };

  const handleDeleteDraft = (month: string) => {
    try {
      localStorage.removeItem(`isms_pr_draft_${month}`);
      setSavedDraftMonths(prev => prev.filter(m => m !== month));
      toast.success(`Draft deleted`);
    } catch { /**/ }
  };

  const resetRun = () => {
    setRunStep("configure");
    setPreviewRows([]);
    setPreviewMeta(null);
    setRunResult(null);
    setEmpOverrides({});
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
    const b = brandingStore.get();
    const erKraPin = payrollSettings.employerKraPin || "";
    const brandHdr = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:14px">
      <div>
        <strong style="font-size:15px">${b?.name ?? "ISMS"}</strong>
        ${b?.address ? `<br><span style="font-size:11px;color:#555">${b.address}</span>` : ""}
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
      if (!map.has(key)) map.set(key, { name: p.employee?.user.name ?? key, empNo: p.employee?.employeeNumber ?? "—", dept: p.employee?.department?.name ?? "—" });
      map.get(key)!.m1 = p;
    }
    for (const p of varData2) {
      const key = p.employeeId;
      if (!map.has(key)) map.set(key, { name: p.employee?.user.name ?? key, empNo: p.employee?.employeeNumber ?? "—", dept: p.employee?.department?.name ?? "—" });
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
      const b = brandingStore.get();
      const fmtK = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
      const varRows = rows.map((r, i) => {
        const gDiff = diff(r.m1?.grossPay, r.m2?.grossPay);
        const nDiff = diff(r.m1?.netPay, r.m2?.netPay);
        const color = gDiff > 0 ? "#155724" : gDiff < 0 ? "#c00" : "";
        return `<tr>
          <td>${i+1}</td><td>${r.empNo}</td><td>${r.name}</td><td>${r.dept}</td>
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
<h2>${b?.name ?? "ISMS"} — Payroll Variance Report</h2>
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

  // Toggle scope selections
  const toggleId = (arr: string[], id: string, setArr: (v: string[]) => void) => {
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };

  const filteredEmpSearch = employees.filter(e =>
    !runEmpSearch || (e.user?.name ?? "").toLowerCase().includes(runEmpSearch.toLowerCase()) || e.employeeNumber?.includes(runEmpSearch)
  ).slice(0, 50);

  // ─────────────────────────────────────────────────────────────────────────────

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
            {can("hr.payroll.process") && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => setBulkOpen(true)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Bulk Update Status
              </Button>
            )}
            {can("hr.payroll.process") && (
              <Button size="sm" className="h-8" onClick={() => { loadRef(); openNew(); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Entry
              </Button>
            )}
          </div>

          <DataTable
            data={data}
            columns={columns}
            searchKeys={["id", "employeeId", "month"]}
            searchPlaceholder="Search payroll…"
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

        {/* ── Run Payroll Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="run" className="space-y-4">

          {/* Step: Configure / Select */}
          {runStep === "configure" && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-semibold">Step 1 — Select Payroll Scope</h3>
                <p className="text-xs text-muted-foreground">Choose the period, coverage, and auto-pull options, then click Next to configure per-employee adjustments.</p>
              </div>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Payroll Scope</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["all","location","department","specific"] as const).map(s => (
                      <button key={s} onClick={() => setRunScope(s)}
                        className={`border rounded-lg p-3 text-left text-sm transition-colors ${runScope === s ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-muted-foreground"}`}>
                        <div className="font-medium capitalize">{s === "specific" ? "Select Employees" : s === "all" ? "All Employees" : `By ${s.charAt(0).toUpperCase() + s.slice(1)}`}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s === "all"        && "Process all active employees"}
                          {s === "location"   && "Filter by station / branch"}
                          {s === "department" && "Filter by department"}
                          {s === "specific"   && "Hand-pick individual employees"}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Location multi-select */}
                  {runScope === "location" && (
                    <div>
                      <Label className="text-xs mb-1 block">Select Locations</Label>
                      <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                        {stations.filter(s => s.status === "Active").map(s => (
                          <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded">
                            <Checkbox
                              checked={runStationIds.includes(s.id)}
                              onCheckedChange={() => toggleId(runStationIds, s.id, setRunStationIds)}
                            />
                            {s.name}
                          </label>
                        ))}
                        {stations.length === 0 && <p className="text-xs text-muted-foreground p-1">No locations found</p>}
                      </div>
                      {runStationIds.length > 0 && <p className="text-xs text-muted-foreground mt-1">{runStationIds.length} location(s) selected</p>}
                    </div>
                  )}

                  {/* Department multi-select */}
                  {runScope === "department" && (
                    <div>
                      <Label className="text-xs mb-1 block">Select Departments</Label>
                      <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                        {departments.map(d => (
                          <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded">
                            <Checkbox
                              checked={runDeptIds.includes(d.id)}
                              onCheckedChange={() => toggleId(runDeptIds, d.id, setRunDeptIds)}
                            />
                            {d.name}
                          </label>
                        ))}
                        {departments.length === 0 && <p className="text-xs text-muted-foreground p-1">No departments found</p>}
                      </div>
                      {runDeptIds.length > 0 && <p className="text-xs text-muted-foreground mt-1">{runDeptIds.length} department(s) selected</p>}
                    </div>
                  )}

                  {/* Employee search + select */}
                  {runScope === "specific" && (
                    <div className="space-y-2">
                      <Input placeholder="Search employees…" value={runEmpSearch} onChange={e => setRunEmpSearch(e.target.value)} className="h-8 text-xs" />
                      <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                        {filteredEmpSearch.map(e => (
                          <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded">
                            <Checkbox
                              checked={runEmpIds.includes(e.id)}
                              onCheckedChange={() => toggleId(runEmpIds, e.id, setRunEmpIds)}
                            />
                            <span>{e.user?.name ?? e.employeeNumber}</span>
                            <span className="text-muted-foreground text-xs">{e.employeeNumber}</span>
                          </label>
                        ))}
                        {filteredEmpSearch.length === 0 && <p className="text-xs text-muted-foreground p-1">No employees found</p>}
                      </div>
                      {runEmpIds.length > 0 && <p className="text-xs text-muted-foreground">{runEmpIds.length} employee(s) selected</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Payroll Month & Options</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">Payroll Month *</Label>
                    <Input type="month" value={runMonth} onChange={e => setRunMonth(e.target.value)} className="w-40" />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={runAttendance} onCheckedChange={v => setRunAttendance(!!v)} />
                      <span>Include attendance adjustments</span>
                      <span className="text-xs text-muted-foreground">(deduct absent days from salary)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={runLeave} onCheckedChange={v => setRunLeave(!!v)} />
                      <span>Include unpaid leave deductions</span>
                      <span className="text-xs text-muted-foreground">(deduct unpaid leave days)</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    Deductions calculated: SHA = 2.75% · NSSF = 6% (Tier I+II, first Ksh 18,000) · PAYE = graduated rates with Ksh 2,400 personal relief
                  </p>
                </CardContent>
              </Card>

              {/* Saved drafts */}
              {savedDraftMonths.length > 0 && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Saved Drafts</p>
                  <div className="flex flex-wrap gap-2">
                    {savedDraftMonths.map(m => (
                      <div key={m} className="flex items-center gap-1 border rounded px-2 py-1 bg-background text-xs">
                        <span>{m}</span>
                        <button onClick={() => handleLoadDraft(m)} className="text-primary hover:underline">Load</button>
                        <button onClick={() => handleDeleteDraft(m)} className="text-destructive hover:underline ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handlePreview} disabled={runLoading} size="sm">
                  {runLoading ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Loading…</> : <><Calculator className="h-3.5 w-3.5 mr-1.5" /> Next: Configure Payroll</>}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Adjustments / Configure per-employee */}
          {runStep === "adjustments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Step 2 — Configure &amp; Adjust</h3>
                  <p className="text-xs text-muted-foreground">Adjust allowances, bonuses, and extra deductions per employee. System-calculated statutory deductions are shown for reference.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={resetRun}>Cancel</Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={handleSaveDraft}>Save Draft</Button>
                  <Button size="sm" className="h-8" onClick={handleGoToPreview}>Preview →</Button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="flex gap-3 flex-wrap">
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-xl font-bold">{previewRows.filter(r => !r.noSalary).length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">No Salary</p>
                  <p className="text-xl font-bold text-amber-600">{previewRows.filter(r => r.noSalary).length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Est. Gross</p>
                  <p className="text-sm font-bold">{fmt(previewRows.reduce((s, r) => s + r.grossPay, 0))}</p>
                </CardContent></Card>
              </div>

              {/* Per-employee adjustment table */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Dept</th>
                      <th className="px-2 py-2 text-right">Basic (Ksh)</th>
                      <th className="px-2 py-2 text-right">House Allow</th>
                      <th className="px-2 py-2 text-right">Transport</th>
                      <th className="px-2 py-2 text-right">Bonus/OT</th>
                      <th className="px-2 py-2 text-right">Extra Deduct</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">SHA</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">NSSF</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">PAYE</th>
                      <th className="px-2 py-2 text-right font-semibold">Est. Net</th>
                      <th className="px-2 py-2 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map(r => {
                      const ov = empOverrides[r.employeeId] || { houseAllow: 0, transportAllow: 0, bonus: 0, extraDeduction: 0, note: "" };
                      const adjGross = r.basicSalary + (ov.houseAllow || 0) + (ov.transportAllow || 0) + (ov.bonus || 0);
                      const adjNet   = Math.max(0, adjGross - r.nhif - r.nssf - r.paye - (ov.extraDeduction || 0));
                      return (
                        <tr key={r.employeeId} className={`border-b ${r.noSalary ? "opacity-40" : "hover:bg-muted/20"}`}>
                          <td className="px-3 py-1.5">
                            <div className="font-medium truncate max-w-[140px]">{r.name}</div>
                            <div className="text-muted-foreground">{r.employeeNumber}</div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[80px]">{r.department}</td>
                          <td className="px-2 py-1.5 text-right">{fmt(r.basicSalary)}</td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.houseAllow || ""}
                              onChange={e => setEmpOverride(r.employeeId, "houseAllow", +e.target.value)}
                              className="h-6 w-20 text-xs text-right" placeholder="0" disabled={r.noSalary} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.transportAllow || ""}
                              onChange={e => setEmpOverride(r.employeeId, "transportAllow", +e.target.value)}
                              className="h-6 w-20 text-xs text-right" placeholder="0" disabled={r.noSalary} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.bonus || ""}
                              onChange={e => setEmpOverride(r.employeeId, "bonus", +e.target.value)}
                              className="h-6 w-20 text-xs text-right" placeholder="0" disabled={r.noSalary} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.extraDeduction || ""}
                              onChange={e => setEmpOverride(r.employeeId, "extraDeduction", +e.target.value)}
                              className="h-6 w-20 text-xs text-right text-destructive" placeholder="0" disabled={r.noSalary} />
                          </td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{fmt(r.nhif)}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{fmt(r.nssf)}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{fmt(r.paye)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold text-primary">{r.noSalary ? "—" : fmt(adjNet)}</td>
                          <td className="px-2 py-1.5">
                            <Input value={ov.note || ""}
                              onChange={e => setEmpOverride(r.employeeId, "note", e.target.value)}
                              className="h-6 w-28 text-xs" placeholder="optional note" disabled={r.noSalary} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {previewRows.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-sm">No employees matched the selection</div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={resetRun}>Cancel</Button>
                <Button variant="outline" size="sm" onClick={handleSaveDraft}>Save Draft</Button>
                <Button size="sm" onClick={handleGoToPreview}>Preview All Calculations →</Button>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {runStep === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Step 3 — Review &amp; Submit</h3>
                  <p className="text-xs text-muted-foreground">Review all computed amounts below. Submit to create payroll records, or go back to adjust.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={resetRun}>Cancel</Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setRunStep("adjustments")}>← Back to Adjust</Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={handleSaveDraft}>Save Draft</Button>
                  <Button size="sm" className="h-8" onClick={handleSubmitAdjusted} disabled={runLoading}>
                    {runLoading ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting…</> : `Submit Payroll (${previewRows.filter(r => !r.noSalary).length})`}
                  </Button>
                </div>
              </div>
              {/* Summary */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Total Employees", value: previewRows.length, color: "" },
                  { label: "Will Create",     value: previewRows.filter(r => !r.noSalary && !r.willSkip).length, color: "text-green-600" },
                  { label: "Skip (existing)", value: previewRows.filter(r => r.willSkip).length, color: "text-muted-foreground" },
                  { label: "No Salary",       value: previewRows.filter(r => r.noSalary).length, color: "text-amber-600" },
                ].map(s => (
                  <Card key={s.label} className="flex-1 min-w-[120px]">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">Employee</th>
                      <th className="px-2 py-2 text-left font-medium">Dept</th>
                      <th className="px-2 py-2 text-right font-medium">Gross</th>
                      {(runAttendance || runLeave) && <th className="px-2 py-2 text-right font-medium">Absence Ded.</th>}
                      <th className="px-2 py-2 text-right font-medium">SHA</th>
                      <th className="px-2 py-2 text-right font-medium">NSSF</th>
                      <th className="px-2 py-2 text-right font-medium">PAYE</th>
                      <th className="px-2 py-2 text-right font-medium">Extra Ded.</th>
                      <th className="px-2 py-2 text-right font-bold">Net Pay</th>
                      <th className="px-2 py-2 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSlice.map(r => {
                      const ov = empOverrides[r.employeeId];
                      const adjGross = r.basicSalary + (ov?.houseAllow || 0) + (ov?.transportAllow || 0) + (ov?.bonus || 0);
                      const adjNet   = Math.max(0, adjGross - r.nhif - r.nssf - r.paye - (ov?.extraDeduction || 0));
                      const hasAdj   = !!(ov?.houseAllow || ov?.transportAllow || ov?.bonus || ov?.extraDeduction);
                      return (
                        <tr key={r.employeeId} className={`border-t ${r.willSkip ? "opacity-40" : r.noSalary ? "bg-amber-50" : ""}`}>
                          <td className="px-2 py-1.5">
                            <div className="font-medium">{r.name}</div>
                            <div className="text-muted-foreground">{r.employeeNumber}</div>
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">{r.department}</td>
                          <td className="px-2 py-1.5 text-right">
                            {hasAdj ? <span className="text-primary font-medium">{fmtNum(adjGross)}</span> : fmtNum(r.grossPay)}
                          </td>
                          {(runAttendance || runLeave) && <td className="px-2 py-1.5 text-right text-destructive">{r.absenceDeduction > 0 ? `-${fmtNum(r.absenceDeduction)}` : "—"}</td>}
                          <td className="px-2 py-1.5 text-right">{fmtNum(r.nhif)}</td>
                          <td className="px-2 py-1.5 text-right">{fmtNum(r.nssf)}</td>
                          <td className="px-2 py-1.5 text-right">{fmtNum(r.paye)}</td>
                          {ov?.extraDeduction ? <td className="px-2 py-1.5 text-right text-destructive">{fmtNum(ov.extraDeduction)}</td> : <td className="px-2 py-1.5 text-right">—</td>}
                          <td className="px-2 py-1.5 text-right font-bold text-primary">
                            {hasAdj ? fmtNum(adjNet) : fmtNum(r.netPay)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {r.willSkip  ? <span className="text-muted-foreground">existing</span>
                              : r.noSalary ? <span className="text-amber-600">no salary</span>
                              : <span className="text-green-600">ready</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {previewSlice.length > 0 && (
                    <tfoot className="bg-muted/30 font-semibold border-t-2">
                      <tr>
                        <td className="px-2 py-1.5" colSpan={2}>Page Totals</td>
                        <td className="px-2 py-1.5 text-right">{fmtNum(previewSlice.reduce((s,r) => s + r.grossPay, 0))}</td>
                        {(runAttendance || runLeave) && <td className="px-2 py-1.5 text-right text-destructive">{fmtNum(previewSlice.reduce((s,r) => s + r.absenceDeduction, 0))}</td>}
                        <td className="px-2 py-1.5 text-right">{fmtNum(previewSlice.reduce((s,r) => s + r.nhif, 0))}</td>
                        <td className="px-2 py-1.5 text-right">{fmtNum(previewSlice.reduce((s,r) => s + r.nssf, 0))}</td>
                        <td className="px-2 py-1.5 text-right">{fmtNum(previewSlice.reduce((s,r) => s + r.paye, 0))}</td>
                        <td className="px-2 py-1.5 text-right">{fmtNum(previewSlice.reduce((s,r) => s + (empOverrides[r.employeeId]?.extraDeduction || 0), 0))}</td>
                        <td className="px-2 py-1.5 text-right">{fmtNum(previewSlice.reduce((s,r) => {
                          const ov = empOverrides[r.employeeId];
                          const g = r.basicSalary + (ov?.houseAllow||0) + (ov?.transportAllow||0) + (ov?.bonus||0);
                          return s + Math.max(0, g - r.nhif - r.nssf - r.paye - (ov?.extraDeduction||0));
                        }, 0))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Preview pagination */}
              {previewPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Showing {(previewPage - 1) * PREVIEW_PAGE_SIZE + 1}–{Math.min(previewPage * PREVIEW_PAGE_SIZE, previewRows.length)} of {previewRows.length}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={previewPage <= 1} onClick={() => setPreviewPage(p => p - 1)}>Prev</Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={previewPage >= previewPages} onClick={() => setPreviewPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={resetRun}>Cancel</Button>
                <Button variant="outline" size="sm" onClick={() => setRunStep("adjustments")}>← Back to Adjust</Button>
                <Button variant="outline" size="sm" onClick={handleSaveDraft}>Save Draft</Button>
                <div className="flex-1" />
                {previewRows.filter(r => !r.noSalary && !r.willSkip).length === 0 && (
                  <p className="text-sm text-muted-foreground self-center">Nothing new to create for this period.</p>
                )}
                <Button size="sm" onClick={handleSubmitAdjusted} disabled={runLoading || previewRows.filter(r => !r.noSalary).length === 0}>
                  {runLoading ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting…</> : `Submit & Create Payroll Records`}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {runStep === "done" && runResult && (
            <div className="space-y-4 max-w-lg">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Payroll run complete</p>
                  <p className="text-sm text-green-700 mt-1">
                    {runResult.created} records created · {runResult.skipped} skipped{runResult.failed > 0 ? ` · ${runResult.failed} errors` : ""}
                  </p>
                </div>
              </div>
              {runResult.created > 0 && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-medium">Ready to mark as paid?</p>
                    <p className="text-xs text-muted-foreground">The records are saved as "Pending". Use Bulk Update Status in the Records tab or the button below to advance their status.</p>
                    <Button size="sm" onClick={() => {
                      setBulkForm(f => ({ ...f, month: runMonth, status: "paid" }));
                      setBulkOpen(true);
                    }}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark {runMonth} as Paid
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Button variant="outline" size="sm" onClick={resetRun}>Run Another Payroll</Button>
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
            <span className="text-sm text-muted-foreground">Gross Pay:</span>
            <span className="font-bold">{fmt(gross)}</span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Statutory Deductions</p>
            <Button type="button" variant="outline" size="sm" onClick={autoCalculate} disabled={gross <= 0}>
              <Calculator className="h-3.5 w-3.5 mr-1.5" /> Auto-Calculate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">SHA = 2.75% · NSSF = 6% (Tier I+II) · PAYE = graduated rates with Ksh 2,400 relief</p>
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
                  {([ ["SHA (Social Health Authority)", viewing.nhif], ["NSSF", viewing.nssf], ["PAYE Tax", viewing.paye], ["Other Deductions", viewing.otherDeductions] ] as [string, number][]).map(([l, v]) => (
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
                  ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
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

    </div>
  );
}
