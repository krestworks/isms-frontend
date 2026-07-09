import { useCallback, useEffect, useState } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { RefreshCw, Sliders, History, Download } from "lucide-react";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { reportsApi, ApiGeneratedReport, MODULE_FIELDS, MODULES } from "@/lib/reportsApi";

type Tab = "build" | "history";

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val).toLocaleDateString();
  }
  if (typeof val === "number") return val.toLocaleString();
  return String(val);
}

export function GeneratedReportsTab() {
  const { stationId } = useActiveStation();
  const [activeTab, setActiveTab] = useState<Tab>("build");

  // ── Build state ──────────────────────────────────────────────────────────────
  const [selectedModule, setSelectedModule] = useState(MODULES[0]);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    MODULE_FIELDS[MODULES[0]]?.slice(0, 5).map(f => f.key) ?? [],
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [building, setBuilding] = useState(false);
  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [saving, setSaving]     = useState(false);

  // ── History state ────────────────────────────────────────────────────────────
  const [history, setHistory]       = useState<ApiGeneratedReport[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!stationId) return;
    setHistLoading(true);
    try {
      const res = await reportsApi.generated.list(stationId);
      setHistory(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load history"); }
    finally { setHistLoading(false); }
  }, [stationId]);

  useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab, loadHistory]);

  // ── Module change ────────────────────────────────────────────────────────────
  const handleModuleChange = (mod: string) => {
    setSelectedModule(mod);
    setSelectedFields(MODULE_FIELDS[mod]?.slice(0, 5).map(f => f.key) ?? []);
    setPreviewCols([]);
    setPreviewRows([]);
  };

  const toggleField = (key: string) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key],
    );
  };

  const currentModuleFields = MODULE_FIELDS[selectedModule] ?? [];
  const handleSelectAll  = () => setSelectedFields(currentModuleFields.map(f => f.key));
  const handleSelectNone = () => setSelectedFields([]);

  // ── Generate preview ─────────────────────────────────────────────────────────
  const handleBuild = async () => {
    if (selectedFields.length === 0) return toast.error("Select at least one field");
    setBuilding(true);
    try {
      const res = await reportsApi.build(
        { module: selectedModule, fields: selectedFields, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
        stationId,
      );
      setPreviewCols(res.data.columns);
      setPreviewRows(res.data.rows);
      if (res.data.rows.length === 0) toast.info("No records found for the selected criteria");
    } catch (e: any) { toast.error(e?.message || "Failed to generate report"); }
    finally { setBuilding(false); }
  };

  // ── Save to history ──────────────────────────────────────────────────────────
  const handleSaveToHistory = async () => {
    if (previewRows.length === 0) return toast.error("Generate a preview first");
    setSaving(true);
    try {
      const period = [dateFrom, dateTo].filter(Boolean).join(" to ") || "All time";
      await reportsApi.generated.create(
        { title: `${selectedModule} Report`, type: "custom", module: selectedModule, period, format: "Custom", status: "completed" },
        stationId,
      );
      toast.success("Report saved to history");
      setActiveTab("history");
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const [pendingDeleteHistory, setPendingDeleteHistory] = useState<ApiGeneratedReport | null>(null);
  const [deletingHistory, setDeletingHistory] = useState(false);

  const handleDeleteHistory = (r: ApiGeneratedReport) => setPendingDeleteHistory(r);

  const confirmDeleteHistory = async () => {
    if (!pendingDeleteHistory) return;
    setDeletingHistory(true);
    try {
      await reportsApi.generated.delete(pendingDeleteHistory.id);
      toast.success("Deleted");
      setPendingDeleteHistory(null);
      loadHistory();
    } catch (e: any) { toast.error(e?.message || "Failed to delete"); }
    finally { setDeletingHistory(false); }
  };

  const histColumns: Column<ApiGeneratedReport>[] = [
    { key: "title",       label: "Title",     sortable: true },
    { key: "module",      label: "Module" },
    { key: "period",      label: "Period" },
    { key: "format",      label: "Format" },
    { key: "generatedAt", label: "Generated", sortable: true },
    { key: "generatedBy", label: "By" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-0 border-b">
        {(["build", "history"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "build" ? <Sliders className="h-4 w-4" /> : <History className="h-4 w-4" />}
            {tab === "build" ? "Build Custom Report" : "Report History"}
          </button>
        ))}
      </div>

      {/* ── Build tab ─────────────────────────────────────────────────────────── */}
      {activeTab === "build" && (
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5 space-y-5">

              {/* Module selector */}
              <div>
                <Label className="mb-1.5 block font-medium">Module</Label>
                <Select value={selectedModule} onValueChange={handleModuleChange}>
                  <SelectTrigger className="w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Field selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Select Fields</Label>
                  <div className="flex items-center gap-3">
                    <button onClick={handleSelectAll} className="text-xs text-primary hover:underline">Select all</button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <button onClick={handleSelectNone} className="text-xs text-primary hover:underline">Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {currentModuleFields.map(f => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm select-none"
                    >
                      <Checkbox
                        checked={selectedFields.includes(f.key)}
                        onCheckedChange={() => toggleField(f.key)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
                {selectedFields.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedFields.length} field{selectedFields.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4 max-w-xs">
                <div>
                  <Label className="mb-1 block">From Date</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1 block">To Date</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleBuild}
                  disabled={building || selectedFields.length === 0}
                >
                  {building
                    ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Generating…</>
                    : "Generate Preview"}
                </Button>
                {previewRows.length > 0 && (
                  <Button variant="outline" onClick={handleSaveToHistory} disabled={saving}>
                    {saving ? "Saving…" : "Save to History"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview table */}
          {previewCols.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">{selectedModule} — Preview</h4>
                  <p className="text-xs text-muted-foreground">
                    {previewRows.length} row{previewRows.length !== 1 ? "s" : ""}
                    {previewRows.length === 1000 && " (capped at 1 000 — use date filters to narrow)"}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled title="Export coming soon">
                  <Download className="h-4 w-4 mr-1.5" /> Export
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {previewCols.map(c => (
                        <th key={c} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {currentModuleFields.find(f => f.key === c)?.label ?? c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        {previewCols.map(c => (
                          <td key={c} className="px-3 py-2 whitespace-nowrap">
                            {formatCell(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History tab ───────────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Saved Reports</h3>
            <Button variant="outline" size="icon" onClick={loadHistory} disabled={histLoading}>
              <RefreshCw className={`h-4 w-4 ${histLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <DataTable
            data={history}
            columns={histColumns}
            searchKeys={["title", "module", "period"]}
            searchPlaceholder="Search history…"
            onDelete={handleDeleteHistory}
          />

          <DangerConfirmModal
            open={!!pendingDeleteHistory}
            title={`Delete report "${pendingDeleteHistory?.title}"?`}
            description="This saved report will be permanently deleted."
            confirmLabel="Delete"
            loading={deletingHistory}
            onConfirm={confirmDeleteHistory}
            onCancel={() => setPendingDeleteHistory(null)}
          />
        </div>
      )}
    </div>
  );
}
