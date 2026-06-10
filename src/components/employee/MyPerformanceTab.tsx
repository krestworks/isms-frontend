import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { hrApi, ApiPerformanceTask } from "@/lib/hrApi";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  pending:     "bg-muted text-foreground",
  in_progress: "bg-blue-100 text-blue-800",
  done:        "bg-green-100 text-green-800",
  overdue:     "bg-red-100 text-red-800",
};

const columns: Column<ApiPerformanceTask>[] = [
  { key: "id",       label: "Task",     render: t => t.id.slice(-6).toUpperCase() },
  { key: "title",    label: "Description" },
  { key: "category", label: "Category", render: t => <Badge variant="outline">{t.category}</Badge> },
  { key: "dueDate",  label: "Due",      sortable: true, render: t => t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—" },
  { key: "priority", label: "Priority", render: t => <Badge variant={t.priority === "high" ? "destructive" : "outline"}>{t.priority}</Badge> },
  { key: "status",   label: "Status",   render: t => <span className={`px-2 py-0.5 rounded text-xs ${statusColor[t.status] ?? statusColor.pending}`}>{t.status}</span> },
  { key: "rating",   label: "Rating",   render: t => t.rating ? `${t.rating}/5 ⭐` : "—" },
];

export default function MyPerformanceTab() {
  const [tasks, setTasks]     = useState<ApiPerformanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi.self.performance.list({ limit: 100 })
      .then(res => setTasks(res.data ?? []))
      .catch((e: any) => toast.error(e?.message || "Failed to load performance tasks"))
      .finally(() => setLoading(false));
  }, []);

  const done      = tasks.filter(t => t.status === "done");
  const rated     = done.filter(t => t.rating && t.rating > 0);
  const avg       = rated.length ? (rated.reduce((s, t) => s + (t.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
  const withNotes = done.filter(t => t.notes);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Performance</h3>
        <p className="text-sm text-muted-foreground">Your assigned tasks, progress and performance ratings</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "My Tasks",    value: tasks.length },
          { label: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "text-blue-600" },
          { label: "Done",        value: done.length, color: "text-green-600" },
          { label: "Avg Rating",  value: avg === "—" ? "—" : `${avg}/5`, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color ?? ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No performance tasks assigned yet.</div>
      ) : (
        <DataTable data={tasks} columns={columns} searchKeys={["title", "category"]} searchPlaceholder="Search my tasks..." />
      )}

      {withNotes.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Manager Notes</p>
            {withNotes.map(t => (
              <div key={t.id} className="border-l-2 border-primary pl-3 py-1 text-sm">
                <p className="font-medium">{t.title}</p>
                <p className="text-muted-foreground italic">"{t.notes}"{t.rating ? ` — ${t.rating}/5` : ""}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
