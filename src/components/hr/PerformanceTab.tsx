import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useStaff } from "@/data/staffStore";

export interface PerformanceTask {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  assignedBy: string;
  assignedOn: string;
  dueDate: string;
  priority: string;
  status: string; // pending | in_progress | completed | overdue
  progress: number; // 0-100
  rating: number;  // 0-5
  feedback: string;
}

const initial: PerformanceTask[] = [
  { id: "PT-001", employeeId: "EMP-001", employeeName: "James Mwangi", title: "Achieve KES 500K monthly fuel sales", description: "Hit monthly sales target for Pump 1", assignedBy: "Susan Otieno", assignedOn: "2026-04-01", dueDate: "2026-04-30", priority: "high", status: "in_progress", progress: 72, rating: 0, feedback: "" },
  { id: "PT-002", employeeId: "EMP-002", employeeName: "Grace Wanjiku", title: "Onboard 10 new LPG corporate clients", description: "Q2 corporate growth target", assignedBy: "Admin", assignedOn: "2026-04-01", dueDate: "2026-06-30", priority: "high", status: "in_progress", progress: 40, rating: 0, feedback: "" },
  { id: "PT-003", employeeId: "EMP-004", employeeName: "Mary Akinyi", title: "Quarterly equipment service", description: "Service all water production filters", assignedBy: "Susan Otieno", assignedOn: "2026-03-15", dueDate: "2026-04-15", priority: "medium", status: "completed", progress: 100, rating: 5, feedback: "Excellent — completed early" },
  { id: "PT-004", employeeId: "EMP-006", employeeName: "Susan Otieno", title: "Train 3 new attendants", description: "Onboarding mentorship", assignedBy: "Admin", assignedOn: "2026-03-01", dueDate: "2026-03-31", priority: "medium", status: "overdue", progress: 60, rating: 0, feedback: "" },
];

const emptyForm = { employeeId: "", title: "", description: "", assignedBy: "", assignedOn: "", dueDate: "", priority: "medium", status: "pending", progress: 0, rating: 0, feedback: "" };

const statusColor: Record<string, string> = {
  pending: "bg-muted text-foreground",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export default function PerformanceTab() {
  const staff = useStaff();
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PerformanceTask | null>(null);
  const [viewing, setViewing] = useState<PerformanceTask | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const stats = {
    total: data.length,
    inProgress: data.filter(d => d.status === "in_progress").length,
    completed: data.filter(d => d.status === "completed").length,
    overdue: data.filter(d => d.status === "overdue").length,
    avgRating: (data.filter(d => d.rating > 0).reduce((s, d) => s + d.rating, 0) / Math.max(1, data.filter(d => d.rating > 0).length)).toFixed(1),
  };

  const columns: Column<PerformanceTask>[] = [
    { key: "id", label: "Task ID" },
    { key: "employeeName", label: "Employee" },
    { key: "title", label: "Task", render: t => <span className="line-clamp-1">{t.title}</span> },
    { key: "dueDate", label: "Due", sortable: true },
    { key: "priority", label: "Priority", render: t => <Badge variant={t.priority === "high" ? "destructive" : "outline"}>{t.priority}</Badge> },
    { key: "progress", label: "Progress", render: t => <div className="w-24"><Progress value={t.progress} className="h-2" /><span className="text-[10px] text-muted-foreground">{t.progress}%</span></div> },
    { key: "status", label: "Status", render: t => <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[t.status]}`}>{t.status}</span> },
    { key: "rating", label: "Rating", render: t => t.rating > 0 ? `${t.rating}/5 ⭐` : "—" },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: ["pending", "in_progress", "completed", "overdue"].map(s => ({ label: s, value: s })) },
    { key: "priority", label: "Priority", options: ["low", "medium", "high"].map(p => ({ label: p, value: p })) },
  ];

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, assignedOn: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const openEdit = (t: PerformanceTask) => { setEditing(t); setForm({ employeeId: t.employeeId, title: t.title, description: t.description, assignedBy: t.assignedBy, assignedOn: t.assignedOn, dueDate: t.dueDate, priority: t.priority, status: t.status, progress: t.progress, rating: t.rating, feedback: t.feedback }); setModalOpen(true); };
  const handleSave = () => {
    const emp = staff.find(s => s.id === form.employeeId);
    const employeeName = emp?.name || form.employeeId;
    if (editing) setData(d => d.map(i => i.id === editing.id ? { ...i, ...form, employeeName } : i));
    else setData(d => [...d, { id: `PT-${String(d.length + 1).padStart(3, "0")}`, ...form, employeeName }]);
    setModalOpen(false);
  };
  const handleDelete = (t: PerformanceTask) => setData(d => d.filter(i => i.id !== t.id));
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Performance</h3>
          <p className="text-sm text-muted-foreground">Assign tasks, track progress and rate staff performance</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Task</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Tasks", value: stats.total, color: "" },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
          { label: "Overdue", value: stats.overdue, color: "text-destructive" },
          { label: "Avg Rating", value: `${stats.avgRating}/5`, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["employeeName", "title", "id"]} searchPlaceholder="Search tasks..." filters={filters} onView={t => setViewing(t)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Task" : "New Performance Task"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Assign"}>
        <div className="space-y-4">
          <div><Label>Employee *</Label>
            <Select value={form.employeeId} onValueChange={v => set("employeeId", v)}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Task Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Assigned By</Label><Input value={form.assignedBy} onChange={e => set("assignedBy", e.target.value)} /></div>
            <div><Label>Assigned On</Label><Input type="date" value={form.assignedOn} onChange={e => set("assignedOn", e.target.value)} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "medium", "high"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending", "in_progress", "completed", "overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Progress %</Label><Input type="number" min={0} max={100} value={form.progress} onChange={e => set("progress", Number(e.target.value))} /></div>
            <div><Label>Rating (0-5)</Label><Input type="number" min={0} max={5} value={form.rating} onChange={e => set("rating", Number(e.target.value))} /></div>
          </div>
          <div><Label>Feedback</Label><Textarea value={form.feedback} onChange={e => set("feedback", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Task Details" isView>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{viewing.id}</Badge>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[viewing.status]}`}>{viewing.status}</span>
            </div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employeeName}</div>
            <div><span className="text-muted-foreground">Task:</span> {viewing.title}</div>
            <div><span className="text-muted-foreground">Description:</span> {viewing.description}</div>
            <div><span className="text-muted-foreground">Assigned by:</span> {viewing.assignedBy} on {viewing.assignedOn}</div>
            <div><span className="text-muted-foreground">Due:</span> {viewing.dueDate}</div>
            <div><span className="text-muted-foreground">Priority:</span> {viewing.priority}</div>
            <div><Progress value={viewing.progress} className="h-2 mt-1" /><span className="text-xs text-muted-foreground">{viewing.progress}% complete</span></div>
            {viewing.rating > 0 && <div><span className="text-muted-foreground">Rating:</span> {viewing.rating}/5</div>}
            {viewing.feedback && <div><span className="text-muted-foreground">Feedback:</span> {viewing.feedback}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
