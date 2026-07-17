import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { fuelApi, ApiFuelSale } from "@/lib/fuelApi";
import { useActiveStation } from "@/lib/useActiveStation";
import { ExportMenu } from "@/components/shared/ExportMenu";
import type { ExportColumn } from "@/lib/exportCsv";

const FUEL_TYPES = ["Super", "Diesel", "Kerosene", "V-Power", "Jet A-1", "Heavy Fuel Oil"];
const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Invoice", "Cheque"];

function oneMonthAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}
const today = () => new Date().toISOString().split("T")[0];

export function SalesHistoryTab() {
  const { stationId } = useActiveStation();
  const [sales, setSales]       = useState<ApiFuelSale[]>([]);
  const [loading, setLoading]   = useState(true);
  const [fromDate, setFromDate] = useState(oneMonthAgo());
  const [toDate, setToDate]     = useState(today());
  const [fuelFilter, setFuelFilter] = useState("all");
  const [payFilter, setPayFilter]   = useState("all");
  const [viewing, setViewing]   = useState<ApiFuelSale | null>(null);
  const [visibleSales, setVisibleSales] = useState<ApiFuelSale[]>([]);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await fuelApi.sales.list({
        from: fromDate, to: toDate,
        fuelType: fuelFilter !== "all" ? fuelFilter : undefined,
        paymentMethod: payFilter !== "all" ? payFilter : undefined,
      }, stationId);
      setSales(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load history"); }
    finally { setLoading(false); }
  }, [stationId, fromDate, toDate, fuelFilter, payFilter]);

  useEffect(() => { if (stationId) load(); }, [load]);

  const totals = {
    revenue:  sales.reduce((s, r) => s + r.netAmount, 0),
    litres:   sales.reduce((s, r) => s + r.litres, 0),
    discount: sales.reduce((s, r) => s + r.discount, 0),
    count:    sales.length,
  };

  const columns: Column<ApiFuelSale>[] = [
    { key: "receiptNo",    label: "Receipt",  render: s => <span className="font-mono text-xs">{s.receiptNo}</span>, sortable: true },
    { key: "date",         label: "Date",     render: s => s.date.split("T")[0], sortable: true },
    { key: "customer",     label: "Customer", render: s => s.customer || "Walk-in", sortable: true },
    { key: "fuelType",     label: "Fuel",     sortable: true },
    { key: "litres",       label: "Litres",   render: s => s.litres.toLocaleString() },
    { key: "netAmount",    label: "Amount",   render: s => <span className="font-mono">Ksh {s.netAmount.toLocaleString()}</span>, sortable: true },
    { key: "paymentMethod", label: "Payment" },
    { key: "paymentStatus", label: "Status",  render: s => <StatusBadge status={s.paymentStatus} /> },
    { key: "attendant",    label: "Attendant", render: s => s.attendant || "—" },
  ];

  const exportColumns: ExportColumn<ApiFuelSale>[] = [
    { label: "Receipt",        value: s => s.receiptNo },
    { label: "Date",           value: s => s.date.split("T")[0] },
    { label: "Customer",       value: s => s.customer || "Walk-in" },
    { label: "Fuel Type",      value: s => s.fuelType },
    { label: "Pump",           value: s => `Pump ${s.pumpNumber}` },
    { label: "Litres",         value: s => s.litres },
    { label: "Price/L (Ksh)",  value: s => s.pricePerLitre },
    { label: "Gross (Ksh)",    value: s => s.amount },
    { label: "Discount (Ksh)", value: s => s.discount },
    { label: "Net Amount (Ksh)",value: s => s.netAmount },
    { label: "Payment Method", value: s => s.paymentMethod },
    { label: "Status",         value: s => s.paymentStatus },
    { label: "Attendant",      value: s => s.attendant || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-muted-foreground">Complete fuel sales transaction history</p>
          <p className="text-xs text-primary font-semibold mt-0.5">Total Revenue: Ksh {totals.revenue.toLocaleString()} · {totals.litres.toLocaleString()} L</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename={`fuel-history_${fromDate}_to_${toDate}`}
            title="Fuel Sales History"
            rows={visibleSales}
            columns={exportColumns}
            subtitle={`${fromDate} to ${toDate}`}
          />
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <div>
          <Label className="text-xs">Fuel</Label>
          <Select value={fuelFilter} onValueChange={setFuelFilter}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fuels</SelectItem>
              {FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Payment</Label>
          <Select value={payFilter} onValueChange={setPayFilter}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revenue",      value: `Ksh ${totals.revenue.toLocaleString()}`,   color: "text-primary" },
          { label: "Litres Sold",  value: `${totals.litres.toLocaleString()} L` },
          { label: "Transactions", value: String(totals.count) },
          { label: "Discounts",    value: `Ksh ${totals.discount.toLocaleString()}`,  color: "text-amber-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color || ""}`}>{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={sales}
        columns={columns}
        searchKeys={["receiptNo", "customer", "attendant", "fuelType"]}
        searchPlaceholder="Search sales history..."
        onView={s => setViewing(s)}
        onFilteredChange={setVisibleSales}
      />

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sale Details" isView>
        {viewing && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Receipt:</span> <span className="font-mono">{viewing.receiptNo}</span></div>
            <div><span className="text-muted-foreground">Date:</span> {viewing.date.split("T")[0]}</div>
            <div><span className="text-muted-foreground">Customer:</span> {viewing.customer || "Walk-in"}</div>
            <div><span className="text-muted-foreground">Attendant:</span> {viewing.attendant || "—"}</div>
            <div><span className="text-muted-foreground">Fuel:</span> {viewing.fuelType}</div>
            <div><span className="text-muted-foreground">Pump:</span> Pump {viewing.pumpNumber}</div>
            <div><span className="text-muted-foreground">Litres:</span> {viewing.litres.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Price/L:</span> Ksh {viewing.pricePerLitre}</div>
            <div><span className="text-muted-foreground">Gross:</span> Ksh {viewing.amount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Discount:</span> Ksh {viewing.discount.toLocaleString()}</div>
            <div><span className="text-muted-foreground">Net Amount:</span> <strong>Ksh {viewing.netAmount.toLocaleString()}</strong></div>
            <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod} · <StatusBadge status={viewing.paymentStatus} /></div>
          </div>
        )}
      </ModalForm>
    </div>
  );
}
