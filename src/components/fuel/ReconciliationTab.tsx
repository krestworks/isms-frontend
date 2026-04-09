import { useState } from "react";
import { Plus, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";

interface Reconciliation {
  id: string;
  date: string;
  fuelType: string;
  openingStock: number;
  deliveries: number;
  expectedSales: number;
  actualSales: number;
  closingStockExpected: number;
  closingStockActual: number;
  variance: number;
  variancePct: number;
  status: string;
  notes: string;
}

const initialData: Reconciliation[] = [
  { id: "RC001", date: "2026-04-09", fuelType: "Super", openingStock: 16000, deliveries: 0, expectedSales: 1200, actualSales: 1245, closingStockExpected: 14800, closingStockActual: 14755, variance: -45, variancePct: -0.3, status: "under", notes: "Minor variance on Pump 3" },
  { id: "RC002", date: "2026-04-09", fuelType: "Diesel", openingStock: 5000, deliveries: 0, expectedSales: 800, actualSales: 798, closingStockExpected: 4200, closingStockActual: 4202, variance: 2, variancePct: 0.05, status: "matched", notes: "" },
  { id: "RC003", date: "2026-04-08", fuelType: "Super", openingStock: 17200, deliveries: 0, expectedSales: 1200, actualSales: 1200, closingStockExpected: 16000, closingStockActual: 16000, variance: 0, variancePct: 0, status: "matched", notes: "" },
  { id: "RC004", date: "2026-04-08", fuelType: "Diesel", openingStock: 5800, deliveries: 0, expectedSales: 800, actualSales: 820, closingStockExpected: 5000, closingStockActual: 4980, variance: -20, variancePct: -0.4, status: "under", notes: "Checking meter calibration" },
  { id: "RC005", date: "2026-04-07", fuelType: "Super", openingStock: 7200, deliveries: 10000, expectedSales: 1100, actualSales: 1100, closingStockExpected: 16100, closingStockActual: 17200, variance: 1100, variancePct: 6.8, status: "over", notes: "Delivery overfill confirmed" },
  { id: "RC006", date: "2026-04-07", fuelType: "Kerosene", openingStock: 13500, deliveries: 0, expectedSales: 700, actualSales: 700, closingStockExpected: 12800, closingStockActual: 12800, variance: 0, variancePct: 0, status: "matched", notes: "" },
];

const emptyForm: Omit<Reconciliation, "id"> = { date: new Date().toISOString().split("T")[0], fuelType: "Super", openingStock: 0, deliveries: 0, expectedSales: 0, actualSales: 0, closingStockExpected: 0, closingStockActual: 0, variance: 0, variancePct: 0, status: "matched", notes: "" };

export function ReconciliationTab() {
  const [data, setData] = useState<Reconciliation[]>(initialData);
  const [modal, setModal] = useState<{ mode: "create" | "view"; item: Reconciliation | null } | null>(null);
  const [form, setForm] = useState<Omit<Reconciliation, "id">>(emptyForm);
  const { toast } = useToast();

  const openCreate = () => { setForm(emptyForm); setModal({ mode: "create", item: null }); };
  const openView = (r: Reconciliation) => { setForm({ ...r }); setModal({ mode: "view", item: r }); };

  const updateForm = (updates: Partial<Omit<Reconciliation, "id">>) => {
    const next = { ...form, ...updates };
    next.closingStockExpected = next.openingStock + next.deliveries - next.expectedSales;
    next.variance = next.closingStockActual - next.closingStockExpected;
    next.variancePct = next.closingStockExpected !== 0 ? (next.variance / next.closingStockExpected) * 100 : 0;
    next.status = Math.abs(next.variancePct) < 0.1 ? "matched" : next.variance < 0 ? "under" : "over";
    setForm(next);
  };

  const handleSave = () => {
    setData([{ ...form, id: `RC${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    toast({ title: "Reconciliation Saved" });
    setModal(null);
  };

  const columns: Column<Reconciliation>[] = [
    { key: "date", label: "Date", sortable: true },
    { key: "fuelType", label: "Fuel", sortable: true },
    { key: "openingStock", label: "Opening (L)", render: (r) => r.openingStock.toLocaleString() },
    { key: "deliveries", label: "Deliveries (L)", render: (r) => r.deliveries.toLocaleString() },
    { key: "expectedSales", label: "Expected Sales (L)", render: (r) => r.expectedSales.toLocaleString() },
    { key: "actualSales", label: "Actual Sales (L)", render: (r) => r.actualSales.toLocaleString() },
    { key: "variance", label: "Variance (L)", sortable: true, render: (r) => (
      <span className={`font-mono text-sm ${r.variance < 0 ? "text-destructive" : r.variance > 0 ? "text-warning" : "text-success"}`}>
        {r.variance > 0 ? "+" : ""}{r.variance.toLocaleString()} ({r.variancePct.toFixed(1)}%)
      </span>
    )},
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "fuelType", label: "Fuel Type", options: [{ label: "Super", value: "Super" }, { label: "Diesel", value: "Diesel" }, { label: "Kerosene", value: "Kerosene" }, { label: "V-Power", value: "V-Power" }] },
    { key: "status", label: "Status", options: [{ label: "Matched", value: "matched" }, { label: "Under", value: "under" }, { label: "Over", value: "over" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Compare expected vs actual stock — identify discrepancies</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />New Reconciliation</Button>
        </div>
      </div>

      <DataTable data={data} columns={columns} searchKeys={["fuelType", "notes"]} searchPlaceholder="Search reconciliations..." filters={filters}
        actions={(r) => (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(r)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
      />

      {modal && (
        <ModalForm open onClose={() => setModal(null)} title={modal.mode === "create" ? "New Reconciliation" : "Reconciliation Details"} onSubmit={modal.mode === "create" ? handleSave : undefined} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <Select value={form.fuelType} onValueChange={(v) => updateForm({ fuelType: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super">Super</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Kerosene">Kerosene</SelectItem>
                  <SelectItem value="V-Power">V-Power</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Opening Stock (L)</Label><Input type="number" value={form.openingStock} onChange={(e) => updateForm({ openingStock: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Deliveries (L)</Label><Input type="number" value={form.deliveries} onChange={(e) => updateForm({ deliveries: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Expected Sales (L)</Label><Input type="number" value={form.expectedSales} onChange={(e) => updateForm({ expectedSales: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Actual Sales (L)</Label><Input type="number" value={form.actualSales} onChange={(e) => updateForm({ actualSales: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Closing Expected (L)</Label><Input type="number" value={form.closingStockExpected} disabled className="font-mono" /></div>
            <div className="space-y-2"><Label>Closing Actual (L)</Label><Input type="number" value={form.closingStockActual} onChange={(e) => updateForm({ closingStockActual: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div className="space-y-2"><Label>Variance (L)</Label><Input type="number" value={form.variance} disabled className={`font-mono ${form.variance < 0 ? "text-destructive" : form.variance > 0 ? "text-warning" : ""}`} /></div>
            <div className="space-y-2"><Label>Status</Label><StatusBadge status={form.status} /></div>
            <div className="col-span-2 space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} disabled={modal.mode === "view"} placeholder="Add notes..." /></div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
