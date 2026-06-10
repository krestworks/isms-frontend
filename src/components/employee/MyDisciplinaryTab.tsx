import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { hrApi, ApiDisciplinaryRecord } from "@/lib/hrApi";
import { toast } from "sonner";

const columns: Column<ApiDisciplinaryRecord>[] = [
  { key: "id",       label: "Case",     render: r => r.id.slice(-8).toUpperCase() },
  { key: "date",     label: "Date",     sortable: true, render: r => new Date(r.date || r.createdAt).toLocaleDateString() },
  { key: "category", label: "Category", render: r => <Badge variant="outline">{r.category}</Badge> },
  { key: "stage",    label: "Stage",    render: r => <Badge variant={r.stage.toLowerCase().includes("warning") ? "secondary" : "destructive"}>{r.stage}</Badge> },
  { key: "offence",  label: "Offence",  render: r => r.offence || r.description },
  { key: "outcome",  label: "Outcome",  render: r => r.outcome || "—" },
];

export default function MyDisciplinaryTab() {
  const [records, setRecords] = useState<ApiDisciplinaryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi.self.disciplinary.list()
      .then(res => setRecords(res.data ?? []))
      .catch((e: any) => toast.error(e?.message || "Failed to load disciplinary records"))
      .finally(() => setLoading(false));
  }, []);

  const warnings    = records.filter(r => r.stage.toLowerCase().includes("warning")).length;
  const suspensions = records.filter(r => r.stage.toLowerCase().includes("suspension")).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Disciplinary Record</h3>
        <p className="text-sm text-muted-foreground">Cases involving you, with category and outcome</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Cases</p><p className="text-2xl font-bold">{records.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Warnings</p><p className="text-2xl font-bold text-amber-600">{warnings}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Suspensions</p><p className="text-2xl font-bold text-orange-600">{suspensions}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Clean record — no disciplinary cases on file.
          </CardContent>
        </Card>
      ) : (
        <DataTable data={records} columns={columns} searchKeys={["offence", "category", "stage"]} searchPlaceholder="Search cases..." />
      )}

      <p className="text-xs text-muted-foreground">
        If you wish to lodge an appeal, contact HR within 7 days of the decision outcome.
      </p>
    </div>
  );
}
