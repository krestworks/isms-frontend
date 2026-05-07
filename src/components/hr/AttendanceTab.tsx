import { useMemo, useState } from "react";
import { Download, RefreshCw, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useDerivedAttendance, attendanceStore, DerivedAttendance, useCorrectionRequests, CorrectionRequest } from "@/data/shiftsStore";
import { exportToCsv } from "@/lib/exportCsv";
import { sessionStore, useSession } from "@/data/sessionStore";
import { isLocationVisible } from "@/lib/permissions";
import { toast } from "sonner";

const APPROVER_ROLES = ["Admin", "Manager"];

export default function AttendanceTab() {
  useSession();
  const all = useDerivedAttendance();
  const requests = useCorrectionRequests();
  const activeLoc = sessionStore.activeLocation();
  const data = useMemo(() => all.filter(a => isLocationVisible(a.location)), [all, activeLoc]);
  const pending = requests.filter(r => r.status === "pending");
  const isApprover = APPROVER_ROLES.includes(sessionStore.user().activeRole);
  const [viewing, setViewing] = useState<DerivedAttendance | null>(null);
  const [editing, setEditing] = useState<DerivedAttendance | null>(null);
  const [form, setForm] = useState({ clockIn: "", clockOut: "", reason: "" });
  const [reviewing, setReviewing] = useState<CorrectionRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const stats = {
    total: data.length,
    completed: data.filter(d => d.status === "completed").length,
    inProgress: data.filter(d => d.status === "in_progress").length,
    absent: data.filter(d => d.status === "absent").length,
  };

  const columns: Column<DerivedAttendance>[] = [
    { key: "id", label: "ID" },
    { key: "employeeName", label: "Employee", sortable: true },
    { key: "department", label: "Dept" },
    { key: "date", label: "Date", sortable: true },
    { key: "shift", label: "Shift", render: i => <Badge variant="outline">{i.shift}</Badge> },
    { key: "scheduledStart", label: "Scheduled", render: i => `${i.scheduledStart}–${i.scheduledEnd}` },
    { key: "clockIn", label: "In", render: i => i.clockIn || "—" },
    { key: "clockOut", label: "Out", render: i => i.clockOut || "—" },
    { key: "hoursWorked", label: "Hrs", render: i => i.hoursWorked > 0 ? `${i.hoursWorked}h` : "—" },
    { key: "status", label: "Status", render: i => <StatusBadge status={i.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "department", label: "Dept", options: ["Fuel", "LPG", "Water", "Automotive", "Car Wash", "Inventory"].map(d => ({ label: d, value: d })) },
    { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "In Progress", value: "in_progress" }, { label: "Completed", value: "completed" }, { label: "Absent", value: "absent" }] },
  ];

  const handleExport = () => exportToCsv(`attendance-${new Date().toISOString().split("T")[0]}.csv`, data);
  const handleRefresh = () => toast.success("Attendance synced from latest shift schedules");

  const punch = (rec: DerivedAttendance, kind: "in" | "out") => {
    const now = new Date().toTimeString().slice(0, 5);
    attendanceStore.punch(rec.employeeId, rec.date, kind, now);
    toast.success(`Clock ${kind === "in" ? "in" : "out"} recorded for ${rec.employeeName}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Attendance</h3>
          <p className="text-sm text-muted-foreground">Auto-derived from shift schedule · scope: {activeLoc}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}><RefreshCw className="h-4 w-4 mr-2" /> Sync</Button>
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Scheduled", value: stats.total },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
          { label: "In Progress", value: stats.inProgress, color: "text-primary" },
          { label: "Absent", value: stats.absent, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable<DerivedAttendance> data={data} columns={columns} searchKeys={["employeeName", "id"]} searchPlaceholder="Search attendance..." filters={filters} onView={(i) => setViewing(i)} actions={(r) => (
        <div className="flex gap-1">
          {!r.clockIn && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => punch(r, "in")}>In</Button>}
          {r.clockIn && !r.clockOut && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => punch(r, "out")}>Out</Button>}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(r); setForm({ clockIn: r.clockIn, clockOut: r.clockOut, reason: "" }); }}><Pencil className="h-3 w-3" /></Button>
        </div>
      )} />

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Attendance" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date}</div>
            <div><span className="text-muted-foreground">Shift:</span> {viewing.shift}</div>
            <div><span className="text-muted-foreground">Scheduled:</span> {viewing.scheduledStart}–{viewing.scheduledEnd}</div>
            <div><span className="text-muted-foreground">Clock In:</span> {viewing.clockIn || "—"}</div>
            <div><span className="text-muted-foreground">Clock Out:</span> {viewing.clockOut || "—"}</div>
            <div><span className="text-muted-foreground">Hours:</span> {viewing.hoursWorked || "—"}</div>
            <div><span className="text-muted-foreground">Location:</span> {viewing.location || "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            {viewing.corrected && <div className="col-span-2 p-2 rounded bg-amber-50 text-xs"><Badge variant="outline" className="mr-2">Manually corrected</Badge>by {viewing.correctedBy} — "{viewing.correctionReason}"</div>}
          </div>
        )}
      </ModalForm>

      <ModalForm open={!!editing} onClose={() => setEditing(null)} title="Manual Attendance Correction" submitLabel="Save Correction" onSubmit={() => {
        if (!editing) return;
        if (!form.reason.trim()) return toast.error("Reason is required for audit");
        attendanceStore.correct(editing.employeeId, editing.date, form.clockIn, form.clockOut, sessionStore.user().name, form.reason);
        toast.success("Attendance corrected");
        setEditing(null);
      }}>
        {editing && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{editing.employeeName} · {editing.date} · scheduled {editing.scheduledStart}–{editing.scheduledEnd}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Clock In</Label><Input type="time" value={form.clockIn} onChange={e => setForm(f => ({ ...f, clockIn: e.target.value }))} /></div>
              <div><Label>Clock Out</Label><Input type="time" value={form.clockOut} onChange={e => setForm(f => ({ ...f, clockOut: e.target.value }))} /></div>
            </div>
            <div><Label>Reason for correction *</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g., biometric scanner failure, employee forgot to clock out" /></div>
            <p className="text-xs text-muted-foreground">Logged as audit entry by {sessionStore.user().name}</p>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
