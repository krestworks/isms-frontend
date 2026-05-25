import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TrendingUp, ShoppingBag, Package, AlertTriangle, Download, DollarSign, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizSummary } from "@/lib/bizApi";

interface Props { business: ApiBizBusiness; }

const today       = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

function exportSummaryCSV(summary: ApiBizSummary, from: string, to: string, bizName: string) {
  const rows: string[] = [
    `"${bizName} — Business Report: ${from} to ${to}"`,
    "",
    "KPI,Value",
    `Revenue,Ksh ${summary.revenue.toLocaleString()}`,
    `Total Expenses,Ksh ${summary.totalExpenses.toLocaleString()}`,
    `Net Profit,Ksh ${summary.profit.toLocaleString()}`,
    `Total Transactions,${summary.totalSales}`,
    `Total Products,${summary.totalProducts}`,
    `Low Stock Items,${summary.lowStock}`,
    `Out of Stock Items,${summary.outOfStock}`,
    "",
    "Top Selling Products",
    "Product,Units Sold",
    ...summary.topProducts.map(p => `"${p.name}",${p.qty}`),
    "",
    "Sales by Payment Method",
    "Method,Amount",
    ...summary.byPayment.map(p => `"${p.method}",Ksh ${p.amount.toLocaleString()}`),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `report-${from}-to-${to}.csv`;
  a.click();
}

export function ReportsTab({ business }: Props) {
  const [summary,  setSummary]  = useState<ApiBizSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate,   setToDate]   = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bizApi.reports.summary(business.id, { from: fromDate, to: toDate });
      setSummary(res.data);
    } catch (e: any) { toast.error(e?.message || "Failed to load report"); }
    finally { setLoading(false); }
  }, [business.id, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const margin = summary && summary.revenue > 0
    ? Math.round((summary.profit / summary.revenue) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Filter + Export bar */}
      <div className="flex items-end gap-3 flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>Apply</Button>
        <div className="ml-auto flex gap-2">
          {summary && (
            <Button variant="outline" size="sm" onClick={() => exportSummaryCSV(summary, fromDate, toDate, business.name)}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : summary ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Revenue",     value: `Ksh ${summary.revenue.toLocaleString()}`,      sub: `${summary.totalSales} transactions`, icon: TrendingUp,  color: "text-primary",     bg: "bg-primary/5" },
              { label: "Expenses",    value: `Ksh ${summary.totalExpenses.toLocaleString()}`, sub: "recorded expenses",                  icon: ShoppingBag, color: "text-destructive", bg: "bg-destructive/5" },
              { label: "Net Profit",  value: `Ksh ${summary.profit.toLocaleString()}`,        sub: `${margin}% margin`,                  icon: DollarSign,  color: summary.profit >= 0 ? "text-green-600" : "text-red-600", bg: summary.profit >= 0 ? "bg-green-50" : "bg-red-50" },
              { label: "Products",    value: summary.totalProducts,                           sub: `${summary.lowStock} low stock`,      icon: Package,     color: "text-muted-foreground", bg: "bg-muted/30" },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <Card key={label} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className={`inline-flex p-2 rounded-lg mb-2 ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alerts */}
          {summary.outOfStock > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{summary.outOfStock} product{summary.outOfStock > 1 ? "s are" : " is"} out of stock</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Products */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />Top Selling Products
                </CardTitle>
                <span className="text-xs text-muted-foreground">{fromDate} — {toDate}</span>
              </CardHeader>
              <CardContent>
                {summary.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No sales in this period</p>
                ) : (
                  <div className="space-y-3">
                    {summary.topProducts.map((p, i) => {
                      const max = summary.topProducts[0]?.qty ?? 1;
                      const pct = Math.round((p.qty / max) * 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                              <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                            </span>
                            <span className="text-muted-foreground text-xs shrink-0">{p.qty} units</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods + Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />Sales by Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.byPayment.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No sales in this period</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.byPayment.map((p, i) => {
                        const pct = summary.revenue > 0 ? Math.round((p.amount / summary.revenue) * 100) : 0;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{p.method}</span>
                              <span className="text-muted-foreground text-xs">Ksh {p.amount.toLocaleString()} — {pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Profit summary */}
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Financial Summary</p>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">Ksh {summary.revenue.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="font-medium text-destructive">− Ksh {summary.totalExpenses.toLocaleString()}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Net Profit</span>
                    <span className={summary.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      Ksh {summary.profit.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{margin}% profit margin</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart2 className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">No data for this period</p>
          <p className="text-xs mt-1">Try a different date range</p>
        </div>
      )}
    </div>
  );
}
