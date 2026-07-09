import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fuelApi, ApiFuelReconciliation, ApiFuelTank } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { usePermissions } from "@/lib/permissions";
import { exportToCsv } from "@/lib/exportCsv";

const FUEL_TYPES = ["Super", "Diesel", "Kerosene", "V-Power", "Jet A-1", "Heavy Fuel Oil"];

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  date: today(), fuelType: "Super", tankId: "",
  openingStock: 0, deliveries: 0, expectedSales: 0,
  actualSales: 0, closingStockActual: 0, notes: "",
};

export function ReconciliationTab() {
  const { stationId } = useActiveStation();
  const can = usePermissions();
  const canCreate  = can("fuel.sales.record");
  const canApprove = can("fuel.reconciliation.approve");

  const [records, setRecords]   = useState<ApiFuelReconciliation[]>([]);
  const [tanks, setTanks]       = useState<ApiFuelTank[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing]   = useState<ApiFuelReconciliation | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [derived, setDerived]   = useState({ closingExpected: 0, variance: 0, variancePct: 0, status: "matched" });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [recRes, tankRes] = await Promise.all([
        fuelApi.reconciliations.list({}, stationId),
        fuelApi.tanks.list(stationId),
      ]);
      setRecords(recRes.data ?? []);
      setTanks(tankRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load reconciliations"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const recalculate = (f: typeof form) => {
    const closing  = f.openingStock + f.deliveries - f.expectedSales;
    const variance = f.closingStockActual - closing;
    const vPct     = closing !== 0 ? (variance / closing) * 100 : 0;
    const status   = Math.abs(vPct) < 0.1 ? "matched" : variance < 0 ? "under" : "over";
    setDerived({ closingExpected: closing, variance, variancePct: vPct, status });
  };

  const updateForm = (k: string, v: any) => {
    setForm(f => {
      const next = { ...f, [k]: typeof f[k as keyof typeof f] === "number" ? +v : v };
      recalculate(next);
      return next;
    });
  };

  const openNew = () => {
    const f = { ...emptyForm };
    setForm(f);
    recalculate(f);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.fuelType) return toast.error("Date and fuel type are required");
    setSaving(true);
    try {
      await fuelApi.reconciliations.create({
        date: form.date,
        fuelType: form.fuelType,
        tankId: form.tankId || undefined,
        openingStock: form.openingStock,
        deliveries: form.deliveries,
        expectedSales: form.expectedSales,
        actualSales: form.actualSales,
        closingStockActual: form.closingStockActual,
        notes: form.notes,
      } as any, stationId);
      toast.success("Reconciliation saved");
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save reconciliation"); }
    finally { setSaving(false); }
  };

  const handleApprove = async (r: ApiFuelReconciliation) => {
    try {
      await fuelApi.reconciliations.approve(r.id, stationId);
      toast.success("Reconciliation approved");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to approve"); }
  };

  const stats = {
    matched: records.filter(r => r.status === "matched").length,
    under:   records.filter(r => r.status === "under").length,
    over:    records.filter(r => r.status === "over").length,
    approved: records.filter(r => r.approvedAt).length,
  };

  const columns: Column<ApiFuelReconciliation>[] = [
    { key: "date",         label: "Date",           render: r => r.date.split("T")[0], sortable: true },
    { key: "fuelType",     label: "Fuel",           sortable: true },
    { key: "openingStock", label: "Opening (L)",    render: r => r.openingStock.toLocaleString() },
    { key: "deliveries",   label: "Deliveries (L)", render: r => r.deliveries.toLocaleString() },
    { key: "actualSales",  label: "Actual Sales (L)", render: r => r.actualSales.toLocaleString() },
    { key: "variance",     label: "Variance (L)",   sortable: true, render: r => (
      <span className={`font-mono text-xs ${r.variance < 0 ? "text-destructive" : r.variance > 0 ? "text-amber-600" : "text-green-600"}`}>
        {r.variance > 0 ? "+" : ""}{r.variance.toLocaleString()} ({r.variancePct.toFixed(1)}%)
      </span>
    )},
    { key: "status",       label: "Status",         render: r => <StatusBadge status={r.status} /> },
    { key: "approvedAt",   label: "Approved",       render: r => r.approvedAt
      ? <Badge variant="secondary" className="text-[10px]">Approved</Badge>
      : <span className="text-xs text-muted-foreground">Pending</span>
    },
  ];

  const filters: FilterOption[] = [
    { key: "fuelType", label: "Fuel",   options: FUEL_TYPES.map(f => ({ label: f, value: f })) },
    { key: "status",   label: "Status", options: [
      { label: "Matched", value: "matched" },
      { label: "Under",   value: "under" },
      { label: "Over",    value: "over" },
    ]},
  ];

  const set = (k: string, v: any) => updateForm(k, v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Compare expected vs actual stock — identify discrepancies</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCsv(`reconciliation-${today()}.csv`, records)}>
            <Download className="h-4 w-4 mr-1.5" />Export
          </Button>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          {canCreate && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />New Reconciliation</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Matched",  value: stats.matched,  color: "text-green-600" },
          { label: "Under",    value: stats.under,    color: "text-destructive" },
          { label: "Over",     value: stats.over,     color: "text-amber-600" },
          { label: "Approved", value: stats.approved },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={records}
        columns={columns}
        searchKeys={["fuelType", "notes"]}
        searchPlaceholder="Search reconciliations..."
        filters={filters}
        onView={r => setViewing(r)}
        actions={canApprove ? (r => !r.approvedAt ? (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700" onClick={() => handleApprove(r)}>
            <CheckCircle className="h-3 w-3 mr-1" />Approve
          </Button>
        ) : null) : undefined}
      />

      {/* Create Reconciliation */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="New Reconciliation"
        onSubmit={handleSave} submitLabel={saving ? "Saving..." : "Save"}>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
          <div>
            <Label>Fuel Type *</Label>
            <Select value={form.fuelType} onValueChange={v => set("fuelType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Tank (optional)</Label>
            <Select value={form.tankId} onValueChange={v => set("tankId", v)}>
              <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
              <SelectContent>
                {tanks.filter(t => t.fuelType === form.fuelType).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Opening Stock (L)</Label><Input type="number" value={form.openingStock || ""} onChange={e => set("openingStock", e.target.value)} /></div>
          <div><Label>Deliveries (L)</Label><Input type="number" value={form.deliveries || ""} onChange={e => set("deliveries", e.target.value)} /></div>
          <div><Label>Expected Sales (L)</Label><Input type="number" value={form.expectedSales || ""} onChange={e => set("expectedSales", e.target.value)} /></div>
          <div><Label>Actual Sales (L)</Label><Input type="number" value={form.actualSales || ""} onChange={e => set("actualSales", e.target.value)} /></div>
          <div><Label>Closing Expected (L)</Label><Input value={derived.closingExpected.toLocaleString()} disabled className="font-mono text-sm" /></div>
          <div><Label>Closing Actual (L)</Label><Input type="number" value={form.closingStockActual || ""} onChange={e => set("closingStockActual", e.target.value)} /></div>
          <div>
            <Label>Variance</Label>
            <Input value={`${derived.variance > 0 ? "+" : ""}${derived.variance.toLocaleString()} L (${derived.variancePct.toFixed(1)}%)`}
              disabled className={`font-mono text-sm ${derived.variance < 0 ? "text-destructive" : derived.variance > 0 ? "text-amber-600" : "text-green-600"}`} />
          </div>
          <div><Label>Status</Label><StatusBadge status={derived.status} /></div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Add notes..." />
          </div>
        </div>
      </ModalForm>

      {/* View Reconciliation */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Reconciliation Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Fuel:</span> {viewing.fuelType}</div>
            <div><span className="text-muted-foreground">Opening:</span> {viewing.openingStock.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Deliveries:</span> {viewing.deliveries.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Expected Sales:</span> {viewing.expectedSales.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Actual Sales:</span> {viewing.actualSales.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Closing Expected:</span> {viewing.closingStockExpected.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Closing Actual:</span> {viewing.closingStockActual.toLocaleString()} L</div>
            <div><span className="text-muted-foreground">Variance:</span>
              <span className={`ml-1 font-mono ${viewing.variance < 0 ? "text-destructive" : viewing.variance > 0 ? "text-amber-600" : "text-green-600"}`}>
                {viewing.variance > 0 ? "+" : ""}{viewing.variance.toLocaleString()} L ({viewing.variancePct.toFixed(1)}%)
              </span>
            </div>
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewing.status} /></div>
            {viewing.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
            {viewing.approvedAt && <div className="col-span-2"><span className="text-muted-foreground">Approved:</span> {viewing.approvedAt.split("T")[0]}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
