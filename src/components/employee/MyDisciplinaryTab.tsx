import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/shared/DataTable";
import { hrApi, ApiDisciplinaryRecord } from "@/lib/hrApi";
import { toast } from "sonner";
import { Eye, X, AlertTriangle, FileText } from "lucide-react";

const stageColor: Record<string, string> = {
  "Informal Action":        "bg-blue-100 text-blue-800",
  "Investigation":          "bg-amber-100 text-amber-800",
  "Suspension":             "bg-orange-100 text-orange-800",
  "Notification to Hearing":"bg-purple-100 text-purple-800",
  "Disciplinary Hearing":   "bg-pink-100 text-pink-800",
  "Decision Outcome":       "bg-indigo-100 text-indigo-800",
  "Appeal":                 "bg-yellow-100 text-yellow-800",
  "Closed":                 "bg-green-100 text-green-800",
};

function CaseModal({ record, onClose }: { record: ApiDisciplinaryRecord; onClose: () => void }) {
  const appeal = (() => { try { return record.appeal ? JSON.parse(record.appeal) : null; } catch { return null; } })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-lg">Case #{record.id.slice(-8).toUpperCase()}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Row */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageColor[record.stage] || "bg-muted text-muted-foreground"}`}>
              Stage: {record.stage}
            </span>
            <Badge variant="outline">{record.category}</Badge>
            {record.outcome && record.outcome !== "—" && (
              <Badge variant="secondary">Outcome: {record.outcome}</Badge>
            )}
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Date Reported</p>
              <p className="font-medium">{new Date(record.date || record.createdAt).toLocaleDateString()}</p>
            </div>
            {record.reportedBy && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Reported By</p>
                <p className="font-medium">{record.reportedBy}</p>
              </div>
            )}
            {record.hearingDate && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Hearing Date</p>
                <p className="font-medium">{new Date(record.hearingDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Offence */}
          {(record.offence || record.description) && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Offence / Description</p>
              <p className="text-sm">{record.offence || record.description}</p>
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">HR Notes</p>
              <p className="text-sm">{record.notes}</p>
            </div>
          )}

          {/* Appeal */}
          {appeal && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm flex items-center gap-1.5"><FileText className="h-4 w-4" /> Appeal</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Status:</span> {appeal.status || "—"}</div>
                {appeal.filedOn && <div><span className="text-muted-foreground">Filed:</span> {appeal.filedOn}</div>}
                {appeal.hearingDate && <div><span className="text-muted-foreground">Hearing:</span> {appeal.hearingDate}</div>}
                {appeal.decision && <div><span className="text-muted-foreground">Decision:</span> {appeal.decision}</div>}
              </div>
              {appeal.grounds && (
                <div className="text-sm text-muted-foreground">Grounds: {appeal.grounds}</div>
              )}
            </div>
          )}

          <div className="pt-2 border-t text-xs text-muted-foreground">
            If you wish to lodge an appeal, contact HR within 7 days of the decision outcome.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyDisciplinaryTab() {
  const [records, setRecords] = useState<ApiDisciplinaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<ApiDisciplinaryRecord | null>(null);

  useEffect(() => {
    hrApi.self.disciplinary.list()
      .then(res => setRecords(res.data ?? []))
      .catch((e: any) => toast.error(e?.message || "Failed to load disciplinary records"))
      .finally(() => setLoading(false));
  }, []);

  const warnings    = records.filter(r => r.stage.toLowerCase().includes("warning")).length;
  const suspensions = records.filter(r => r.stage.toLowerCase().includes("suspension")).length;

  const columns: Column<ApiDisciplinaryRecord>[] = [
    { key: "id",       label: "Case",     render: r => <span className="font-mono text-xs">#{r.id.slice(-8).toUpperCase()}</span> },
    { key: "date",     label: "Date",     sortable: true, render: r => new Date(r.date || r.createdAt).toLocaleDateString() },
    { key: "category", label: "Category", render: r => <Badge variant="outline">{r.category}</Badge> },
    { key: "stage",    label: "Stage",    render: r => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${stageColor[r.stage] || "bg-muted"}`}>{r.stage}</span>
    )},
    { key: "offence",  label: "Offence",  render: r => <span className="text-sm">{(r.offence || r.description || "").slice(0, 60)}{(r.offence || r.description || "").length > 60 ? "…" : ""}</span> },
    { key: "outcome",  label: "Outcome",  render: r => r.outcome && r.outcome !== "—" ? r.outcome : <span className="text-muted-foreground">—</span> },
  ];

  return (
    <div className="space-y-4">
      {viewing && <CaseModal record={viewing} onClose={() => setViewing(null)} />}

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
        <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : records.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Clean record — no disciplinary cases on file.</CardContent></Card>
      ) : (
        <DataTable
          data={records}
          columns={columns}
          searchKeys={["offence", "category", "stage"]}
          searchPlaceholder="Search cases…"
          actions={r => (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(r)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
        />
      )}
    </div>
  );
}
