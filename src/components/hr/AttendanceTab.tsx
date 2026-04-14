import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";

interface AttendanceRecord {
  id: string;
  employeeName: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  status: string;
  shift: string;
}

const mockData: AttendanceRecord[] = [
  { id: "ATT-001", employeeName: "James Mwangi", department: "Fuel", date: "2026-04-14", clockIn: "06:00", clockOut: "14:00", hoursWorked: 8, status: "completed", shift: "Morning" },
  { id: "ATT-002", employeeName: "Grace Wanjiku", department: "LPG", date: "2026-04-14", clockIn: "08:00", clockOut: "17:00", hoursWorked: 9, status: "completed", shift: "Day" },
  { id: "ATT-003", employeeName: "Peter Ochieng", department: "Car Wash", date: "2026-04-14", clockIn: "07:00", clockOut: "", hoursWorked: 0, status: "in_progress", shift: "Morning" },
  { id: "ATT-004", employeeName: "Mary Akinyi", department: "Water", date: "2026-04-14", clockIn: "", clockOut: "", hoursWorked: 0, status: "pending", shift: "Day" },
  { id: "ATT-005", employeeName: "David Kimani", department: "Automotive", date: "2026-04-13", clockIn: "06:00", clockOut: "14:30", hoursWorked: 8.5, status: "completed", shift: "Morning" },
];

const columns: Column<AttendanceRecord>[] = [
  { key: "id", label: "ID", sortable: true },
  { key: "employeeName", label: "Employee", sortable: true },
  { key: "department", label: "Department" },
  { key: "date", label: "Date", sortable: true },
  { key: "shift", label: "Shift", render: (i) => <Badge variant="outline">{i.shift}</Badge> },
  { key: "clockIn", label: "Clock In", render: (i) => i.clockIn || "—" },
  { key: "clockOut", label: "Clock Out", render: (i) => i.clockOut || "—" },
  { key: "hoursWorked", label: "Hours", render: (i) => i.hoursWorked > 0 ? `${i.hoursWorked}h` : "—" },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
];

const filterOpts: FilterOption[] = [
  { key: "department", label: "Department", options: ["Fuel", "LPG", "Water", "Automotive", "Car Wash"].map((d) => ({ label: d, value: d })) },
  { key: "shift", label: "Shift", options: [{ label: "Morning", value: "Morning" }, { label: "Day", value: "Day" }, { label: "Night", value: "Night" }] },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "In Progress", value: "in_progress" }, { label: "Completed", value: "completed" }] },
];

export default function AttendanceTab() {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [viewing, setViewing] = useState<AttendanceRecord | null>(null);
  const [form, setForm] = useState({ employeeName: "", department: "Fuel", date: "", clockIn: "", clockOut: "", hoursWorked: 0, status: "pending", shift: "Morning" });

  const openNew = () => { setEditing(null); setForm({ employeeName: "", department: "Fuel", date: new Date().toISOString().split("T")[0], clockIn: "", clockOut: "", hoursWorked: 0, status: "pending", shift: "Morning" }); setModalOpen(true); };
  const openEdit = (item: AttendanceRecord) => { setEditing(item); setForm({ employeeName: item.employeeName, department: item.department, date: item.date, clockIn: item.clockIn, clockOut: item.clockOut, hoursWorked: item.hoursWorked, status: item.status, shift: item.shift }); setModalOpen(true); };
  const handleSave = () => {
    if (editing) {
      setData((d) => d.map((i) => (i.id === editing.id ? { ...i, ...form } : i)));
    } else {
      setData((d) => [...d, { id: `ATT-${String(d.length + 1).padStart(3, "0")}`, ...form }]);
    }
    setModalOpen(false);
  };
  const handleDelete = (item: AttendanceRecord) => setData((d) => d.filter((i) => i.id !== item.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Attendance Management</h3>
          <p className="text-sm text-muted-foreground">Track employee clock-in/out and shifts</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Log Attendance</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["employeeName", "id"]} searchPlaceholder="Search attendance..." filters={filterOpts} onView={(item) => setViewing(item)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Attendance" : "Log Attendance"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Save"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Employee</Label><Input value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} /></div>
          <div><Label>Department</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Fuel", "LPG", "Water", "Automotive", "Car Wash"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Shift</Label>
            <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Morning">Morning (6AM-2PM)</SelectItem><SelectItem value="Day">Day (8AM-5PM)</SelectItem><SelectItem value="Night">Night (10PM-6AM)</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Clock In</Label><Input type="time" value={form.clockIn} onChange={(e) => setForm({ ...form, clockIn: e.target.value })} /></div>
          <div><Label>Clock Out</Label><Input type="time" value={form.clockOut} onChange={(e) => setForm({ ...form, clockOut: e.target.value })} /></div>
          <div><Label>Hours Worked</Label><Input type="number" step="0.5" value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: Number(e.target.value) })} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">Clocked In</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Attendance Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">ID:</span> {viewing.id}</div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
            <div><span className="text-muted-foreground">Department:</span> {viewing.department}</div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date}</div>
            <div><span className="text-muted-foreground">Shift:</span> {viewing.shift}</div>
            <div><span className="text-muted-foreground">Clock In:</span> {viewing.clockIn || "—"}</div>
            <div><span className="text-muted-foreground">Clock Out:</span> {viewing.clockOut || "—"}</div>
            <div><span className="text-muted-foreground">Hours:</span> {viewing.hoursWorked > 0 ? `${viewing.hoursWorked}h` : "—"}</div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
