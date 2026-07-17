import { useCallback, useEffect, useState } from "react";
import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { hrApi, ApiAttendance, ApiEmployee, ApiStation } from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const STATUSES = [
  { value: "Present",  label: "Present"  },
  { value: "Absent",   label: "Absent"   },
  { value: "Late",     label: "Late"     },
  { value: "HalfDay",  label: "Half Day" },
  { value: "OnLeave",  label: "On Leave" },
];

function calcHours(checkIn?: string | null, checkOut?: string | null): string {
  if (!checkIn || !checkOut) return "—";
  const t = (s: string) => { const [h, m] = s.slice(11, 16).split(":").map(Number); return h * 60 + m; };
  const mins = t(checkOut) - t(checkIn);
  return mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : "—";
}

export default function AttendanceTab() {
  const today = new Date().toISOString().split("T")[0];
  const [attendance, setAttendance] = useState<ApiAttendance[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [stations, setStations] = useState<ApiStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stationId, setStationId] = useState("all");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [manualOpen, setManualOpen] = useState(false);
  const [viewing, setViewing] = useState<ApiAttendance | null>(null);
  const [manualForm, setManualForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hr_attendance_form") || "null") || { employeeId: "", date: today, checkIn: "", checkOut: "", status: "Present", note: "" }; }
    catch { return { employeeId: "", date: today, checkIn: "", checkOut: "", status: "Present", note: "" }; }
  });
  const [saving, setSaving] = useState(false);
  const [visibleAttendance, setVisibleAttendance] = useState<ApiAttendance[]>([]);

  const can = usePermissions();
  const canCheckInOut = can("hr.attendance.view");
  const canManual = can("hr.attendance.record");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, stationsRes] = await Promise.all([
        hrApi.attendance.list({ stationId: stationId === "all" ? undefined : stationId, from: fromDate || undefined, to: toDate || undefined }),
        hrApi.stations.list(),
      ]);
      setAttendance(attRes.data ?? []);
      setStations(stationsRes.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canManual) return;
    hrApi.employees.list({ limit: 200 }).then(r => setEmployees(r.data ?? [])).catch(() => {});
  }, [canManual]);

  const stats = {
    total: visibleAttendance.length,
    present: visibleAttendance.filter(a => a.status === "Present").length,
    absent: visibleAttendance.filter(a => a.status === "Absent").length,
    late: visibleAttendance.filter(a => a.status === "Late").length,
  };

  const handleCheckIn = async () => {
    try {
      await hrApi.attendance.checkIn();
      toast.success("Clocked in successfully");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Check-in failed");
    }
  };

  const handleCheckOut = async () => {
    try {
      await hrApi.attendance.checkOut();
      toast.success("Clocked out successfully");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Check-out failed");
    }
  };

  const handleManual = async () => {
    if (!manualForm.employeeId || !manualForm.date) return toast.error("Employee and date are required");
    setSaving(true);
    try {
      await hrApi.attendance.manual({
        employeeId: manualForm.employeeId,
        date: manualForm.date,
        checkIn: manualForm.checkIn || undefined,
        checkOut: manualForm.checkOut || undefined,
        status: manualForm.status,
        note: manualForm.note || undefined,
      });
      toast.success("Attendance recorded");
      setManualOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to record attendance");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ApiAttendance>[] = [
    { key: "employee", label: "Employee", render: a => (a.employee?.user?.name ?? a.employee?.name) || "—", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "checkIn", label: "In", render: a => a.checkIn ? a.checkIn.slice(11, 16) : "—" },
    { key: "checkOut", label: "Out", render: a => a.checkOut ? a.checkOut.slice(11, 16) : "—" },
    { key: "updatedAt", label: "Hours", render: a => <span className="text-muted-foreground text-xs">{calcHours(a.checkIn, a.checkOut)}</span> },
    { key: "status", label: "Status", render: a => <StatusBadge status={a.status} /> },
  ];

  const exportColumns: ExportColumn<ApiAttendance>[] = [
    { label: "Employee",  value: a => (a.employee?.user?.name ?? a.employee?.name) || "—" },
    { label: "Date",      value: a => a.date },
    { label: "Check In",  value: a => a.checkIn ? a.checkIn.slice(11, 16) : "—" },
    { label: "Check Out", value: a => a.checkOut ? a.checkOut.slice(11, 16) : "—" },
    { label: "Hours",     value: a => calcHours(a.checkIn, a.checkOut) },
    { label: "Status",    value: a => a.status },
    { label: "Note",      value: a => a.note || "—" },
  ];

  const displayData = filterStatus === "__all__"
    ? attendance
    : attendance.filter(a => a.status === filterStatus);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Attendance</h3>
          <p className="text-sm text-muted-foreground">Track employee check-in/check-out and daily attendance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCheckInOut && (
            <>
              <Button variant="outline" onClick={handleCheckIn}><LogIn className="h-4 w-4 mr-2" /> Check In</Button>
              <Button variant="outline" onClick={handleCheckOut}><LogOut className="h-4 w-4 mr-2" /> Check Out</Button>
            </>
          )}
          {canManual && (
            <Button onClick={() => setManualOpen(true)}>Manual Entry</Button>
          )}
          <ExportMenu
            filename={`attendance_${fromDate}_to_${toDate}`}
            title="Attendance"
            rows={visibleAttendance}
            columns={exportColumns}
            subtitle={`${fromDate} to ${toDate}`}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end p-3 bg-muted/30 rounded-lg border">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Station</Label>
          <Select value={stationId} onValueChange={v => { setStationId(v); }}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All stations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stations</SelectItem>
              {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
          <Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
          <Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        {(stationId !== "all" || filterStatus !== "__all__" || fromDate !== today || toDate !== today) && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline self-end pb-1"
            onClick={() => { setStationId("all"); setFilterStatus("__all__"); setFromDate(today); setToDate(today); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Records", value: stats.total },
          { label: "Present", value: stats.present, color: "text-green-600" },
          { label: "Absent", value: stats.absent, color: "text-destructive" },
          { label: "Late", value: stats.late, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={displayData}
        columns={columns}
        searchKeys={["date", "employee.user.name", "employee.name"]}
        searchPlaceholder="Search by date or employee..."
        onView={item => setViewing(item)}
        onFilteredChange={setVisibleAttendance}
      />

      {/* Manual Entry */}
      <ModalForm
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Manual Attendance Entry"
        description="Record or update attendance for any employee."
        onSubmit={handleManual}
        submitLabel={saving ? "Saving..." : "Save"}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Employee *</Label>
            <Select value={manualForm.employeeId} onValueChange={v => setManualForm(f => ({ ...f, employeeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.name ?? e.employeeNumber} ({e.employeeNumber})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Date *</Label>
            <Input type="date" value={manualForm.date} onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div><Label>Check In</Label><Input type="time" value={manualForm.checkIn} onChange={e => setManualForm(f => ({ ...f, checkIn: e.target.value }))} /></div>
          <div><Label>Check Out</Label><Input type="time" value={manualForm.checkOut} onChange={e => setManualForm(f => ({ ...f, checkOut: e.target.value }))} /></div>
          <div>
            <Label>Status</Label>
            <Select value={manualForm.status} onValueChange={v => setManualForm(f => { const nf = { ...f, status: v }; localStorage.setItem("hr_attendance_form", JSON.stringify(nf)); return nf; })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Note</Label>
            <Textarea value={manualForm.note} onChange={e => setManualForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional note..." />
          </div>
        </div>
      </ModalForm>

      {/* View Details */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Attendance Record" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Employee:</span> {(viewing.employee?.user?.name ?? viewing.employee?.name) || "—"}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date}</div>
            <div><span className="text-muted-foreground">Check In:</span> {viewing.checkIn ? viewing.checkIn.slice(11, 16) : "—"}</div>
            <div><span className="text-muted-foreground">Check Out:</span> {viewing.checkOut ? viewing.checkOut.slice(11, 16) : "—"}</div>
            <div><span className="text-muted-foreground">Hours:</span> {calcHours(viewing.checkIn, viewing.checkOut)}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            {viewing.note && <div className="col-span-2"><span className="text-muted-foreground">Note:</span> {viewing.note}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
