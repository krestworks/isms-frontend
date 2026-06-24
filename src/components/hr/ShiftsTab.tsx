import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ModalForm } from "@/components/shared/ModalForm";
import { toast } from "sonner";
import { hrApi, ApiShiftPattern, ApiShiftAssignment, ApiEmployee } from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";
import { useActiveStation } from "@/lib/useActiveStation";

const SHIFT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-amber-100 text-amber-800 border-amber-200",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates(anchor: Date): string[] {
  const day = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

export default function ShiftsTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canManage = can("hr.shifts.manage");

  const [patterns,    setPatterns]    = useState<ApiShiftPattern[]>([]);
  const [assignments, setAssignments] = useState<ApiShiftAssignment[]>([]);
  const [employees,   setEmployees]   = useState<ApiEmployee[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [anchor,      setAnchor]      = useState(new Date());
  const [assignOpen,  setAssignOpen]  = useState(false);
  const [form,        setForm]        = useState({ employeeId: "", shiftPatternId: "", dates: [] as string[] });
  const [saving,      setSaving]      = useState(false);

  const weekDates = getWeekDates(anchor);
  const from = weekDates[0];
  const to   = weekDates[6];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes, eRes] = await Promise.all([
        hrApi.shifts.list(stationId || undefined),
        hrApi.shifts.assignments.list({ from, to, limit: 200 }),
        hrApi.employees.list({ page: 1, limit: 200 }),
      ]);
      setPatterns(pRes.data ?? []);
      setAssignments(aRes.data ?? []);
      setEmployees(((eRes.data ?? []) as ApiEmployee[]).filter(e => e.status === "Active"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load shift data");
    } finally {
      setLoading(false);
    }
  }, [stationId, from, to]);

  useEffect(() => { load(); }, [load]);

  const patternColorMap = new Map(patterns.map((p, i) => [p.id, SHIFT_COLORS[i % SHIFT_COLORS.length]]));

  const assignMap = new Map<string, ApiShiftAssignment>(
    assignments.map(a => [`${a.employeeId}_${a.date.slice(0, 10)}`, a])
  );

  const prevWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); };
  const nextWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); };

  const fmtWeekRange = () => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const f = new Date(from + "T12:00").toLocaleDateString("en-KE", opts);
    const t = new Date(to   + "T12:00").toLocaleDateString("en-KE", { ...opts, year: "numeric" });
    return `${f} – ${t}`;
  };

  const openAssign = (employeeId = "", date = "") => {
    setForm({
      employeeId,
      shiftPatternId: patterns.find(p => p.isDefault)?.id ?? patterns[0]?.id ?? "",
      dates: date ? [date] : [],
    });
    setAssignOpen(true);
  };

  const toggleDate = (d: string) =>
    setForm(f => ({
      ...f,
      dates: f.dates.includes(d) ? f.dates.filter(x => x !== d) : [...f.dates, d],
    }));

  const handleAssign = async () => {
    if (!form.employeeId)    return toast.error("Select an employee");
    if (!form.shiftPatternId) return toast.error("Select a shift pattern");
    if (!form.dates.length)  return toast.error("Select at least one day");
    setSaving(true);
    try {
      await Promise.all(
        form.dates.map(date =>
          hrApi.shifts.assignments.assign({
            employeeId: form.employeeId,
            shiftPatternId: form.shiftPatternId,
            date,
            stationId: stationId || undefined,
          })
        )
      );
      toast.success(`${form.dates.length} shift assignment${form.dates.length > 1 ? "s" : ""} saved`);
      setAssignOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign shift");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Shift Roster</h3>
          <p className="text-sm text-muted-foreground">Weekly schedule — assign employees to shift patterns</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex rounded-lg border overflow-hidden">
            <button onClick={prevWeek} className="px-2 py-1.5 hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors border-x min-w-[140px] text-center"
            >
              {fmtWeekRange()}
            </button>
            <button onClick={nextWeek} className="px-2 py-1.5 hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => openAssign()}>
              <Plus className="h-4 w-4 mr-1.5" />Assign Shift
            </Button>
          )}
        </div>
      </div>

      {/* Shift pattern legend */}
      {patterns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {patterns.map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${patternColorMap.get(p.id)}`}
            >
              <CalendarDays className="h-3 w-3" />
              {p.name}
              <span className="opacity-60 font-normal">{p.startTime}–{p.endTime}</span>
              {p.isDefault && <span className="opacity-60 font-normal">· Default</span>}
            </div>
          ))}
        </div>
      )}

      {/* Weekly roster grid */}
      <div className="rounded-xl border overflow-hidden overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          {/* Day-of-week header */}
          <div className="grid bg-muted/20 border-b" style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
            <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r">
              Employee
            </div>
            {weekDates.map((d, i) => {
              const isToday = d === today;
              const dt = new Date(d + "T12:00");
              const count = assignments.filter(a => a.date.slice(0, 10) === d).length;
              return (
                <div key={d} className={`px-2 py-2 text-center border-r last:border-r-0 ${isToday ? "bg-primary/8" : ""}`}>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{DAYS[i]}</div>
                  <div className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{dt.getDate()}</div>
                  {count > 0 && (
                    <div className="text-[9px] text-muted-foreground mt-0.5">{count} assigned</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Employee rows */}
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading roster...</div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No active employees</div>
          ) : (
            <div className="divide-y">
              {employees.map(emp => (
                <div
                  key={emp.id}
                  className="grid hover:bg-muted/5 transition-colors"
                  style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}
                >
                  <div className="px-3 py-2.5 border-r flex flex-col justify-center min-w-0">
                    <span className="text-sm font-medium truncate leading-tight">{emp.user.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {emp.jobTitle?.title || emp.employmentType}
                    </span>
                  </div>
                  {weekDates.map(d => {
                    const asgn = assignMap.get(`${emp.id}_${d}`);
                    const isToday = d === today;
                    return (
                      <div
                        key={d}
                        title={canManage ? `Click to assign shift for ${emp.user.name} on ${d}` : undefined}
                        className={`p-1 border-r last:border-r-0 min-h-[54px] flex items-center justify-center ${
                          isToday ? "bg-primary/4" : ""
                        } ${canManage ? "cursor-pointer hover:bg-primary/8 transition-colors" : ""}`}
                        onClick={() => canManage && openAssign(emp.id, d)}
                      >
                        {asgn ? (
                          <div
                            className={`text-[10px] leading-snug px-1.5 py-1 rounded-md font-medium text-center w-full border ${patternColorMap.get(asgn.shiftPatternId) ?? "bg-muted"}`}
                          >
                            <div className="truncate">{asgn.shiftPattern?.name ?? "Shift"}</div>
                            <div className="opacity-60 font-normal text-[9px]">
                              {asgn.shiftPattern?.startTime}–{asgn.shiftPattern?.endTime}
                            </div>
                          </div>
                        ) : (
                          canManage && (
                            <span className="text-lg font-light text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors select-none">
                              +
                            </span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Assigned this week</p>
            <p className="text-2xl font-bold">{assignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Employees scheduled</p>
            <p className="text-2xl font-bold">{new Set(assignments.map(a => a.employeeId)).size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Shift patterns</p>
            <p className="text-2xl font-bold">{patterns.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Assign Modal */}
      <ModalForm
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Shift"
        description="Select an employee, shift pattern, and the days to assign"
        onSubmit={handleAssign}
        submitLabel={saving ? "Saving..." : `Assign${form.dates.length ? ` (${form.dates.length} day${form.dates.length > 1 ? "s" : ""})` : ""}`}
      >
        <div className="space-y-4">
          <div>
            <Label>Employee *</Label>
            <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.user.name}
                    {e.jobTitle && <span className="text-muted-foreground"> · {e.jobTitle.title}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Shift Pattern *</Label>
            <Select value={form.shiftPatternId} onValueChange={v => setForm(f => ({ ...f, shiftPatternId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
              <SelectContent>
                {patterns.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.startTime}–{p.endTime}){p.isDefault ? " · Default" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Days *</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Select one or more days from the current week</p>
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((d, i) => {
                const selected = form.dates.includes(d);
                const dt = new Date(d + "T12:00");
                const isToday = d === today;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDate(d)}
                    className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs border transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : isToday
                        ? "border-primary/40 text-primary bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-muted border-border text-foreground"
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-wide">{DAYS[i]}</span>
                    <span className="font-semibold mt-0.5">{dt.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, dates: [...weekDates] }))}
                className="text-xs text-primary hover:underline"
              >
                Select all week
              </button>
              <span className="text-muted-foreground text-xs">·</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, dates: weekdays(weekDates) }))}
                className="text-xs text-primary hover:underline"
              >
                Weekdays only
              </button>
              <span className="text-muted-foreground text-xs">·</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, dates: [] }))}
                className="text-xs text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}

function weekdays(dates: string[]) {
  return dates.filter((_, i) => i < 5);
}
