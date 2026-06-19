import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, ChevronLeft, Download, Eye, FileText, List, CalendarDays,
  Plus, RefreshCw, X, AlertCircle, Upload,
} from "lucide-react";
import { getAccessToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  hrApi, ApiLeaveRequest, ApiLeaveType, ApiLeaveBalance, ApiEmployee, ApiPublicHoliday,
} from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";
import { LeaveCalendar } from "@/components/shared/LeaveCalendar";

// ── Sub-tab types ─────────────────────────────────────────────────────────────
type SubTab = "requests" | "entitlements" | "periods" | "calendar";
type RequestFilter = "Pending" | "Approved" | "Rejected" | "Cancelled" | "All";

// ── Leave Request Detail / Management modal ────────────────────────────────────
function LeaveRequestDetail({
  req, leaveTypes, onClose, onRefresh, canApprove, canManage,
}: {
  req: ApiLeaveRequest;
  leaveTypes: ApiLeaveType[];
  onClose: () => void;
  onRefresh: () => void;
  canApprove: boolean;
  canManage: boolean;
}) {
  const [approveNote, setApproveNote] = useState("");
  const [adjustDate, setAdjustDate]   = useState("");
  const [adjustNote, setAdjustNote]   = useState("");
  const [acting, setActing] = useState(false);
  const lt = leaveTypes.find(t => t.id === req.leaveTypeId);

  const act = async (action: "approve" | "reject") => {
    if (action === "reject" && !approveNote.trim()) return toast.error("Note is required to reject");
    setActing(true);
    try {
      await hrApi.leaves.approve(req.id, action, approveNote || undefined);
      toast.success(action === "approve" ? "Leave approved" : "Leave rejected");
      onRefresh(); onClose();
    } catch (e: any) { toast.error(e?.message || "Action failed"); }
    finally { setActing(false); }
  };

  const adjust = async () => {
    if (!adjustDate) return toast.error("Return date is required");
    setActing(true);
    try {
      await hrApi.leaves.adjust(req.id, adjustDate, adjustNote || undefined);
      toast.success("Leave adjusted successfully");
      onRefresh(); onClose();
    } catch (e: any) { toast.error(e?.message || "Adjust failed"); }
    finally { setActing(false); }
  };

  const slipRef = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground mr-1">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-semibold">Leave Request</h2>
              <p className="text-xs text-muted-foreground font-mono">{req.leaveRef || req.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <StatusBadge status={req.status} />
        </div>

        <div className="p-6 space-y-5">
          {/* Employee + Leave Type */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Employee</p>
              <p className="font-medium">{req.employee?.user?.name || "—"}</p>
              <p className="text-xs text-muted-foreground">{req.employee?.user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Leave Type</p>
              <p className="font-medium">{req.leaveType?.name || "—"}</p>
              <Badge variant={req.leaveType?.isPaid ? "secondary" : "outline"} className="text-xs mt-1">
                {req.leaveType?.isPaid ? "Paid" : "Unpaid"}
              </Badge>
              {lt?.requiresDocument && (
                <Badge variant="outline" className="text-xs mt-1 ml-1 border-amber-400 text-amber-700">
                  <AlertCircle className="h-3 w-3 mr-0.5" /> Requires Document
                </Badge>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 bg-muted/40 rounded-lg p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-medium">{req.startDate?.split("T")[0]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-medium">{req.endDate?.split("T")[0]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-bold text-lg">{req.isHalfDay ? `½ (${req.halfDayPeriod || "AM"})` : `${req.days}d`}</p>
            </div>
          </div>

          {/* Reason */}
          {req.reason && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Reason</p>
              <p className="text-sm bg-muted/40 rounded-lg p-3">{req.reason}</p>
            </div>
          )}

          {/* HR Note */}
          {req.note && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">HR Note</p>
              <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">{req.note}</p>
            </div>
          )}

          {/* Applied / Approved info */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Applied: {req.createdAt?.split("T")[0]}</p>
            {req.approvedAt && <p>Decision: {req.approvedAt.split("T")[0]} by {req.approvedBy || "HR"}</p>}
            {req.appliedBy && <p>Applied on behalf by HR</p>}
          </div>

          {/* ── Actions ── */}
          {canApprove && req.status === "Pending" && (
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Take Action</p>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="Note / reason (required to reject)" className="text-sm h-20" />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => act("approve")} disabled={acting}>
                  <Check className="h-4 w-4 mr-2" /> Approve
                </Button>
                <Button variant="outline" className="flex-1 text-destructive border-destructive/40" onClick={() => act("reject")} disabled={acting}>
                  <X className="h-4 w-4 mr-2" /> Reject
                </Button>
              </div>
            </div>
          )}

          {/* ── Adjust days (set return date) ── */}
          {canApprove && ["Pending", "Approved"].includes(req.status) && (
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Adjust Days (Set Return Date)</p>
              <p className="text-xs text-muted-foreground">
                If the employee returns early, set a new end date. Days will be recalculated and the leave balance updated.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">New Return Date</Label>
                  <Input type="date" value={adjustDate} onChange={e => setAdjustDate(e.target.value)}
                    min={req.startDate?.split("T")[0]} max={req.endDate?.split("T")[0]} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Note</Label>
                  <Input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Optional" className="text-sm" />
                </div>
              </div>
              <Button variant="outline" onClick={adjust} disabled={acting || !adjustDate}>
                <FileText className="h-4 w-4 mr-2" /> Apply Adjustment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Leave Requests sub-tab ─────────────────────────────────────────────────────
function RequestsTab({
  canApprove, canManage, canSubmit, isManager, leaveTypes, employees, holidays,
}: {
  canApprove: boolean; canManage: boolean; canSubmit: boolean; isManager: boolean;
  leaveTypes: ApiLeaveType[]; employees: ApiEmployee[]; holidays: ApiPublicHoliday[];
}) {
  const [requests, setRequests] = useState<ApiLeaveRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<RequestFilter>("Pending");
  const [viewing, setViewing]   = useState<ApiLeaveRequest | null>(null);
  const [submitOpen, setSubmitOpen]       = useState(false);
  const [applyForEmployee, setApplyForEmployee] = useState(false);
  const [saving, setSaving]               = useState(false);

  const emptyForm = {
    leaveTypeId: "", startDate: "", endDate: "", reason: "",
    isHalfDay: false, halfDayPeriod: "AM" as "AM" | "PM",
    employeeId: "", documentFile: null as File | null,
  };
  const [form, setForm] = useState(emptyForm);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter !== "All") params.status = filter;
      const res = await hrApi.leaves.list(params);
      setRequests(res.data ?? []);
    } catch { toast.error("Failed to load leave requests"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.leaveTypeId || !form.startDate) return toast.error("Fill all required fields");
    if (!form.isHalfDay && !form.endDate)     return toast.error("End date is required");
    setSaving(true);
    try {
      await hrApi.leaves.submit({
        leaveTypeId:  form.leaveTypeId,
        startDate:    form.startDate,
        endDate:      form.isHalfDay ? form.startDate : form.endDate,
        reason:       form.reason || undefined,
        isHalfDay:    form.isHalfDay || undefined,
        halfDayPeriod: form.isHalfDay ? form.halfDayPeriod : undefined,
        employeeId:   applyForEmployee ? (form.employeeId || undefined) : undefined,
      });
      toast.success(applyForEmployee ? "Leave applied for employee" : "Leave request submitted");
      setSubmitOpen(false);
      setForm(emptyForm);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to submit"); }
    finally { setSaving(false); }
  };

  const handleExport = async () => {
    try {
      const base  = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (filter !== "All") params.set("status", filter);
      const res = await fetch(`${base}/hr/leaves/export?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok) { toast.error("Export failed"); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `leaves-${filter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch { toast.error("Export failed"); }
  };

  const selectedType = leaveTypes.find(t => t.id === form.leaveTypeId);

  const FILTERS: RequestFilter[] = ["Pending", "Approved", "Rejected", "Cancelled", "All"];

  const columns: Column<ApiLeaveRequest>[] = [
    { key: "leaveRef",   label: "Ref",      render: r => <span className="font-mono text-xs">{r.leaveRef || r.id.slice(-8).toUpperCase()}</span> },
    { key: "employee",   label: "Employee",  render: r => r.employee?.user?.name || "—", sortable: true },
    { key: "leaveTypeId",label: "Type",      render: r => <Badge variant="secondary">{r.leaveType?.name || "—"}</Badge> },
    { key: "startDate",  label: "From",      sortable: true, render: r => r.startDate?.split("T")[0] },
    { key: "endDate",    label: "To",        render: r => r.endDate?.split("T")[0] },
    { key: "days",       label: "Days",      render: r => r.isHalfDay ? `½ (${r.halfDayPeriod || "AM"})` : r.days },
    { key: "status",     label: "Status",    render: r => <StatusBadge status={r.status} /> },
    { key: "createdAt",  label: "Applied",   render: r => r.createdAt?.split("T")[0] },
  ];

  return (
    <div className="space-y-4">
      {viewing && (
        <LeaveRequestDetail
          req={viewing} leaveTypes={leaveTypes}
          onClose={() => setViewing(null)} onRefresh={load}
          canApprove={canApprove} canManage={canManage}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Status filter tabs */}
        <div className="flex rounded-lg border overflow-hidden">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"} ${f !== "Pending" ? "border-l" : ""}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          {canSubmit && (
            <Button onClick={() => { setApplyForEmployee(false); setSubmitOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Request Leave
            </Button>
          )}
          {isManager && (
            <Button variant="outline" onClick={() => { setApplyForEmployee(true); setSubmitOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Apply for Employee
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {filter === "All" && (
        <div className="grid grid-cols-4 gap-3">
          {(["Pending", "Approved", "Rejected", "Cancelled"] as const).map(s => (
            <Card key={s} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setFilter(s)}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{s}</p>
                <p className="text-xl font-bold">{requests.filter(r => r.status === s).length}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DataTable
        data={requests}
        columns={columns}
        searchKeys={["leaveRef", "employee"]}
        searchPlaceholder="Search leave requests…"
        actions={r => (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
      />

      {/* Submit leave modal */}
      <ModalForm open={submitOpen} onClose={() => setSubmitOpen(false)}
        title={applyForEmployee ? "Apply Leave for Employee" : "Request Leave"}
        description={applyForEmployee ? "Submit a leave request on behalf of an employee" : "Submit a leave request"}
        onSubmit={handleSubmit} submitLabel="Submit" loading={saving}>
        <div className="space-y-4">
          {applyForEmployee && (
            <div>
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={v => set("employeeId", v)}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Leave Type</Label>
            <Select value={form.leaveTypeId} onValueChange={v => set("leaveTypeId", v)}>
              <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
              <SelectContent>{leaveTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.daysAllowed}d · {t.isPaid ? "Paid" : "Unpaid"})</SelectItem>)}</SelectContent>
            </Select>
            {selectedType?.requiresDocument && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> This leave type requires supporting documentation</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isHalfDay} onCheckedChange={v => set("isHalfDay", v)} id="half" />
            <Label htmlFor="half">Half Day</Label>
            {form.isHalfDay && (
              <Select value={form.halfDayPeriod} onValueChange={v => set("halfDayPeriod", v)}>
                <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} /></div>
            {!form.isHalfDay && <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} min={form.startDate} /></div>}
          </div>
          <div><Label>Reason (optional)</Label><Textarea value={form.reason} onChange={e => set("reason", e.target.value)} rows={3} placeholder="Reason for leave…" /></div>
          {selectedType?.requiresDocument && (
            <div><Label>Supporting Document</Label><Input type="file" className="text-sm" /></div>
          )}
        </div>
      </ModalForm>
    </div>
  );
}

// ── Entitlements sub-tab ──────────────────────────────────────────────────────
function EntitlementsTab({
  canManage, employees, leaveTypes,
}: {
  canManage: boolean; employees: ApiEmployee[]; leaveTypes: ApiLeaveType[];
}) {
  const [balances, setBalances]   = useState<(ApiLeaveBalance & { employee?: ApiEmployee })[]>([]);
  const [loading, setLoading]     = useState(true);
  const [empFilter, setEmpFilter] = useState("");
  const [year, setYear]           = useState(new Date().getFullYear());
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ employeeId: "", leaveTypeId: "", year: new Date().getFullYear(), total: "", note: "" });
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (empFilter) {
        const res = await hrApi.leaves.balances({ employeeId: empFilter, year });
        const emp = employees.find(e => e.id === empFilter);
        setBalances((res.data ?? []).map(b => ({ ...b, employee: emp })));
      } else {
        // Load all employees' balances (one by one or a few at a time)
        const sample = employees.slice(0, 50);
        const all: any[] = [];
        for (const emp of sample) {
          try {
            const r = await hrApi.leaves.balances({ employeeId: emp.id, year });
            (r.data ?? []).forEach(b => all.push({ ...b, employee: emp }));
          } catch { /* skip */ }
        }
        setBalances(all);
      }
    } catch { toast.error("Failed to load entitlements"); }
    finally { setLoading(false); }
  }, [empFilter, year, employees]);

  useEffect(() => { if (employees.length > 0) load(); }, [load, employees]);

  const doAdjust = async () => {
    if (!adjustForm.employeeId || !adjustForm.leaveTypeId || !adjustForm.total) return toast.error("All fields required");
    setAdjusting(true);
    try {
      await hrApi.leaves.adjustBalance({
        employeeId: adjustForm.employeeId,
        leaveTypeId: adjustForm.leaveTypeId,
        year: adjustForm.year,
        total: parseFloat(adjustForm.total),
        note: adjustForm.note || undefined,
      });
      toast.success("Balance adjusted");
      setAdjustOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setAdjusting(false); }
  };

  const setAdj = (k: string, v: any) => setAdjustForm(f => ({ ...f, [k]: v }));

  const columns: Column<ApiLeaveBalance & { employee?: ApiEmployee }>[] = [
    { key: "employee",    label: "Employee",  render: b => b.employee?.user?.name || "—" },
    { key: "leaveType",   label: "Leave Type", render: b => <Badge variant="secondary">{b.leaveType?.name}</Badge> },
    { key: "year",        label: "Year" },
    { key: "total",       label: "Entitlement", render: b => <span className="font-medium">{b.total}d</span> },
    { key: "used",        label: "Used",       render: b => <span className="text-red-600">{b.used}d</span> },
    { key: "pending",     label: "Pending",    render: b => <span className="text-amber-600">{b.pending}d</span> },
    { key: "available",   label: "Available",  render: b => <span className="font-bold text-green-700">{b.available}d</span> },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-medium">Leave Entitlements / Balances</h4>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={year.toString()} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={empFilter} onValueChange={setEmpFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All employees</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && <Button onClick={() => setAdjustOpen(true)}><Plus className="h-4 w-4 mr-2" /> Adjust Entitlement</Button>}
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <DataTable data={balances} columns={columns} searchKeys={["year"]} searchPlaceholder="Filter…" />

      <ModalForm open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust Leave Entitlement"
        description="Set or override an employee's leave balance for the year"
        onSubmit={doAdjust} submitLabel="Adjust" loading={adjusting}>
        <div className="space-y-4">
          <div><Label>Employee</Label>
            <Select value={adjustForm.employeeId} onValueChange={v => setAdj("employeeId", v)}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Leave Type</Label>
            <Select value={adjustForm.leaveTypeId} onValueChange={v => setAdj("leaveTypeId", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{leaveTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Year</Label>
              <Select value={adjustForm.year.toString()} onValueChange={v => setAdj("year", parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Total Days</Label><Input type="number" step="0.5" value={adjustForm.total} onChange={e => setAdj("total", e.target.value)} placeholder="e.g. 21" /></div>
          </div>
          <div><Label>Note</Label><Input value={adjustForm.note} onChange={e => setAdj("note", e.target.value)} placeholder="Reason for adjustment" /></div>
        </div>
      </ModalForm>
    </div>
  );
}

// ── Leave Periods sub-tab ─────────────────────────────────────────────────────
function PeriodsTab({ leaveTypes, employees }: { leaveTypes: ApiLeaveType[]; employees: ApiEmployee[] }) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState<{ year: number; totalRequests: number; approved: number; rejected: number; pending: number; totalDays: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        years.map(async y => {
          const res = await hrApi.leaves.list({ page: 1 } as any);
          const data = (res.data ?? []).filter((r: ApiLeaveRequest) => r.startDate?.startsWith(y.toString()));
          return {
            year: y,
            totalRequests: data.length,
            approved:  data.filter((r: ApiLeaveRequest) => r.status === "Approved").length,
            rejected:  data.filter((r: ApiLeaveRequest) => r.status === "Rejected").length,
            pending:   data.filter((r: ApiLeaveRequest) => r.status === "Pending").length,
            totalDays: data.filter((r: ApiLeaveRequest) => r.status === "Approved").reduce((s: number, r: ApiLeaveRequest) => s + r.days, 0),
          };
        })
      );
      setSummary(results);
    } catch { toast.error("Failed to load period data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Leave Periods Summary</h4>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {summary.map(s => (
          <Card key={s.year} className={s.year === new Date().getFullYear() ? "border-primary/40" : ""}>
            <CardContent className="p-4">
              <p className="font-bold text-lg">{s.year}</p>
              {s.year === new Date().getFullYear() && <Badge variant="secondary" className="text-xs mb-2">Current</Badge>}
              <div className="space-y-1 text-sm mt-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Approved</span><span className="text-green-600 font-medium">{s.approved}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="text-amber-600 font-medium">{s.pending}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rejected</span><span className="text-red-600 font-medium">{s.rejected}</span></div>
                <div className="flex justify-between border-t pt-1 mt-1"><span className="text-muted-foreground">Days taken</span><span className="font-bold">{s.totalDays}d</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        Leave periods run by calendar year. Configure leave types and entitlements in HR Setup.
      </div>
    </div>
  );
}

// ── Main LeaveManagementTab ────────────────────────────────────────────────────
export default function LeaveManagementTab() {
  const [subTab, setSubTab] = useState<SubTab>("requests");
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveType[]>([]);
  const [employees,  setEmployees]  = useState<ApiEmployee[]>([]);
  const [holidays,   setHolidays]   = useState<ApiPublicHoliday[]>([]);
  const [initLoading, setInitLoading] = useState(true);

  const can = usePermissions();
  const canSubmit  = can("hr.leaves.view");
  const canApprove = can("hr.leaves.approve");
  const canManage  = can("hr.leaves.manage");
  const isManager  = canApprove || canManage;

  useEffect(() => {
    Promise.all([
      hrApi.leaveTypes.list(),
      hrApi.holidays.list(),
      isManager ? hrApi.employees.list({ limit: 200 }) : Promise.resolve({ data: [] }),
    ]).then(([typesRes, holRes, empRes]) => {
      setLeaveTypes(typesRes.data ?? []);
      setHolidays(holRes.data ?? []);
      setEmployees((empRes as any).data ?? []);
    }).catch(() => toast.error("Failed to load leave data"))
      .finally(() => setInitLoading(false));
  }, [isManager]);

  if (initLoading) return <div className="p-10 text-center text-muted-foreground text-sm">Loading leave management…</div>;

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: "requests",     label: "Leave Requests" },
    { key: "entitlements", label: "Entitlements" },
    { key: "periods",      label: "Leave Periods" },
    { key: "calendar",     label: "Calendar" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Management</h3>
          <p className="text-sm text-muted-foreground">Review, approve and track employee leave</p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        {SUB_TABS.map((t, i) => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors ${subTab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"} ${i > 0 ? "border-l" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "requests" && (
        <RequestsTab
          canApprove={canApprove} canManage={canManage} canSubmit={canSubmit} isManager={isManager}
          leaveTypes={leaveTypes} employees={employees} holidays={holidays}
        />
      )}
      {subTab === "entitlements" && (
        <EntitlementsTab canManage={canManage} employees={employees} leaveTypes={leaveTypes} />
      )}
      {subTab === "periods" && (
        <PeriodsTab leaveTypes={leaveTypes} employees={employees} />
      )}
      {subTab === "calendar" && (
        <LeaveCalendar />
      )}
    </div>
  );
}
