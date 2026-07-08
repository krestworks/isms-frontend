import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { hrApi, ApiEmployee, ApiShiftAssignment, ApiShiftPattern } from "@/lib/hrApi";
import { sessionStore, useSession } from "@/data/sessionStore";
import { stationsCache } from "@/data/stationsCache";
import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

interface Props { department: string; }

const emptyForm = { employeeId: "", shiftPatternId: "", date: "" };

export function ShiftScheduleTab({ department }: Props) {
  useSession();
  const [employees,    setEmployees]    = useState<ApiEmployee[]>([]);
  const [patterns,     setPatterns]     = useState<ApiShiftPattern[]>([]);
  const [assignments,  setAssignments]  = useState<ApiShiftAssignment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [form,         setForm]         = useState(emptyForm);

  const activeLoc = sessionStore.activeLocation();

  const getStationId = useCallback((): string | undefined => {
    if (activeLoc === "All Locations") return undefined;
    return stationsCache.all().find(s => s.name === activeLoc)?.id;
  }, [activeLoc]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stationId = getStationId();
      const [empRes, patRes, assRes] = await Promise.allSettled([
        hrApi.employees.list({ ...(stationId ? { stationId } : {}), limit: 200 } as any),
        hrApi.shifts.list(stationId),
        hrApi.shifts.assignments.list({ ...(stationId ? { stationId } : {}) }),
      ]);

      const allEmp = empRes.status === "fulfilled" ? (empRes.value.data ?? []) : [];
      // Filter: prefer explicit workModules assignment; fall back to department name
      // match — same rule as ModuleStaffTab, so "who's staff" and "who can be
      // scheduled" always agree for a given module.
      const scopedEmployees = department
        ? allEmp.filter(e => {
            if (e.workModules && e.workModules.length > 0) {
              return e.workModules.some((m: string) => m.toLowerCase() === department.toLowerCase());
            }
            return e.department?.name?.toLowerCase() === department.toLowerCase();
          })
        : allEmp;
      setEmployees(scopedEmployees);
      setPatterns(patRes.status === "fulfilled" ? (patRes.value.data ?? []) : []);

      const allAssignments = assRes.status === "fulfilled" ? (assRes.value.data ?? []) : [];
      const scopedIds = new Set(scopedEmployees.map(e => e.id));
      setAssignments(department ? allAssignments.filter(a => scopedIds.has(a.employeeId)) : allAssignments);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load shift data");
    } finally {
      setLoading(false);
    }
  }, [department, getStationId]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split("T")[0];
  const stats = useMemo(() => ({
    total:    assignments.length,
    today:    assignments.filter(a => a.date?.startsWith(today)).length,
    upcoming: assignments.filter(a => a.date > today).length,
  }), [assignments, today]);

  const columns: Column<ApiShiftAssignment>[] = [
    { key: "employee",     label: "Employee",  render: a => a.employee?.user?.name ?? "—" },
    { key: "date",         label: "Date",       sortable: true, render: a => new Date(a.date).toLocaleDateString() },
    { key: "shiftPattern", label: "Shift",      render: a => <Badge variant="outline">{a.shiftPattern?.name ?? "—"}</Badge> },
    { key: "startTime",    label: "Start",      render: a => a.shiftPattern?.startTime ?? "—" },
    { key: "endTime",      label: "End",        render: a => a.shiftPattern?.endTime   ?? "—" },
  ];

  const filters: FilterOption[] = [
    {
      key: "shiftPattern",
      label: "Shift",
      options: patterns.map(p => ({ label: p.name, value: p.id })),
    },
  ];

  const handleSave = async () => {
    if (!form.employeeId || !form.shiftPatternId || !form.date) {
      return toast.error("Employee, shift, and date are required");
    }
    setSaving(true);
    try {
      const stationId = getStationId();
      await hrApi.shifts.assignments.assign({
        employeeId:     form.employeeId,
        shiftPatternId: form.shiftPatternId,
        date:           form.date,
        ...(stationId ? { stationId } : {}),
      });
      toast.success("Shift assigned");
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign shift");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => exportToCsv(`${department}-shifts.csv`, assignments);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shift Management</h3>
          <p className="text-sm text-muted-foreground">Work schedule for {department} staff · {activeLoc}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={() => { setForm({ ...emptyForm, date: today }); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Schedule Shift
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Scheduled", value: stats.total },
          { label: "Today",           value: stats.today,    color: "text-primary" },
          { label: "Upcoming",        value: stats.upcoming, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {patterns.length === 0 && !loading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No shift patterns configured. Create shift patterns in{" "}
            <a href="/hr" className="underline">HR Management → Shifts</a>.
          </CardContent>
        </Card>
      )}

      <DataTable
        data={assignments}
        columns={columns}
        searchKeys={["date"]}
        searchPlaceholder="Search shifts..."
        filters={filters}
      />

      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Shift"
        onSubmit={handleSave}
        submitLabel={saving ? "Saving..." : "Schedule"}
      >
        <div className="space-y-4">
          <div>
            <Label>Employee *</Label>
            <Select value={form.employeeId} onValueChange={v => set("employeeId", v)}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.user?.name ?? e.employeeNumber} — {e.jobTitle?.title ?? e.user?.activeRole ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{employees.length} staff in {department}</p>
          </div>
          <div>
            <Label>Shift Pattern *</Label>
            <Select value={form.shiftPatternId} onValueChange={v => set("shiftPatternId", v)}>
              <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>
                {patterns.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.startTime}–{p.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}

export default ShiftScheduleTab;
