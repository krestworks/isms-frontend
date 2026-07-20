import { useState } from "react";
import { Trash2, ShieldAlert } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { auditLog, useAuditLog, AuditEntry } from "@/data/auditLogStore";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";
import { toast } from "sonner";

const actionColor: Record<string, string> = {
  "location.switch": "bg-blue-100 text-blue-800",
  "role.switch": "bg-purple-100 text-purple-800",
  "document.attach": "bg-green-100 text-green-800",
  "document.remove": "bg-red-100 text-red-800",
  "attendance.correction.requested": "bg-amber-100 text-amber-800",
  "attendance.correction.approved": "bg-emerald-100 text-emerald-800",
  "attendance.correction.rejected": "bg-rose-100 text-rose-800",
  "permission.denied": "bg-destructive/15 text-destructive",
};

export default function AuditLogTab() {
  const data = useAuditLog();
  const [confirmClear, setConfirmClear] = useState(false);
  const [visibleData, setVisibleData] = useState<AuditEntry[]>([]);
  const stats = {
    total: visibleData.length,
    today: visibleData.filter(e => e.ts.startsWith(new Date().toISOString().split("T")[0])).length,
    denied: visibleData.filter(e => e.action === "permission.denied").length,
  };

  const columns: Column<AuditEntry>[] = [
    { key: "ts", label: "When", render: e => new Date(e.ts).toLocaleString() },
    { key: "userName", label: "User" },
    { key: "role", label: "Role", render: e => <Badge variant="outline">{e.role}</Badge> },
    { key: "location", label: "Location" },
    { key: "action", label: "Action", render: e => <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor[e.action] || "bg-muted"}`}>{e.action}</span> },
    { key: "target", label: "Target" },
    { key: "details", label: "Details", render: e => <span className="line-clamp-1">{e.details}</span> },
  ];

  const filters: FilterOption[] = [
    { key: "action", label: "Action", options: Object.keys(actionColor).map(a => ({ label: a, value: a })) },
    { key: "role", label: "Role", options: ["Admin", "Manager", "Accountant", "Attendant", "LocationHead", "Employee"].map(r => ({ label: r, value: r })) },
  ];

  const exportColumns: ExportColumn<AuditEntry>[] = [
    { label: "When",     value: e => new Date(e.ts).toLocaleString() },
    { label: "User",     value: e => e.userName },
    { label: "Role",     value: e => e.role },
    { label: "Location", value: e => e.location },
    { label: "Action",   value: e => e.action },
    { label: "Target",   value: e => e.target },
    { label: "Details",  value: e => e.details },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /> Audit Log</h3>
          <p className="text-sm text-muted-foreground">Sensitive actions: switches, document changes, attendance corrections, denials</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu filename="audit-log" title="Audit Log" rows={visibleData} columns={exportColumns} />
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmClear(true)}><Trash2 className="h-4 w-4 mr-2" /> Clear</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Events", value: stats.total },
          { label: "Today", value: stats.today, color: "text-primary" },
          { label: "Permission Denials", value: stats.denied, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["userName", "target", "details"]} searchPlaceholder="Search audit entries..." filters={filters} onFilteredChange={setVisibleData} />

      <ConfirmDialog
        open={confirmClear}
        title="Clear audit log?"
        description="All audit entries will be permanently erased. This cannot be undone."
        confirmLabel="Clear All"
        onConfirm={() => { auditLog.clear(); toast.success("Audit log cleared"); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
