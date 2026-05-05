import { useState } from "react";
import { Download, FileText, Users, Calendar, DollarSign, AlertTriangle, TrendingUp, FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ModalForm } from "@/components/shared/ModalForm";
import { useToast } from "@/hooks/use-toast";
import { staffStore } from "@/data/staffStore";
import { deriveAttendance } from "@/data/shiftsStore";
import { exportToCsv } from "@/lib/exportCsv";

const REPORTS = [
  { id: "headcount", title: "Headcount & Turnover", desc: "Active, onboarding, exits by department & location", icon: Users },
  { id: "attendance", title: "Attendance Summary", desc: "Hours worked, lateness & absence by period", icon: Calendar },
  { id: "leave", title: "Leave Balances & Usage", desc: "Annual, sick, compassionate per employee", icon: Calendar },
  { id: "payroll", title: "Payroll Register", desc: "Gross, statutory deductions & net pay run", icon: DollarSign },
  { id: "statutory", title: "Statutory Returns (PAYE/NHIF/NSSF)", desc: "Monthly remittance schedules", icon: DollarSign },
  { id: "discipline", title: "Disciplinary Cases", desc: "Open / closed cases with stage breakdown", icon: AlertTriangle },
  { id: "performance", title: "Performance & Tasks", desc: "Task completion, ratings, overdue items", icon: TrendingUp },
  { id: "documents", title: "Document Compliance", desc: "Expiring & expired employee documents", icon: FileWarning },
];

function buildRows(reportId: string, department: string): Record<string, any>[] {
  const staff = department === "all" ? staffStore.all() : staffStore.all().filter(s => s.department === department);
  switch (reportId) {
    case "headcount":
      return staff.map(s => ({ id: s.id, name: s.name, department: s.department, role: s.role, location: s.location || "—", joinDate: s.joinDate, status: s.status }));
    case "attendance": {
      const att = deriveAttendance().filter(a => department === "all" || a.department === department);
      return att.map(a => ({ id: a.id, employee: a.employeeName, date: a.date, shift: a.shift, scheduled: `${a.scheduledStart}-${a.scheduledEnd}`, clockIn: a.clockIn, clockOut: a.clockOut, hours: a.hoursWorked, status: a.status }));
    }
    case "payroll":
      return staff.map(s => ({ id: s.id, name: s.name, department: s.department, kraPin: s.kraPin || "—", nhif: s.nhifNo || "—", nssf: s.nssfNo || "—", bank: s.bankName || "—", account: s.bankAccount || "—" }));
    case "statutory":
      return staff.filter(s => s.kraPin).map(s => ({ id: s.id, name: s.name, kraPin: s.kraPin, nhif: s.nhifNo, nssf: s.nssfNo }));
    default:
      return staff.map(s => ({ id: s.id, name: s.name, department: s.department, role: s.role, status: s.status }));
  }
}

export default function HRReportsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [period, setPeriod] = useState("this_month");
  const [department, setDepartment] = useState("all");
  const [format, setFormat] = useState("csv");

  const generate = () => {
    if (!open) return;
    const rows = buildRows(open, department);
    if (!rows.length) { toast({ title: "No data", description: "Nothing to export for this filter." }); return; }
    const filename = `hr-${open}-${period}.${format === "csv" ? "csv" : "csv"}`;
    exportToCsv(filename, rows);
    toast({ title: "Report exported", description: `${REPORTS.find(r => r.id === open)?.title} — ${rows.length} rows` });
    setOpen(null);
  };

  const current = REPORTS.find(r => r.id === open);

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
            <Card key={r.id} className="hover:shadow-md transition cursor-pointer" onClick={() => setOpen(r.id)}>
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

      <ModalForm open={!!open} onClose={() => setOpen(null)} title={current?.title || ""} description={current?.desc} onSubmit={generate} submitLabel="Export">
        <div className="space-y-4">
          <div><Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["today", "Today"], ["this_week", "This Week"], ["this_month", "This Month"], ["last_month", "Last Month"], ["this_quarter", "This Quarter"], ["this_year", "This Year"], ["custom", "Custom Range"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {["Fuel", "LPG", "Water", "Automotive", "Car Wash", "Inventory", "HR", "Finance"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
