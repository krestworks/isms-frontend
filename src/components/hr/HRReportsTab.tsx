import { useState } from "react";
import { Download, FileText, Users, Calendar, DollarSign, AlertTriangle, TrendingUp, FileWarning } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ModalForm } from "@/components/shared/ModalForm";
import { useToast } from "@/hooks/use-toast";

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

export default function HRReportsTab() {
  const { toast } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [period, setPeriod] = useState("this_month");
  const [department, setDepartment] = useState("all");
  const [format, setFormat] = useState("pdf");

  const generate = () => {
    toast({ title: "Report queued", description: `${REPORTS.find(r => r.id === open)?.title} (${format.toUpperCase()}) — generation started.` });
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

      <ModalForm open={!!open} onClose={() => setOpen(null)} title={current?.title || ""} description={current?.desc} onSubmit={generate} submitLabel="Generate">
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
              <SelectContent>{["pdf", "excel", "csv"].map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
