import { useState, useMemo } from "react";
import { AlertCircle, Calculator, ChevronLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { hrApi, ApiEmployee, ApiDepartment, ApiPayrollRunRow } from "@/lib/hrApi";
import { ApiStationFull } from "@/lib/stationsApi";
import { calcSHA, calcNSSF, calcPAYE, fmt, fmtNum } from "@/lib/payrollCalc";

interface EmpOverride {
  houseAllow: number;
  transportAllow: number;
  bonus: number;
  extraDeduction: number;
  benefitInKind: number;
  note: string;
}

interface Props {
  onBack: () => void;
  onSuccess: (month: string) => void;
  employees: ApiEmployee[];
  departments: ApiDepartment[];
  stations: ApiStationFull[];
  activeLocation: string;
}

export default function PayrollBatchEntryPage({
  onBack, onSuccess, employees, departments, stations, activeLocation,
}: Props) {
  const isAllLocations = activeLocation === "All Locations";
  const lockedStation  = isAllLocations ? null : (stations.find(s => s.name === activeLocation) ?? null);

  // ── Step ───────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<"entry" | "preview">("entry");

  // ── Configure ──────────────────────────────────────────────────────────────
  const [month,           setMonth]           = useState(new Date().toISOString().slice(0, 7));
  const [selectedStation, setSelectedStation] = useState(stations[0]?.id || "");
  const [scope, setScope] = useState<"all" | "department" | "salaryRange" | "specific">("all");
  const [deptIds,    setDeptIds]    = useState<string[]>([]);
  const [salaryFrom, setSalaryFrom] = useState("");
  const [salaryTo,   setSalaryTo]   = useState("");
  const [empSearch,  setEmpSearch]  = useState("");
  const [empIds,     setEmpIds]     = useState<string[]>([]);
  const [incAttend,  setIncAttend]  = useState(false);
  const [incLeave,   setIncLeave]   = useState(false);

  // ── Global adjustments ─────────────────────────────────────────────────────
  const [gHouse,     setGHouse]     = useState("");
  const [gTransport, setGTransport] = useState("");
  const [gBonus,     setGBonus]     = useState("");
  const [gExtraDed,  setGExtraDed]  = useState("");

  // ── Rows & overrides ───────────────────────────────────────────────────────
  const [rows,       setRows]       = useState<ApiPayrollRunRow[]>([]);
  const [overrides,  setOverrides]  = useState<Record<string, EmpOverride>>({});
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prevPage,   setPrevPage]   = useState(1);
  const PAGE_SZ = 50;

  // ── Drafts ─────────────────────────────────────────────────────────────────
  const draftKey = (m: string, sid: string) => `isms_pr_batch_${m}_${sid || "all"}`;
  const [draftList, setDraftList] = useState<Array<{ month: string; stationId: string }>>(() => {
    try {
      return Object.keys(localStorage)
        .filter(k => k.startsWith("isms_pr_batch_"))
        .map(k => {
          const rest = k.replace("isms_pr_batch_", "");
          const ui = rest.lastIndexOf("_");
          return ui > 0 ? { month: rest.slice(0, ui), stationId: rest.slice(ui + 1) } : { month: rest, stationId: "" };
        });
    } catch { return []; }
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const activeStationId = lockedStation?.id || (isAllLocations ? selectedStation : "");

  const setOv = (empId: string, field: keyof EmpOverride, value: number | string) =>
    setOverrides(prev => ({
      ...prev,
      [empId]: { houseAllow: 0, transportAllow: 0, bonus: 0, extraDeduction: 0, benefitInKind: 0, note: "", ...prev[empId], [field]: value },
    }));

  const toggleDept = (id: string) => setDeptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleEmp  = (id: string) => setEmpIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const applyGlobal = () => {
    const h = Number(gHouse)||0, t = Number(gTransport)||0, b = Number(gBonus)||0, d = Number(gExtraDed)||0;
    setOverrides(prev => {
      const next = { ...prev };
      for (const r of rows)
        next[r.employeeId] = { ...(prev[r.employeeId] || { note: "" }), houseAllow: h, transportAllow: t, bonus: b, extraDeduction: d };
      return next;
    });
    toast.success("Applied to all employees");
  };

  const debouncedEmpSearch = useDebounce(empSearch, 300);
  const filteredEmps = useMemo(() => employees.filter(e =>
    !debouncedEmpSearch ||
    (e.user?.name ?? e.name ?? "").toLowerCase().includes(debouncedEmpSearch.toLowerCase()) ||
    (e.employeeNumber ?? "").includes(debouncedEmpSearch)
  ).slice(0, 100), [employees, debouncedEmpSearch]);

  // ── Derived (memoized — rows/overrides can be large) ──────────────────────
  const eligible  = useMemo(() => rows.filter(r => !r.noSalary && !r.willSkip), [rows]);
  const totalNet  = useMemo(() => eligible.reduce((s, r) => {
    const ov  = overrides[r.employeeId];
    const g   = r.basicSalary + (ov?.houseAllow||0) + (ov?.transportAllow||0) + (ov?.bonus||0);
    const n   = calcNSSF(g);
    const bik = ov?.benefitInKind || 0;
    return s + Math.max(0, g - calcSHA(g) - n - calcPAYE(g, n, bik) - (ov?.extraDeduction||0));
  }, 0), [eligible, overrides]);
  const prevPages = Math.max(1, Math.ceil(eligible.length / PAGE_SZ));
  const prevSlice = useMemo(() => eligible.slice((prevPage - 1) * PAGE_SZ, prevPage * PAGE_SZ), [eligible, prevPage]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLoad = async () => {
    if (!month) return toast.error("Select a payroll month");
    const payload: Record<string, unknown> = { month, includeAttendance: incAttend, includeLeave: incLeave };
    if (activeStationId) payload.stationIds = [activeStationId];

    if (scope === "department" && deptIds.length) {
      payload.departmentIds = deptIds;
    } else if (scope === "specific" && empIds.length) {
      payload.employeeIds = empIds;
    } else if (scope === "salaryRange") {
      const from = Number(salaryFrom) || 0;
      const to   = salaryTo ? Number(salaryTo) : Infinity;
      const ids  = employees
        .filter(e => e.status === "Active" && (e.basicSalary ?? 0) >= from && (e.basicSalary ?? 0) <= to)
        .map(e => e.id);
      if (!ids.length) return toast.error("No active employees in that salary range");
      payload.employeeIds = ids;
    }

    setLoading(true);
    try {
      const res  = await hrApi.payroll.run(payload as any);
      const data = Array.isArray(res.data) ? (res.data as ApiPayrollRunRow[]) : [];
      setRows(data);
      setPrevPage(1);
      const h = Number(gHouse)||0, t = Number(gTransport)||0, b = Number(gBonus)||0, d = Number(gExtraDed)||0;
      if (h || t || b || d) {
        const init: Record<string, EmpOverride> = {};
        for (const r of data) init[r.employeeId] = { houseAllow: h, transportAllow: t, bonus: b, extraDeduction: d, benefitInKind: 0, note: "" };
        setOverrides(init);
      } else {
        setOverrides({});
      }
      if (!data.length) toast.info("No employees matched the criteria");
    } catch (e: any) { toast.error(e?.message || "Failed to load employees"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!eligible.length) return toast.error("No eligible employees to submit");
    setSubmitting(true);
    try {
      const apiRows = eligible.map(r => {
        const ov    = overrides[r.employeeId] || {};
        const house = ov.houseAllow     || 0;
        const tran  = ov.transportAllow || 0;
        const ot    = ov.bonus          || 0;
        const extra = ov.extraDeduction || 0;
        const bik   = ov.benefitInKind  || 0;
        const gross = r.basicSalary + house + tran + ot;
        const nssf  = calcNSSF(gross);
        const sha   = calcSHA(gross);
        const paye  = calcPAYE(gross, nssf, bik);
        return {
          ...r,
          houseAllowance: house, transportAllowance: tran, overtimePay: ot, otherDeductions: extra,
          benefitInKind: bik,
          grossPay: gross, nhif: sha, nssf, paye,
          totalDeductions: sha + nssf + paye + extra,
          netPay: Math.max(0, gross - sha - nssf - paye - extra),
        };
      });
      const scopeLabel =
        scope === "department" ? `Department: ${departments.filter(d => deptIds.includes(d.id)).map(d => d.name).join(", ") || "—"}` :
        scope === "salaryRange" ? `Salary range: ${salaryFrom || "0"} – ${salaryTo || "no limit"}` :
        scope === "specific"    ? `Specific employees (${empIds.length})` :
        "All Employees";
      const res = await hrApi.payroll.bulkCreate({ month, rows: apiRows, scope: scopeLabel });
      try { localStorage.removeItem(draftKey(month, activeStationId)); } catch {}
      setDraftList(prev => prev.filter(d => !(d.month === month && d.stationId === activeStationId)));
      toast.success(res.message || `Created ${res.data.created} payroll record(s)`);
      onSuccess(month);
    } catch (e: any) { toast.error(e?.message || "Failed to submit payroll"); }
    finally { setSubmitting(false); }
  };

  const saveDraft = () => {
    const key = draftKey(month, activeStationId);
    try {
      localStorage.setItem(key, JSON.stringify({
        month, stationId: activeStationId, scope, deptIds, empIds, salaryFrom, salaryTo,
        incAttend, incLeave, gHouse, gTransport, gBonus, gExtraDed, rows, overrides,
      }));
      setDraftList(prev => {
        const f = prev.filter(d => !(d.month === month && d.stationId === activeStationId));
        return [...f, { month, stationId: activeStationId }];
      });
      toast.success("Draft saved");
    } catch { toast.error("Failed to save draft"); }
  };

  const loadDraft = (d: { month: string; stationId: string }) => {
    try {
      const s = localStorage.getItem(draftKey(d.month, d.stationId));
      if (!s) return;
      const v = JSON.parse(s);
      setMonth(v.month || month);
      setScope(v.scope || "all");
      setDeptIds(v.deptIds || []);
      setEmpIds(v.empIds || []);
      setSalaryFrom(v.salaryFrom || "");
      setSalaryTo(v.salaryTo || "");
      setIncAttend(v.incAttend ?? false);
      setIncLeave(v.incLeave ?? false);
      setGHouse(v.gHouse || "");
      setGTransport(v.gTransport || "");
      setGBonus(v.gBonus || "");
      setGExtraDed(v.gExtraDed || "");
      setRows(v.rows || []);
      setOverrides(v.overrides || {});
      toast.success("Draft loaded");
    } catch { toast.error("Failed to load draft"); }
  };

  const deleteDraft = (d: { month: string; stationId: string }) => {
    try { localStorage.removeItem(draftKey(d.month, d.stationId)); } catch {}
    setDraftList(prev => prev.filter(x => !(x.month === d.month && x.stationId === d.stationId)));
  };

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 gap-1">
          <ChevronLeft className="h-4 w-4" /> Records
        </Button>
        <h2 className="text-sm font-semibold">New Payroll Batch</h2>
        {month && <Badge variant="outline">{month}</Badge>}
        {!isAllLocations && <Badge variant="secondary">{activeLocation}</Badge>}
        {step === "preview" && <Badge className="bg-amber-100 text-amber-800 border border-amber-300">Review &amp; Submit</Badge>}
      </div>

      {/* ═══════════════════════════════ ENTRY STEP ════════════════════════ */}
      {step === "entry" && (
        <div className="space-y-4">

          {/* Configure bar */}
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">

              <div>
                <Label className="text-xs mb-1 block">Payroll Month *</Label>
                <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40 h-8 text-xs" />
              </div>

              {/* Location: locked chip or selector */}
              {isAllLocations ? (
                <div>
                  <Label className="text-xs mb-1 block">Location</Label>
                  <Select value={selectedStation} onValueChange={setSelectedStation}>
                    <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All locations" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {stations.filter(s => s.status === "Active").map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs mb-1 block">Location</Label>
                  <div className="h-8 px-3 flex items-center rounded-md border bg-muted text-xs font-medium">{activeLocation}</div>
                </div>
              )}

              <div>
                <Label className="text-xs mb-1 block">Scope</Label>
                <Select value={scope} onValueChange={v => setScope(v as typeof scope)}>
                  <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="department">By Department</SelectItem>
                    <SelectItem value="salaryRange">By Salary Range</SelectItem>
                    <SelectItem value="specific">Specific Employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 self-end pb-0.5">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={incAttend} onCheckedChange={v => setIncAttend(!!v)} className="h-3.5 w-3.5" />
                  Attendance adj.
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={incLeave} onCheckedChange={v => setIncLeave(!!v)} className="h-3.5 w-3.5" />
                  Unpaid leave ded.
                </label>
              </div>

              <div className="flex-1" />
              <Button onClick={handleLoad} disabled={loading} size="sm" className="h-8">
                {loading
                  ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Loading…</>
                  : <><Calculator className="h-3.5 w-3.5 mr-1.5" />Load Employees</>}
              </Button>
            </div>

            {/* Scope sub-selectors */}
            {scope === "department" && (
              <div>
                <Label className="text-xs mb-1 block">Select Departments</Label>
                <div className="border rounded bg-background max-h-28 overflow-y-auto p-1.5 flex flex-wrap gap-x-4">
                  {departments.map(d => (
                    <label key={d.id} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5 min-w-[160px]">
                      <Checkbox checked={deptIds.includes(d.id)} onCheckedChange={() => toggleDept(d.id)} className="h-3.5 w-3.5" />
                      {d.name}
                    </label>
                  ))}
                  {departments.length === 0 && <p className="text-xs text-muted-foreground p-1">No departments found</p>}
                </div>
                {deptIds.length > 0 && <p className="text-xs text-muted-foreground mt-1">{deptIds.length} dept(s) selected</p>}
              </div>
            )}

            {scope === "salaryRange" && (
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <Label className="text-xs mb-1 block">Min Basic Salary (Ksh)</Label>
                  <Input type="number" min={0} value={salaryFrom} onChange={e => setSalaryFrom(e.target.value)} className="w-36 h-8 text-xs" placeholder="e.g. 20000" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Max Basic Salary (Ksh)</Label>
                  <Input type="number" min={0} value={salaryTo} onChange={e => setSalaryTo(e.target.value)} className="w-36 h-8 text-xs" placeholder="leave blank for no limit" />
                </div>
                <p className="text-xs text-muted-foreground self-end pb-1.5">Filters employees whose basic salary is in this range.</p>
              </div>
            )}

            {scope === "specific" && (
              <div className="space-y-1.5">
                <Input placeholder="Search employees…" value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="h-7 text-xs" />
                <div className="border rounded bg-background max-h-28 overflow-y-auto p-1.5 flex flex-wrap gap-x-4">
                  {filteredEmps.map(e => (
                    <label key={e.id} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5 min-w-[200px]">
                      <Checkbox checked={empIds.includes(e.id)} onCheckedChange={() => toggleEmp(e.id)} className="h-3.5 w-3.5" />
                      <span>{e.user?.name ?? e.name ?? e.employeeNumber}</span>
                      <span className="text-muted-foreground ml-1 text-[10px]">{e.employeeNumber}</span>
                    </label>
                  ))}
                  {filteredEmps.length === 0 && <p className="text-xs text-muted-foreground p-1">No employees found</p>}
                </div>
                {empIds.length > 0 && <p className="text-xs text-muted-foreground">{empIds.length} employee(s) selected</p>}
              </div>
            )}
          </div>

          {/* Global adjustments — visible only after employees are loaded */}
          {rows.length > 0 && (
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">
                  Global Adjustments
                  <span className="text-muted-foreground font-normal ml-1">(apply to all employees — override per row in the table)</span>
                </p>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={applyGlobal}>Apply to All Rows ↓</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <div>
                  <Label className="text-xs mb-1 block">House Allowance (all)</Label>
                  <Input type="number" min={0} value={gHouse} onChange={e => setGHouse(e.target.value)} className="w-28 h-7 text-xs" placeholder="0" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Transport (all)</Label>
                  <Input type="number" min={0} value={gTransport} onChange={e => setGTransport(e.target.value)} className="w-28 h-7 text-xs" placeholder="0" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">OT / Bonus (all)</Label>
                  <Input type="number" min={0} value={gBonus} onChange={e => setGBonus(e.target.value)} className="w-28 h-7 text-xs" placeholder="0" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Extra Deduction (all)</Label>
                  <Input type="number" min={0} value={gExtraDed} onChange={e => setGExtraDed(e.target.value)} className="w-28 h-7 text-xs text-destructive" placeholder="0" />
                </div>
              </div>
            </div>
          )}

          {/* Saved drafts */}
          {draftList.length > 0 && (
            <div className="border rounded-lg p-2 bg-muted/30 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-muted-foreground font-medium">Saved drafts:</span>
              {draftList.map(d => (
                <span key={`${d.month}_${d.stationId}`} className="inline-flex items-center gap-1 border rounded px-2 py-0.5 bg-background">
                  {d.month}
                  <button onClick={() => loadDraft(d)} className="text-primary hover:underline ml-1">Load</button>
                  <button onClick={() => deleteDraft(d)} className="text-destructive hover:underline ml-1">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Employee table or empty state */}
          {rows.length === 0 ? (
            <div className="border rounded-lg py-12 text-center text-muted-foreground">
              <Calculator className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No employees loaded</p>
              <p className="text-xs mt-1">Configure scope above and click <strong>Load Employees</strong>.</p>
              <p className="text-xs text-amber-600 mt-1">Basic salary must be set in Staff Onboarding for each employee.</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="flex gap-3 flex-wrap">
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">New Records</p>
                  <p className="text-xl font-bold">{eligible.length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">No Salary Set</p>
                  <p className="text-xl font-bold text-amber-600">{rows.filter(r => r.noSalary).length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Existing (skip)</p>
                  <p className="text-xl font-bold text-muted-foreground">{rows.filter(r => r.willSkip).length}</p>
                </CardContent></Card>
                <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Est. Total Net</p>
                  <p className="text-sm font-bold text-green-700">{fmt(totalNet)}</p>
                </CardContent></Card>
              </div>

              {/* Per-employee table */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs min-w-[1040px]">
                  <thead>
                    <tr className="bg-muted/30 border-b text-left">
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Dept</th>
                      <th className="px-2 py-2 text-right">Basic (Ksh)</th>
                      <th className="px-2 py-2 text-right">House Allow</th>
                      <th className="px-2 py-2 text-right">Transport</th>
                      <th className="px-2 py-2 text-right">OT / Bonus</th>
                      <th className="px-2 py-2 text-right">Extra Deduct</th>
                      <th className="px-2 py-2 text-right text-amber-600">BIK</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">SHA</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">NSSF</th>
                      <th className="px-2 py-2 text-right text-muted-foreground">PAYE</th>
                      <th className="px-2 py-2 text-right font-semibold">Est. Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const ov    = overrides[r.employeeId] || { houseAllow: 0, transportAllow: 0, bonus: 0, extraDeduction: 0, benefitInKind: 0, note: "" };
                      const gross = r.basicSalary + (ov.houseAllow||0) + (ov.transportAllow||0) + (ov.bonus||0);
                      const nssf  = calcNSSF(gross);
                      const sha   = calcSHA(gross);
                      const bik   = ov.benefitInKind || 0;
                      const paye  = calcPAYE(gross, nssf, bik);
                      const net   = Math.max(0, gross - sha - nssf - paye - (ov.extraDeduction||0));
                      const skip  = r.willSkip;
                      return (
                        <tr key={r.employeeId} className={`border-b ${skip ? "opacity-40" : r.noSalary ? "bg-amber-50/50" : "hover:bg-muted/20"}`}>
                          <td className="px-3 py-1.5">
                            <div className="font-medium truncate max-w-[140px]">{r.name}</div>
                            <div className="text-muted-foreground text-[10px]">{r.employeeNumber}{skip ? " · existing" : ""}</div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[80px]">{r.department}</td>
                          <td className="px-2 py-1.5 text-right">{fmtNum(r.basicSalary)}</td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.houseAllow || ""} onChange={e => setOv(r.employeeId, "houseAllow", +e.target.value)}
                              className="h-6 w-20 text-xs text-right" placeholder="0" disabled={r.noSalary || skip} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.transportAllow || ""} onChange={e => setOv(r.employeeId, "transportAllow", +e.target.value)}
                              className="h-6 w-20 text-xs text-right" placeholder="0" disabled={r.noSalary || skip} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.bonus || ""} onChange={e => setOv(r.employeeId, "bonus", +e.target.value)}
                              className="h-6 w-20 text-xs text-right" placeholder="0" disabled={r.noSalary || skip} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.extraDeduction || ""} onChange={e => setOv(r.employeeId, "extraDeduction", +e.target.value)}
                              className="h-6 w-20 text-xs text-right text-destructive" placeholder="0" disabled={r.noSalary || skip} />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input type="number" min={0} value={ov.benefitInKind || ""} onChange={e => setOv(r.employeeId, "benefitInKind", +e.target.value)}
                              className="h-6 w-20 text-xs text-right text-amber-700" placeholder="0" disabled={r.noSalary || skip} />
                          </td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{r.noSalary || skip ? "—" : fmtNum(sha)}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{r.noSalary || skip ? "—" : fmtNum(nssf)}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{r.noSalary || skip ? "—" : fmtNum(paye)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">
                            {r.noSalary ? <span className="text-amber-600 font-normal text-[10px]">no salary</span>
                              : skip    ? <span className="text-muted-foreground font-normal text-[10px]">existing</span>
                              :           <span className="text-primary">{fmt(net)}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setRows([]); setOverrides({}); }}>Clear</Button>
                <Button variant="outline" size="sm" onClick={saveDraft}>Save Draft</Button>
                <div className="flex-1" />
                <Button size="sm" onClick={() => { setPrevPage(1); setStep("preview"); }} disabled={eligible.length === 0}>
                  Preview All → ({eligible.length} new)
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════ PREVIEW STEP ═══════════════════════ */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Review &amp; Submit — {month}</h3>
              <p className="text-xs text-muted-foreground">
                Submit creates payroll records for {eligible.length} employee(s). This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("entry")}>← Back to Edit</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !eligible.length}>
                {submitting
                  ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting…</>
                  : `Submit Batch (${eligible.length} employees)`}
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="flex gap-3 flex-wrap">
            <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Will Create</p>
              <p className="text-2xl font-bold text-green-600">{eligible.length}</p>
            </CardContent></Card>
            <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Skipped</p>
              <p className="text-2xl font-bold text-muted-foreground">{rows.filter(r => r.willSkip || r.noSalary).length}</p>
            </CardContent></Card>
            <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Gross</p>
              <p className="text-sm font-bold">{fmt(eligible.reduce((s, r) => {
                const ov = overrides[r.employeeId];
                return s + r.basicSalary + (ov?.houseAllow||0) + (ov?.transportAllow||0) + (ov?.bonus||0);
              }, 0))}</p>
            </CardContent></Card>
            <Card className="flex-1 min-w-[100px]"><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Net</p>
              <p className="text-sm font-bold text-green-700">{fmt(totalNet)}</p>
            </CardContent></Card>
          </div>

          {/* Read-only preview table */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs min-w-[1150px]">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left">Employee</th>
                  <th className="px-2 py-2 text-left">Dept</th>
                  <th className="px-2 py-2 text-right">Basic</th>
                  <th className="px-2 py-2 text-right">House</th>
                  <th className="px-2 py-2 text-right">Transport</th>
                  <th className="px-2 py-2 text-right">OT/Bonus</th>
                  <th className="px-2 py-2 text-right text-amber-600">BIK</th>
                  <th className="px-2 py-2 text-right">Gross</th>
                  <th className="px-2 py-2 text-right text-muted-foreground">SHA</th>
                  <th className="px-2 py-2 text-right text-muted-foreground">NSSF</th>
                  <th className="px-2 py-2 text-right text-muted-foreground">PAYE</th>
                  <th className="px-2 py-2 text-right">Extra Ded.</th>
                  <th className="px-2 py-2 text-right font-bold">Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {prevSlice.map(r => {
                  const ov    = overrides[r.employeeId];
                  const house = ov?.houseAllow     || 0;
                  const tran  = ov?.transportAllow || 0;
                  const ot    = ov?.bonus          || 0;
                  const extra = ov?.extraDeduction || 0;
                  const bik   = ov?.benefitInKind  || 0;
                  const gross = r.basicSalary + house + tran + ot;
                  const nssf  = calcNSSF(gross);
                  const sha   = calcSHA(gross);
                  const paye  = calcPAYE(gross, nssf, bik);
                  const net   = Math.max(0, gross - sha - nssf - paye - extra);
                  return (
                    <tr key={r.employeeId} className="border-t hover:bg-muted/20">
                      <td className="px-2 py-1.5"><div className="font-medium">{r.name}</div><div className="text-muted-foreground text-[10px]">{r.employeeNumber}</div></td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.department}</td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(r.basicSalary)}</td>
                      <td className="px-2 py-1.5 text-right">{house ? fmtNum(house) : "—"}</td>
                      <td className="px-2 py-1.5 text-right">{tran  ? fmtNum(tran)  : "—"}</td>
                      <td className="px-2 py-1.5 text-right">{ot    ? fmtNum(ot)    : "—"}</td>
                      <td className="px-2 py-1.5 text-right text-amber-700">{bik   ? fmtNum(bik)   : "—"}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{fmtNum(gross)}</td>
                      <td className="px-2 py-1.5 text-right text-muted-foreground">{fmtNum(sha)}</td>
                      <td className="px-2 py-1.5 text-right text-muted-foreground">{fmtNum(nssf)}</td>
                      <td className="px-2 py-1.5 text-right text-muted-foreground">{fmtNum(paye)}</td>
                      <td className="px-2 py-1.5 text-right text-destructive">{extra ? fmtNum(extra) : "—"}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-primary">{fmtNum(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/30 font-semibold border-t-2">
                <tr>
                  <td className="px-2 py-1.5" colSpan={2}>Totals ({eligible.length})</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => s + r.basicSalary, 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => s + (overrides[r.employeeId]?.houseAllow||0), 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => s + (overrides[r.employeeId]?.transportAllow||0), 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => s + (overrides[r.employeeId]?.bonus||0), 0))}</td>
                  <td className="px-2 py-1.5 text-right text-amber-700">{fmtNum(eligible.reduce((s,r) => s + (overrides[r.employeeId]?.benefitInKind||0), 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => {
                    const ov = overrides[r.employeeId];
                    return s + r.basicSalary + (ov?.houseAllow||0) + (ov?.transportAllow||0) + (ov?.bonus||0);
                  }, 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => { const ov = overrides[r.employeeId]; const g = r.basicSalary+(ov?.houseAllow||0)+(ov?.transportAllow||0)+(ov?.bonus||0); return s+calcSHA(g); }, 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => { const ov = overrides[r.employeeId]; const g = r.basicSalary+(ov?.houseAllow||0)+(ov?.transportAllow||0)+(ov?.bonus||0); return s+calcNSSF(g); }, 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => { const ov = overrides[r.employeeId]; const g = r.basicSalary+(ov?.houseAllow||0)+(ov?.transportAllow||0)+(ov?.bonus||0); const n=calcNSSF(g); return s+calcPAYE(g,n,ov?.benefitInKind||0); }, 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(eligible.reduce((s,r) => s + (overrides[r.employeeId]?.extraDeduction||0), 0))}</td>
                  <td className="px-2 py-1.5 text-right">{fmtNum(totalNet)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {prevPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing {(prevPage-1)*PAGE_SZ+1}–{Math.min(prevPage*PAGE_SZ, eligible.length)} of {eligible.length}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={prevPage <= 1} onClick={() => setPrevPage(p => p-1)}>Prev</Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={prevPage >= prevPages} onClick={() => setPrevPage(p => p+1)}>Next</Button>
              </div>
            </div>
          )}

          {/* Irreversibility warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Submitting creates {eligible.length} payroll record(s) as <strong>Pending</strong>. Records appear in the <strong>Records tab</strong> and can be marked Paid via the <strong>Run Payroll tab</strong>.
          </div>

          {/* Bottom actions */}
          <div className="flex gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setStep("entry")}>← Back to Edit</Button>
            <Button variant="outline" size="sm" onClick={saveDraft}>Save Draft</Button>
            <div className="flex-1" />
            <Button onClick={handleSubmit} disabled={submitting || !eligible.length}>
              {submitting ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting…</> : `Submit Batch (${eligible.length} employees)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
