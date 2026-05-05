import { useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { useStaffByDepartment } from "@/data/staffStore";
import { shiftsStore, useShifts, Shift } from "@/data/shiftsStore";
import { exportToCsv } from "@/lib/exportCsv";
import { sessionStore } from "@/data/sessionStore";

const SHIFT_TYPES = ["Morning (6am-2pm)", "Afternoon (2pm-10pm)", "Night (10pm-6am)", "Full Day", "Half Day"];

interface Props { department: string; }

const emptyForm = { employeeId: "", date: "", shift: "Morning (6am-2pm)", startTime: "06:00", endTime: "14:00", location: "", notes: "" };

export function ShiftScheduleTab({ department }: Props) {
  const staff = useStaffByDepartment(department);
  const activeLoc = sessionStore.activeLocation();
  const all = useShifts(s => s.department === department);
  const data = useMemo(() => activeLoc === "All Locations" ? all : all.filter(s => s.location === activeLoc), [all, activeLoc]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(emptyForm);

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
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Schedule Shift</Button>
        </div>
      </div>

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
    </div>
  );
}

export default ShiftScheduleTab;
