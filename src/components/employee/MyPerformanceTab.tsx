import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable, Column } from "@/components/shared/DataTable";

interface Task {
  id: string;
  title: string;
  assignedBy: string;
  dueDate: string;
  priority: string;
  status: string;
  progress: number;
  rating: number;
  feedback: string;
}

const myTasks: Task[] = [
  { id: "PT-001", title: "Achieve KES 500K monthly fuel sales", assignedBy: "Susan Otieno", dueDate: "2026-04-30", priority: "high", status: "in_progress", progress: 72, rating: 0, feedback: "" },
  { id: "PT-005", title: "Complete safety training module", assignedBy: "HR", dueDate: "2026-05-15", priority: "medium", status: "pending", progress: 0, rating: 0, feedback: "" },
  { id: "PT-009", title: "Q1 customer service review", assignedBy: "Susan Otieno", dueDate: "2026-03-31", priority: "medium", status: "completed", progress: 100, rating: 4, feedback: "Strong service, work on upselling" },
];

const statusColor: Record<string, string> = {
  pending: "bg-muted text-foreground",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
};

export default function MyPerformanceTab() {
  const completed = myTasks.filter(t => t.status === "completed");
  const ratings = completed.filter(t => t.rating > 0);
  const avg = ratings.length ? (ratings.reduce((s, t) => s + t.rating, 0) / ratings.length).toFixed(1) : "—";

  const columns: Column<Task>[] = [
    { key: "id", label: "Task" },
    { key: "title", label: "Description" },
    { key: "dueDate", label: "Due", sortable: true },
    { key: "priority", label: "Priority", render: t => <Badge variant={t.priority === "high" ? "destructive" : "outline"}>{t.priority}</Badge> },
    { key: "progress", label: "Progress", render: t => <div className="w-24"><Progress value={t.progress} className="h-2" /><span className="text-[10px]">{t.progress}%</span></div> },
    { key: "status", label: "Status", render: t => <span className={`px-2 py-0.5 rounded text-xs ${statusColor[t.status]}`}>{t.status}</span> },
    { key: "rating", label: "Rating", render: t => t.rating > 0 ? `${t.rating}/5 ⭐` : "—" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Performance</h3>
        <p className="text-sm text-muted-foreground">Your assigned tasks, progress and performance ratings</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "My Tasks", value: myTasks.length },
          { label: "In Progress", value: myTasks.filter(t => t.status === "in_progress").length, color: "text-blue-600" },
          { label: "Completed", value: completed.length, color: "text-green-600" },
          { label: "Avg Rating", value: `${avg}${typeof avg === "string" && avg !== "—" ? "/5" : ""}`, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={myTasks} columns={columns} searchKeys={["title", "id"]} searchPlaceholder="Search my tasks..." />

      {completed.filter(t => t.feedback).length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Recent Feedback</p>
            {completed.filter(t => t.feedback).map(t => (
              <div key={t.id} className="border-l-2 border-primary pl-3 py-1 text-sm">
                <p className="font-medium">{t.title}</p>
                <p className="text-muted-foreground italic">"{t.feedback}" — {t.rating}/5</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
