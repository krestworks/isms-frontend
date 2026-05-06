import { useMemo, useState } from "react";
import { Plus, Download, CalendarRange, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { useStaffByDepartment } from "@/data/staffStore";
import { shiftsStore, useShifts, Shift } from "@/data/shiftsStore";
import { shiftTemplatesStore, useShiftTemplates, ShiftTemplate, DAY_LABELS } from "@/data/shiftTemplatesStore";
import { exportToCsv } from "@/lib/exportCsv";
import { sessionStore } from "@/data/sessionStore";
import { isLocationVisible } from "@/lib/permissions";
import { toast } from "sonner";

const SHIFT_TYPES = ["Morning (6am-2pm)", "Afternoon (2pm-10pm)", "Night (10pm-6am)", "Full Day", "Half Day"];

interface Props { department: string; }

const emptyForm = { employeeId: "", date: "", shift: "Morning (6am-2pm)", startTime: "06:00", endTime: "14:00", location: "", notes: "" };

export function ShiftScheduleTab({ department }: Props) {
  const staff = useStaffByDepartment(department);
  const activeLoc = sessionStore.activeLocation();
  const all = useShifts(s => s.department === department);
  const data = useMemo(() => all.filter(s => isLocationVisible(s.location)), [all, activeLoc]);
  const templates = useShiftTemplates(t => t.department === department);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tplOpen, setTplOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<ShiftTemplate | null>(null);
  const [tplForm, setTplForm] = useState({ name: "", shift: "Morning (6am-2pm)", startTime: "06:00", endTime: "14:00", daysOfWeek: [1, 2, 3, 4, 5] as number[], employeeIds: [] as string[], location: "", notes: "" });
  const [applyOpen, setApplyOpen] = useState<ShiftTemplate | null>(null);
  const [applyRange, setApplyRange] = useState({ from: "", to: "" });

  const stats = {
    total: data.length,
    today: data.filter(d => d.date === new Date().toISOString().split("T")[0]).length,
    upcoming: data.filter(d => d.date > new Date().toISOString().split("T")[0]).length,
  };

  const columns: Column<Shift>[] = [
    { key: "id", label: "Shift ID" },
    { key: "employeeName", label: "Employee" },
    { key: "date", label: "Date", sortable: true },
    { key: "shift", label: "Shift", render: s => <Badge variant="outline">{s.shift}</Badge> },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "location", label: "Location" },
  ];

  const filters: FilterOption[] = [
    { key: "shift", label: "Shift", options: SHIFT_TYPES.map(s => ({ label: s, value: s })) },
  ];

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0], location: activeLoc !== "All Locations" ? activeLoc : "" }); setModalOpen(true); };
  const openEdit = (s: Shift) => { setEditing(s); setForm({ employeeId: s.employeeId, date: s.date, shift: s.shift, startTime: s.startTime, endTime: s.endTime, location: s.location, notes: s.notes }); setModalOpen(true); };
  const handleSave = () => {
    const emp = staff.find(s => s.id === form.employeeId);
    const employeeName = emp?.name || form.employeeId;
    const location = form.location || emp?.location || "—";
    if (editing) shiftsStore.update(editing.id, { ...form, employeeName, location, department });
    else shiftsStore.add({ ...form, employeeName, location, department });
    setModalOpen(false);
  };
  const handleDelete = (s: Shift) => shiftsStore.remove(s.id);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleExport = () => exportToCsv(`${department}-shifts.csv`, data);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Shift Management</h3>
          <p className="text-sm text-muted-foreground">Work schedule for {department} staff · scope: {activeLoc}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button variant="outline" onClick={() => { setEditingTpl(null); setTplForm({ name: "", shift: "Morning (6am-2pm)", startTime: "06:00", endTime: "14:00", daysOfWeek: [1,2,3,4,5], employeeIds: [], location: activeLoc !== "All Locations" ? activeLoc : "", notes: "" }); setTplOpen(true); }}><Repeat className="h-4 w-4 mr-2" /> New Template</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Schedule Shift</Button>
        </div>
      </div>

      {templates.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recurring Templates</p>
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm">
                <div>
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{t.shift} · {t.daysOfWeek.map(d => DAY_LABELS[d]).join(", ")} · {t.employeeIds.length} staff</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setApplyOpen(t); setApplyRange({ from: new Date().toISOString().split("T")[0], to: "" }); }}><CalendarRange className="h-3 w-3 mr-1" /> Apply</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingTpl(t); setTplForm({ name: t.name, shift: t.shift, startTime: t.startTime, endTime: t.endTime, daysOfWeek: t.daysOfWeek, employeeIds: t.employeeIds, location: t.location || "", notes: t.notes }); setTplOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => shiftTemplatesStore.remove(t.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Scheduled", value: stats.total },
          { label: "Today", value: stats.today, color: "text-primary" },
          { label: "Upcoming", value: stats.upcoming, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["employeeName", "id"]} searchPlaceholder="Search shifts..." filters={filters} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Shift" : "Schedule Shift"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Schedule"}>
        <div className="space-y-4">
          <div><Label>Employee *</Label>
            <Select value={form.employeeId} onValueChange={v => set("employeeId", v)}>
              <SelectTrigger><SelectValue placeholder="Assign staff" /></SelectTrigger>
              <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Staff sourced from HR onboarding ({staff.length} in {department})</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
            <div><Label>Shift Type</Label>
              <Select value={form.shift} onValueChange={v => set("shift", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFT_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} /></div>
            <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} /></div>
            <div className="col-span-2"><Label>Location (optional)</Label><Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Defaults to staff's branch" /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={tplOpen} onClose={() => setTplOpen(false)} title={editingTpl ? "Edit Template" : "New Shift Template"} submitLabel={editingTpl ? "Update" : "Create"} onSubmit={() => {
        if (!tplForm.name) return toast.error("Name required");
        if (tplForm.employeeIds.length === 0) return toast.error("Pick at least one employee");
        if (editingTpl) shiftTemplatesStore.update(editingTpl.id, { ...tplForm, department });
        else shiftTemplatesStore.add({ ...tplForm, department });
        setTplOpen(false);
      }}>
        <div className="space-y-3">
          <div><Label>Template Name</Label><Input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Weekend Crew" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Shift Type</Label>
              <Select value={tplForm.shift} onValueChange={v => setTplForm(f => ({ ...f, shift: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFT_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={tplForm.location} onChange={e => setTplForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div><Label>Start</Label><Input type="time" value={tplForm.startTime} onChange={e => setTplForm(f => ({ ...f, startTime: e.target.value }))} /></div>
            <div><Label>End</Label><Input type="time" value={tplForm.endTime} onChange={e => setTplForm(f => ({ ...f, endTime: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Days of Week</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {DAY_LABELS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={tplForm.daysOfWeek.includes(i)} onCheckedChange={() => setTplForm(f => ({ ...f, daysOfWeek: f.daysOfWeek.includes(i) ? f.daysOfWeek.filter(x => x !== i) : [...f.daysOfWeek, i].sort() }))} />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Assigned Employees</Label>
            <MultiSelect options={staff.map(s => s.id)} value={tplForm.employeeIds} onChange={v => setTplForm(f => ({ ...f, employeeIds: v }))} placeholder="Pick staff..." renderLabel={(id) => staff.find(s => s.id === id)?.name || id} />
          </div>
          <div><Label>Notes</Label><Input value={tplForm.notes} onChange={e => setTplForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!applyOpen} onClose={() => setApplyOpen(null)} title={`Apply Template: ${applyOpen?.name || ""}`} submitLabel="Generate Shifts" onSubmit={() => {
        if (!applyOpen || !applyRange.from || !applyRange.to) return toast.error("Pick a date range");
        const n = shiftTemplatesStore.apply(applyOpen, applyRange.from, applyRange.to);
        toast.success(`${n} shifts generated`);
        setApplyOpen(null);
      }}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{applyOpen?.shift} on {applyOpen?.daysOfWeek.map(d => DAY_LABELS[d]).join(", ")} for {applyOpen?.employeeIds.length} staff</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>From</Label><Input type="date" value={applyRange.from} onChange={e => setApplyRange(r => ({ ...r, from: e.target.value }))} /></div>
            <div><Label>To</Label><Input type="date" value={applyRange.to} onChange={e => setApplyRange(r => ({ ...r, to: e.target.value }))} /></div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}

export default ShiftScheduleTab;
