import { useState } from "react";
import { Download, FileText, Users, Calendar, DollarSign, AlertTriangle, TrendingUp, FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ModalForm } from "@/components/shared/ModalForm";
import { toast } from "sonner";
import { hrApi } from "@/lib/hrApi";
import { useDocuments } from "@/data/documentsStore";
import { exportToCsv } from "@/lib/exportCsv";

const REPORTS = [
  { id: "headcount",    title: "Headcount & Turnover",            desc: "Active, onboarding, exits by department",        icon: Users },
  { id: "attendance",   title: "Attendance Summary",              desc: "Clock-ins, clock-outs & absence by period",      icon: Calendar },
  { id: "leave",        title: "Leave Balances & Usage",          desc: "Annual, sick, compassionate per employee",       icon: Calendar },
  { id: "payroll",      title: "Payroll Register",                desc: "Gross, statutory deductions & net pay run",      icon: DollarSign },
  { id: "statutory",    title: "Statutory Returns (PAYE/SHA/NSSF)", desc: "Monthly remittance schedules",               icon: DollarSign },
  { id: "discipline",   title: "Disciplinary Cases",              desc: "Open / closed cases with stage breakdown",       icon: AlertTriangle },
  { id: "performance",  title: "Performance & Tasks",             desc: "Task completion, ratings, overdue items",        icon: TrendingUp },
  { id: "documents",    title: "Document Compliance",             desc: "Expiring & expired employee documents",          icon: FileWarning },
];

function periodToRange(period: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const p = (n: number) => String(n).padStart(2, "0");
  const fmt = (dt: Date) => `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
  switch (period) {
    case "today": return { from: fmt(now), to: fmt(now) };
    case "this_week": {
      const wd = now.getDay();
      const mon = new Date(now); mon.setDate(d - (wd === 0 ? 6 : wd - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: fmt(mon), to: fmt(sun) };
    }
    case "this_month": return { from: `${y}-${p(m + 1)}-01`, to: fmt(now) };
    case "last_month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const ld = new Date(ly, lm + 1, 0).getDate();
      return { from: `${ly}-${p(lm + 1)}-01`, to: `${ly}-${p(lm + 1)}-${ld}` };
    }
    case "this_quarter": {
      const q = Math.floor(m / 3) * 3;
      return { from: `${y}-${p(q + 1)}-01`, to: fmt(now) };
    }
    default: return { from: `${y}-01-01`, to: fmt(now) };
  }
}

export default function HRReportsTab() {
  const docs = useDocuments();
  const [open, setOpen] = useState<string | null>(null);
  const [period, setPeriod] = useState("this_month");
  const [department, setDepartment] = useState("all");
  const [format, setFormat] = useState("csv");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!open) return;
    setLoading(true);
    try {
      const { from, to } = periodToRange(period);
      let rows: Record<string, any>[] = [];
      const byDept = <T extends { department?: { name?: string } | null }>(list: T[]) =>
        department === "all" ? list : list.filter(e => e.department?.name === department);

      if (open === "headcount") {
        const res = await hrApi.employees.list({ limit: 500 } as any);
        rows = byDept(res.data ?? []).map(e => ({
          employeeNo: e.employeeNumber, name: e.user?.name ?? "—",
          department: e.department?.name ?? "—", jobTitle: e.jobTitle?.title ?? "—",
          email: e.user?.email ?? "—", startDate: e.startDate, status: e.status,
          employmentType: e.employmentType,
        }));
      } else if (open === "attendance") {
        const res = await hrApi.attendance.list({ from, to, limit: 1000 } as any);
        const list = (res.data ?? []).filter(a =>
          department === "all" || (a as any).employee?.department?.name === department
        );
        rows = list.map(a => ({
          employee: a.employee?.user?.name ?? a.employeeId, date: a.date,
          checkIn: a.checkIn ?? "—", checkOut: a.checkOut ?? "—",
          status: a.status, note: a.note ?? "",
        }));
      } else if (open === "leave") {
        const res = await hrApi.leaves.list({ limit: 500 } as any);
        rows = (res.data ?? []).map(l => ({
          employee: l.employee?.user?.name ?? l.employeeId,
          leaveType: l.leaveType?.name ?? l.leaveTypeId,
          startDate: l.startDate, endDate: l.endDate, days: l.days,
          paid: l.leaveType?.isPaid ? "Yes" : "No", status: l.status,
          submittedAt: l.createdAt?.split("T")[0],
        }));
      } else if (open === "payroll" || open === "statutory") {
        const res = await hrApi.payroll.list({ limit: 500 } as any);
        const list = byDept(res.data ?? []);
        rows = open === "statutory"
          ? list.map(pr => ({
              employee: pr.employee?.user?.name ?? pr.employeeId,
              employeeNo: pr.employee?.employeeNumber ?? "—",
              month: pr.month, paye: pr.paye, sha: pr.nhif, nssf: pr.nssf,
            }))
          : list.map(pr => ({
              employee: pr.employee?.user?.name ?? pr.employeeId,
              department: pr.employee?.department?.name ?? "—",
              month: pr.month, basicSalary: pr.basicSalary, houseAllowance: pr.houseAllowance,
              transportAllowance: pr.transportAllowance, overtimePay: pr.overtimePay,
              grossPay: pr.grossPay, sha: pr.nhif, nssf: pr.nssf, paye: pr.paye,
              otherDeductions: pr.otherDeductions, totalDeductions: pr.totalDeductions,
              netPay: pr.netPay, status: pr.status, payDate: pr.payDate ?? "—",
            }));
      } else if (open === "discipline") {
        const res = await hrApi.employees.disciplinary.listAll();
        rows = byDept(res.data ?? []).map(dr => ({
          employee: dr.employee?.user?.name ?? dr.employeeId,
          category: dr.category, offence: dr.offence ?? "—",
          date: dr.date?.split("T")[0], stage: dr.stage, outcome: dr.outcome ?? "—",
          hearingDate: dr.hearingDate?.split?.("T")?.[0] ?? "—", reportedBy: dr.reportedBy ?? "—",
        }));
      } else if (open === "performance") {
        const res = await hrApi.performance.list({ limit: 500 } as any);
        rows = byDept(res.data ?? []).map(t => ({
          employee: t.employee?.user?.name ?? t.employeeId,
          title: t.title, category: t.category, dueDate: t.dueDate ?? "—",
          priority: t.priority, status: t.status, rating: t.rating ?? "—",
          assignedBy: t.assignedBy ?? "—",
        }));
      } else if (open === "documents") {
        rows = docs.map(({ fileData, ...d }) => d);
      }

      if (!rows.length) { toast.info("No data for the selected filters."); return; }
      exportToCsv(`hr-${open}-${period}.csv`, rows);
      toast.success(`Exported ${rows.length} rows — ${REPORTS.find(r => r.id === open)?.title}`);
      setOpen(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const current = REPORTS.find(r => r.id === open);
  const hasDeptFilter = ["headcount", "attendance", "payroll", "statutory", "discipline", "performance"].includes(open ?? "");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">HR Reports</h3>
        <p className="text-sm text-muted-foreground">Generate and export HR reports for any period</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {REPORTS.map(r => {
          const Icon = r.icon;
          return (
            <Card key={r.id} className="hover:shadow-md transition cursor-pointer" onClick={() => { setOpen(r.id); setPeriod("this_month"); setDepartment("all"); }}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-4 w-4 text-primary" /></div>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.desc}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2"><Download className="h-3.5 w-3.5 mr-1.5" /> Generate</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ModalForm open={!!open} onClose={() => setOpen(null)} title={current?.title || ""} description={current?.desc} onSubmit={generate} submitLabel={loading ? "Exporting…" : "Export"}>
        <div className="space-y-4">
          {open !== "documents" && (
            <div><Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[["today", "Today"], ["this_week", "This Week"], ["this_month", "This Month"], ["last_month", "Last Month"], ["this_quarter", "This Quarter"], ["this_year", "This Year"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {hasDeptFilter && (
            <div><Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {["Fuel", "LPG", "Water", "Automotive", "Car Wash", "Inventory", "HR", "Finance"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["csv", "excel"].map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Excel exports as CSV (Excel-compatible).</p>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
