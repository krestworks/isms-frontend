import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { financeApi, ApiProfitLoss } from "@/lib/financeApi";
import { useActiveStation } from "@/lib/useActiveStation";

const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
const today        = () => new Date().toISOString().split("T")[0];

export function ProfitLossTab() {
  const { stationId } = useActiveStation();
  const [pl,      setPl]      = useState<ApiProfitLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [from,    setFrom]    = useState(firstOfMonth());
  const [to,      setTo]      = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.pl(stationId, { from, to });
      setPl(res.data);
    } catch (e: any) { toast.error(e?.message || "Failed to load P&L"); }
    finally { setLoading(false); }
  }, [stationId, from, to]);

  useEffect(() => { load(); }, [load]);

  const kpi = pl ? [
    { label: "Total Revenue",  value: pl.totalRevenue,  color: "text-emerald-400" },
    { label: "Cost of Goods",  value: pl.totalCogs,     color: "text-orange-400" },
    { label: "Gross Profit",   value: pl.grossProfit,   color: "text-blue-400" },
    { label: "Net Profit",     value: pl.netProfit,     color: pl.netProfit >= 0 ? "text-emerald-400" : "text-destructive" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />Apply
        </Button>
      </div>

      {pl && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpi.map(k => (
              <Card key={k.label}>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{k.label}</CardTitle></CardHeader>
                <CardContent><p className={`text-xl font-bold ${k.color}`}>Ksh {k.value.toLocaleString()}</p></CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">P&L by Module</CardTitle></CardHeader>
            <CardContent>
              {pl.byModule.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No revenue or expense data for the selected period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs uppercase">Module</TableHead>
                      <TableHead className="text-xs uppercase text-right">Revenue</TableHead>
                      <TableHead className="text-xs uppercase text-right">COGS</TableHead>
                      <TableHead className="text-xs uppercase text-right">Gross Profit</TableHead>
                      <TableHead className="text-xs uppercase text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pl.byModule.map(r => {
                      const gp     = r.revenue - r.cogs;
                      const margin = r.revenue > 0 ? ((gp / r.revenue) * 100).toFixed(1) : "0.0";
                      return (
                        <TableRow key={r.module}>
                          <TableCell className="font-medium">{r.module}</TableCell>
                          <TableCell className="text-right">Ksh {r.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">Ksh {r.cogs.toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-semibold ${gp >= 0 ? "text-emerald-400" : "text-destructive"}`}>Ksh {gp.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{margin}%</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">Ksh {pl.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">Ksh {pl.totalCogs.toLocaleString()}</TableCell>
                      <TableCell className={`text-right ${pl.grossProfit >= 0 ? "text-emerald-400" : "text-destructive"}`}>Ksh {pl.grossProfit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {pl.totalRevenue > 0 ? ((pl.grossProfit / pl.totalRevenue) * 100).toFixed(1) : "0.0"}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {pl.generalOpex > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">General Operating Expenses</span>
                  <span className="font-semibold text-orange-400">- Ksh {pl.generalOpex.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-2 font-bold border-t pt-2">
                  <span>Net Profit</span>
                  <span className={pl.netProfit >= 0 ? "text-emerald-400" : "text-destructive"}>Ksh {pl.netProfit.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
