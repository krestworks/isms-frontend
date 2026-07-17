import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { inventoryApi, ApiStockMovement } from "@/lib/inventoryApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const TYPE_CONFIG: Record<string, { label: string; cls: string; icon: typeof ArrowDown }> = {
  receipt:      { label: "Receipt",      cls: "bg-green-100 text-green-800",  icon: ArrowDown },
  issue:        { label: "Issue",        cls: "bg-red-100 text-red-800",      icon: ArrowUp },
  adjustment:   { label: "Adjustment",   cls: "bg-amber-100 text-amber-800",  icon: RotateCcw },
  transfer_in:  { label: "Transfer In",  cls: "bg-blue-100 text-blue-800",    icon: ArrowDown },
  transfer_out: { label: "Transfer Out", cls: "bg-purple-100 text-purple-800",icon: ArrowUp },
  return:       { label: "Return",       cls: "bg-teal-100 text-teal-800",    icon: ArrowDown },
  damage:       { label: "Damage",       cls: "bg-rose-100 text-rose-800",    icon: ArrowUp },
  grn:          { label: "GRN",          cls: "bg-green-100 text-green-800",  icon: ArrowDown },
  sale:         { label: "Sale",         cls: "bg-red-100 text-red-800",      icon: ArrowUp },
};

const IN_TYPES  = new Set(["receipt", "transfer_in", "return", "grn"]);
const OUT_TYPES = new Set(["issue", "transfer_out", "damage", "sale"]);

export default function StockMovementsTab() {
  const { stationId } = useActiveStation();
  const [data, setData]       = useState<ApiStockMovement[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [visibleData, setVisibleData] = useState<ApiStockMovement[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await inventoryApi.movements.list(stationId, { page: p, limit: 50, from: fromDate || undefined, to: toDate || undefined } as any);
      setData(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (e: any) { toast.error(e?.message || "Failed to load movements"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate]);

  useEffect(() => { load(1); }, [load]);

  const stats = {
    total: visibleData.length,
    in:    visibleData.filter(m => IN_TYPES.has(m.movementType)).length,
    out:   visibleData.filter(m => OUT_TYPES.has(m.movementType)).length,
    adj:   visibleData.filter(m => m.movementType === "adjustment").length,
  };

  const columns: Column<ApiStockMovement>[] = [
    { key: "createdAt", label: "Date", render: m => new Date(m.createdAt).toLocaleString(), sortable: true },
    { key: "itemName",  label: "Item" },
    { key: "movementType", label: "Type", render: m => {
      const cfg = TYPE_CONFIG[m.movementType] ?? { label: m.movementType, cls: "bg-gray-100 text-gray-800", icon: RotateCcw };
      const Icon = cfg.icon;
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
          <Icon className="h-3 w-3" />{cfg.label}
        </span>
      );
    }},
    { key: "qty", label: "Qty", render: m => {
      const isOut = OUT_TYPES.has(m.movementType);
      return <span className={`font-semibold ${isOut ? "text-destructive" : "text-green-700"}`}>
        {isOut ? "−" : "+"}{Math.abs(m.qty)}
      </span>;
    }},
    { key: "balanceBefore", label: "Prev Bal", render: m => m.balanceBefore ?? "—" },
    { key: "balanceAfter",  label: "New Bal",  render: m => m.balanceAfter ?? "—" },
    { key: "reference", label: "Reference", render: m => m.reference ?? <span className="text-muted-foreground text-xs">—</span> },
    { key: "notes",     label: "Notes",    render: m => m.notes ? <span className="text-xs text-muted-foreground line-clamp-1">{m.notes}</span> : <span className="text-muted-foreground text-xs">—</span> },
  ];

  const filters: FilterOption[] = [
    { key: "movementType", label: "Type", options: Object.entries(TYPE_CONFIG).map(([k, v]) => ({ label: v.label, value: k })) },
  ];

  const exportColumns: ExportColumn<ApiStockMovement>[] = [
    { label: "Date",      value: m => new Date(m.createdAt).toLocaleString() },
    { label: "Item",      value: m => m.itemName },
    { label: "Type",      value: m => TYPE_CONFIG[m.movementType]?.label ?? m.movementType },
    { label: "Qty",       value: m => OUT_TYPES.has(m.movementType) ? -Math.abs(m.qty) : Math.abs(m.qty) },
    { label: "Prev Bal",  value: m => m.balanceBefore ?? "—" },
    { label: "New Bal",   value: m => m.balanceAfter ?? "—" },
    { label: "Reference", value: m => m.reference ?? "—" },
    { label: "Notes",     value: m => m.notes ?? "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stock Movements</h3>
          <p className="text-sm text-muted-foreground">All inflows, outflows and adjustments — read-only audit log</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename={`stock-movements${fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "now"}` : ""}`}
            title="Stock Movements"
            rows={visibleData}
            columns={exportColumns}
            subtitle={fromDate || toDate ? `${fromDate || "…"} to ${toDate || "…"}` : undefined}
          />
          <Button variant="outline" size="sm" onClick={() => load(1)}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={() => load(1)}>Apply</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Shown",       value: data.length, sub: total > data.length ? `of ${total} total` : undefined },
          { label: "Stock In",    value: stats.in,    color: "text-green-600" },
          { label: "Stock Out",   value: stats.out,   color: "text-destructive" },
          { label: "Adjustments", value: stats.adj,   color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color ?? ""}`}>{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={data} columns={columns} loading={loading} filters={filters}
        searchKeys={["itemName", "reference"]} searchPlaceholder="Search by item or reference..."
        onFilteredChange={setVisibleData}
      />
    </div>
  );
}
