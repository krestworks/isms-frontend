import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { financeApi, ApiProfitLoss } from "@/lib/financeApi";

const COLORS = ["hsl(var(--primary))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))"];
const fmt = (v: number) => `Ksh ${v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(0) + "K" : v}`;

const now  = new Date();
const ymFrom = `${now.getFullYear()}-01-01`;
const ymTo   = now.toISOString().split("T")[0];

export function CrossModuleAnalyticsTab() {
  const { stationId } = useActiveStation();
  const [pl,      setPl]      = useState<ApiProfitLoss | null>(null);
  const [from,    setFrom]    = useState(ymFrom);
  const [to,      setTo]      = useState(ymTo);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await financeApi.pl(stationId, { from, to });
      setPl(res.data ?? null);
    } catch (e: any) { toast.error(e?.message || "Failed to load analytics"); }
    finally { setLoading(false); }
  }, [stationId, from, to]);

  useEffect(() => { load(); }, [load]);

  const byModule = pl?.byModule ?? [];
  const pieData  = byModule.filter(m => m.revenue > 0).map(m => ({ name: m.module, value: m.revenue }));

  const kpis = [
    { label: "Total Revenue",  value: pl?.totalRevenue  ?? 0, color: "text-emerald-400" },
    { label: "Total COGS",     value: pl?.totalCogs     ?? 0, color: "text-destructive" },
    { label: "Gross Profit",   value: pl?.grossProfit   ?? 0, color: "text-primary" },
    { label: "Net Profit",     value: pl?.netProfit     ?? 0, color: pl && pl.netProfit >= 0 ? "text-emerald-400" : "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <h3 className="text-lg font-semibold text-foreground flex-1">Cross-Module Analytics</h3>
        <div className="flex items-center gap-2">
          <Label className="text-sm">From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">To</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{fmt(k.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-module KPI cards */}
      {byModule.length > 0 && (
        <div className={`grid gap-4 ${byModule.length <= 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-5"}`}>
          {byModule.map(m => {
            const profit = m.revenue - m.cogs;
            const margin = m.revenue > 0 ? ((profit / m.revenue) * 100).toFixed(1) : "0.0";
            return (
              <Card key={m.module}>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{m.module}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-foreground">{fmt(m.revenue)}</p>
                  <p className={`text-xs ${profit >= 0 ? "text-emerald-400" : "text-destructive"}`}>Profit: {fmt(profit)}</p>
                  <p className="text-xs text-muted-foreground">Margin: {margin}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {byModule.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue vs COGS by Module</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byModule}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="module" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Revenue" />
                  <Bar dataKey="cogs"    fill="hsl(var(--muted-foreground))" radius={[4,4,0,0]} name="COGS" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        !loading && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No revenue data found for the selected period. Record completed revenue entries in the Finance module to see analytics here.
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
