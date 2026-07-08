import { useCallback, useEffect, useState } from "react";
import { RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { auditApi, ApiAuditLogEntry } from "@/lib/auditApi";
import { toast } from "sonner";

interface Props {
  /** Must match the lowercase `module` tag written by the backend (e.g. "fuel", "lpg", "hr"). */
  module: string;
}

const actionLabel: Record<string, string> = {
  approval_requested: "Requested",
  approval_approved: "Approved",
  approval_rejected: "Rejected",
};

const actionColor: Record<string, string> = {
  approval_requested: "bg-amber-100 text-amber-800",
  approval_approved: "bg-green-100 text-green-800",
  approval_rejected: "bg-red-100 text-red-800",
};

const columns: Column<ApiAuditLogEntry>[] = [
  { key: "createdAt", label: "When", sortable: true, render: e => new Date(e.createdAt).toLocaleString() },
  { key: "user", label: "User", render: e => e.user?.name ?? e.user?.email ?? "—" },
  {
    key: "action", label: "Action",
    render: e => <Badge variant="outline" className={actionColor[e.action] ?? ""}>{actionLabel[e.action] ?? e.action}</Badge>,
  },
  { key: "entityType", label: "Entity", render: e => e.entityType ?? "—" },
  { key: "detail", label: "Detail", render: e => <span className="line-clamp-2">{e.detail}</span> },
];

export function ModuleAuditTab({ module }: Props) {
  const [data, setData] = useState<ApiAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditApi.list(module, { limit: "200" });
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load audit history"); }
    finally { setLoading(false); }
  }, [module]);

  useEffect(() => { load(); }, [load]);

  const filters: FilterOption[] = [
    { key: "action", label: "Action", options: Object.entries(actionLabel).map(([value, label]) => ({ label, value })) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Audit History</h3>
          <p className="text-sm text-muted-foreground">Sensitive actions requested and approved within this module only</p>
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        data={data} columns={columns}
        searchKeys={["detail", "subject"]}
        searchPlaceholder="Search audit history..."
        filters={filters}
      />
    </div>
  );
}
