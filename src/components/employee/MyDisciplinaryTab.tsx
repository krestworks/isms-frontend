import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { DISCIPLINARY_STAGES } from "@/components/hr/DisciplinaryTab";

interface Case {
  id: string;
  date: string;
  category: string;
  offence: string;
  stage: string;
  outcome: string;
  appeal: string;
}

const myCases: Case[] = [
  { id: "DC-007", date: "2025-09-12", category: "Attendance", offence: "Late arrival warning", stage: "Closed", outcome: "Verbal Warning", appeal: "—" },
];

const stageColor: Record<string, string> = {
  "Informal Action": "bg-blue-100 text-blue-800",
  "Investigation": "bg-amber-100 text-amber-800",
  "Suspension": "bg-orange-100 text-orange-800",
  "Notification to Hearing": "bg-purple-100 text-purple-800",
  "Disciplinary Hearing": "bg-pink-100 text-pink-800",
  "Decision Outcome": "bg-indigo-100 text-indigo-800",
  "Appeal": "bg-yellow-100 text-yellow-800",
  "Closed": "bg-green-100 text-green-800",
};

export default function MyDisciplinaryTab() {
  const columns: Column<Case>[] = [
    { key: "id", label: "Case" },
    { key: "date", label: "Date", sortable: true },
    { key: "category", label: "Category", render: c => <Badge variant="outline">{c.category}</Badge> },
    { key: "offence", label: "Offence" },
    { key: "stage", label: "Stage", render: c => <span className={`px-2 py-0.5 rounded text-xs ${stageColor[c.stage] || "bg-muted"}`}>{c.stage}</span> },
    { key: "outcome", label: "Outcome" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Disciplinary Record</h3>
        <p className="text-sm text-muted-foreground">Cases involving you, with stage and outcome</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Open Cases</p><p className="text-2xl font-bold text-amber-600">{myCases.filter(c => c.stage !== "Closed").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Closed</p><p className="text-2xl font-bold text-green-600">{myCases.filter(c => c.stage === "Closed").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active Warnings</p><p className="text-2xl font-bold">{myCases.filter(c => c.outcome.includes("Warning")).length}</p></CardContent></Card>
      </div>

      {myCases.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Clean record — no disciplinary cases on file. 🎉</CardContent></Card>
      ) : (
        <DataTable data={myCases} columns={columns} searchKeys={["id", "offence"]} />
      )}

      <p className="text-xs text-muted-foreground">If you wish to lodge an appeal, contact HR within 7 days of the decision outcome.</p>
    </div>
  );
}
