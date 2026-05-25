import { useCallback, useEffect, useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { reportsApi, ApiGeneratedReport } from "@/lib/reportsApi";

export function ExportHistoryTab() {
  const { stationId } = useActiveStation();
  const [data,    setData]    = useState<ApiGeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<ApiGeneratedReport | null>(null);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      // Export history = all generated reports (every report record is an export record)
      const res = await reportsApi.generated.list(stationId);
      setData(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load export history"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e: ApiGeneratedReport) => {
    try { await reportsApi.generated.delete(e.id); toast.success("Export record deleted"); load(); }
    catch (ex: any) { toast.error(ex?.message || "Failed to delete"); }
  };

  const columns: Column<ApiGeneratedReport>[] = [
    { key: "title",       label: "Report",      sortable: true },
    { key: "format",      label: "Format" },
    { key: "module",      label: "Module" },
    { key: "generatedBy", label: "Exported By" },
    { key: "generatedAt", label: "Exported At", sortable: true },
    { key: "fileSize",    label: "Size",         render: r => r.fileSize || "—" },
    { key: "status",      label: "Status",       render: r => <StatusBadge status={r.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "format", label: "Format", options: [{ label: "PDF", value: "PDF" }, { label: "Excel", value: "Excel" }, { label: "CSV", value: "CSV" }] },
    { key: "module", label: "Module", options: ["All","Fuel","LPG","Water","Automotive","Car Wash"].map(m => ({ label: m, value: m })) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Export History</h3>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["title", "generatedBy"]} searchPlaceholder="Search exports..." filters={filters} onView={r => setModal(r)} onDelete={handleDelete} />

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title="Export Details" isView>
          <div className="space-y-3">
            <div><Label>Report</Label><Input value={modal.title} readOnly /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Format</Label><Input value={modal.format} readOnly /></div>
              <div><Label>Module</Label><Input value={modal.module} readOnly /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Exported By</Label><Input value={modal.generatedBy} readOnly /></div>
              <div><Label>Exported At</Label><Input value={modal.generatedAt} readOnly /></div>
            </div>
            <div><Label>File Size</Label><Input value={modal.fileSize || "—"} readOnly /></div>
            <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-1" /> Re-download</Button>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
