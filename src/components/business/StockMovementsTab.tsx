import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizStockMovement } from "@/lib/bizApi";

interface Props { business: ApiBizBusiness; }

const today       = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

const TYPE_COLORS: Record<string, string> = {
  purchase_in: "bg-green-100 text-green-700",
  sale_out:    "bg-blue-100 text-blue-700",
  adjustment:  "bg-purple-100 text-purple-700",
  return:      "bg-amber-100 text-amber-700",
  wastage:     "bg-red-100 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  purchase_in: "Purchase In",
  sale_out:    "Sale Out",
  adjustment:  "Adjustment",
  return:      "Return",
  wastage:     "Wastage",
};

export function StockMovementsTab({ business }: Props) {
  const [records,  setRecords]  = useState<ApiBizStockMovement[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate,   setToDate]   = useState(today());
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bizApi.stockMovements.list(business.id, { from: fromDate, to: toDate, type: typeFilter === "all" ? undefined : typeFilter });
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load movements"); }
    finally { setLoading(false); }
  }, [business.id, fromDate, toDate, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const columns: Column<ApiBizStockMovement>[] = [
    { key: "date",        label: "Date",        sortable: true },
    { key: "productName", label: "Product",     sortable: true },
    { key: "type",        label: "Type",        render: m => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[m.type] ?? "bg-muted text-foreground"}`}>
        {TYPE_LABELS[m.type] ?? m.type}
      </span>
    )},
    { key: "qty",         label: "Qty",         render: m => (
      <span className={m.type === "sale_out" || m.type === "wastage" ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
        {m.type === "sale_out" || m.type === "wastage" ? "-" : "+"}{m.qty}
      </span>
    ), sortable: true },
    { key: "before",      label: "Before",      sortable: true },
    { key: "after",       label: "After",       sortable: true },
    { key: "reference",   label: "Reference",   render: m => m.reference ? <span className="font-mono text-xs">{m.reference}</span> : "—" },
    { key: "notes",       label: "Notes",       render: m => m.notes || "—" },
  ];

  const filters: FilterOption[] = [
    { key: "type", label: "Type", options: Object.entries(TYPE_LABELS).map(([v, l]) => ({ label: l, value: v })) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">Stock movement audit trail</p>
        <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <div className="flex gap-3 items-end flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
      </div>

      <DataTable
        data={records} columns={columns} filters={filters}
        searchKeys={["productName","reference"]} searchPlaceholder="Search movements..."
      />
    </div>
  );
}
