import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { hrApi, ApiEmployee, ApiPerformanceTask, ApiDepartment } from "@/lib/hrApi";

const CATEGORIES = ["General", "Sales", "Service", "Operations", "Training"];
const STATUSES   = ["pending", "in_progress", "done", "overdue"];
const PRIORITIES = ["low", "medium", "high"];

const statusColor: Record<string, string> = {
  pending:     "bg-muted text-foreground",
  in_progress: "bg-blue-100 text-blue-800",
  done:        "bg-green-100 text-green-800",
  overdue:     "bg-red-100 text-red-800",
};

const emptyForm = {
  employeeId: "", title: "", category: "General", dueDate: "",
  priority: "medium", status: "pending", notes: "", rating: 0, assignedBy: "",
};

export default function PerformanceTab() {
  const [employees,  setEmployees]  = useState<ApiEmployee[]>([]);
  const [departments, setDepts]     = useState<ApiDepartment[]>([]);
  const [deptFilter, setDeptFilter] = useState("");
  const [data, setData]             = useState<ApiPerformanceTask[]>([]);
  const [loading, setLoading]       = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<ApiPerformanceTask | null>(null);
  const [viewing, setViewing]       = useState<ApiPerformanceTask | null>(null);
  const [form, setForm]             = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, empsRes, deptsRes] = await Promise.all([
        hrApi.performance.list({ limit: 500 } as any),
        hrApi.employees.list({ limit: 200, status: "Active" } as any),
        hrApi.departments.list(),
      ]);
      setData(tasksRes.data ?? []);
      setEmployees(empsRes.data ?? []);
      setDepts(deptsRes.data ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total:      data.length,
    inProgress: data.filter(d => d.status === "in_progress").length,
    done:       data.filter(d => d.status === "done").length,
    overdue:    data.filter(d => d.status === "overdue").length,
    avgRating:  (() => {
      const rated = data.filter(d => (d.rating ?? 0) > 0);
      return rated.length ? (rated.reduce((s, d) => s + (d.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
    })(),
  };

  const columns: Column<ApiPerformanceTask>[] = [
    { key: "id", label: "Task ID" },
    { key: "employeeId", label: "Employee", render: t => t.employee?.user?.name ?? t.employeeId },
    { key: "title", label: "Task", render: t => <span className="line-clamp-1">{t.title}</span> },
    { key: "category", label: "Category", render: t => <Badge variant="secondary">{t.category}</Badge> },
    { key: "dueDate", label: "Due", sortable: true, render: t => t.dueDate ?? "—" },
    { key: "priority", label: "Priority", render: t => <Badge variant={t.priority === "high" ? "destructive" : "outline"}>{t.priority}</Badge> },
    { key: "status", label: "Status", render: t => <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[t.status] ?? ""}`}>{t.status}</span> },
    { key: "rating", label: "Rating", render: t => t.rating ? `${t.rating}/5` : "—" },
  ];

  const filters: FilterOption[] = [
    { key: "status",   label: "Status",   options: STATUSES.map(s => ({ label: s, value: s })) },
    { key: "priority", label: "Priority", options: PRIORITIES.map(p => ({ label: p, value: p })) },
    { key: "category", label: "Category", options: CATEGORIES.map(c => ({ label: c, value: c })) },
  ];

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };
  const openEdit = (t: ApiPerformanceTask) => {
    setEditing(t);
    setForm({
      employeeId: t.employeeId, title: t.title, category: t.category ?? "General",
      dueDate: t.dueDate ?? "", priority: t.priority, status: t.status,
      notes: t.notes ?? "", rating: t.rating ?? 0, assignedBy: t.assignedBy ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeId) return toast.error("Select an employee");
    if (!form.title.trim()) return toast.error("Task title is required");
    try {
      if (editing) {
        const res = await hrApi.performance.update(editing.id, form);
        setData(d => d.map(t => t.id === editing.id ? res.data : t));
        toast.success("Task updated");
      } else {
        const res = await hrApi.performance.create({ ...form, employeeId: form.employeeId, title: form.title });
        setData(d => [...d, res.data]);
        toast.success("Task assigned");
      }
      setModalOpen(false);
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const [pendingDelete, setPendingDelete] = useState<ApiPerformanceTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await hrApi.performance.remove(pendingDelete.id);
      setData(d => d.filter(x => x.id !== pendingDelete.id));
      toast.success("Task removed");
      setPendingDelete(null);
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
    finally { setDeleting(false); }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Performance</h3>
          <p className="text-sm text-muted-foreground">Assign tasks, track progress and rate staff performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Task</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Tasks",  value: stats.total,      color: "" },
          { label: "In Progress",  value: stats.inProgress, color: "text-blue-600" },
          { label: "Done",         value: stats.done,       color: "text-green-600" },
          { label: "Overdue",      value: stats.overdue,    color: "text-destructive" },
          { label: "Avg Rating",   value: `${stats.avgRating}${typeof stats.avgRating === "string" && stats.avgRating !== "—" ? "/5" : ""}`, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["title", "id"]} searchPlaceholder="Search tasks…" filters={filters} onView={t => setViewing(t)} onEdit={openEdit} onDelete={t => setPendingDelete(t)} />

      <DangerConfirmModal
        open={!!pendingDelete}
        title={`Delete task "${pendingDelete?.title}"?`}
        description="This performance task will be permanently removed."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Task" : "New Performance Task"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Assign"}>
        <div className="space-y-4">
          <div><Label>Filter by Department</Label>
            <Select value={deptFilter || "_all_"} onValueChange={v => setDeptFilter(v === "_all_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all_">All departments</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Employee *</Label>
            <Select value={form.employeeId || "_none_"} onValueChange={v => set("employeeId", v === "_none_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— Select —</SelectItem>
                {employees.filter(e => !deptFilter || e.departmentId === deptFilter || e.department?.id === deptFilter).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeNumber} — {e.employeeNumber}{e.department ? ` (${e.department.name})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Task Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assigned By</Label><Input value={form.assignedBy} onChange={e => set("assignedBy", e.target.value)} /></div>
            <div><Label>Rating (0–5)</Label><Input type="number" min={0} max={5} value={form.rating} onChange={e => set("rating", Number(e.target.value))} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Task Details" isView>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{viewing.id}</Badge>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[viewing.status] ?? ""}`}>{viewing.status}</span>
            </div>
            <div><span className="text-muted-foreground">Employee:</span> {viewing.employee?.user?.name ?? viewing.employeeId}</div>
            <div><span className="text-muted-foreground">Task:</span> {viewing.title}</div>
            <div><span className="text-muted-foreground">Category:</span> {viewing.category}</div>
            <div><span className="text-muted-foreground">Priority:</span> {viewing.priority}</div>
            <div><span className="text-muted-foreground">Due:</span> {viewing.dueDate ?? "—"}</div>
            {viewing.assignedBy && <div><span className="text-muted-foreground">Assigned by:</span> {viewing.assignedBy}</div>}
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            {(viewing.rating ?? 0) > 0 && (
              <div>
                <span className="text-muted-foreground">Rating:</span> {viewing.rating}/5
                <Progress value={(viewing.rating ?? 0) * 20} className="h-2 mt-1" />
              </div>
            )}
            {viewing.completedAt && <div><span className="text-muted-foreground">Completed:</span> {viewing.completedAt.split("T")[0]}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
