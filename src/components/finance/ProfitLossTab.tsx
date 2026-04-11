import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const plData = [
  { module: "Fuel", revenue: 4850000, cogs: 3880000, opex: 245000 },
  { module: "LPG", revenue: 890000, cogs: 623000, opex: 89000 },
  { module: "Water", revenue: 520000, cogs: 208000, opex: 78000 },
  { module: "Automotive", revenue: 340000, cogs: 136000, opex: 68000 },
  { module: "Car Wash", revenue: 280000, cogs: 56000, opex: 84000 },
];

export function ProfitLossTab() {
  const [period, setPeriod] = useState("january-2025");

  const totalRevenue = plData.reduce((s, r) => s + r.revenue, 0);
  const totalCogs = plData.reduce((s, r) => s + r.cogs, 0);
  const totalOpex = plData.reduce((s, r) => s + r.opex, 0);
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalOpex;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="january-2025">January 2025</SelectItem>
            <SelectItem value="december-2024">December 2024</SelectItem>
            <SelectItem value="q4-2024">Q4 2024</SelectItem>
            <SelectItem value="fy-2024">FY 2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: totalRevenue, color: "text-emerald-400" },
          { label: "Cost of Goods", value: totalCogs, color: "text-orange-400" },
          { label: "Gross Profit", value: grossProfit, color: "text-blue-400" },
          { label: "Net Profit", value: netProfit, color: netProfit >= 0 ? "text-emerald-400" : "text-destructive" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-medium">{kpi.label}</CardTitle></CardHeader>
            <CardContent><p className={`text-xl font-bold ${kpi.color}`}>Ksh {kpi.value.toLocaleString()}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">P&L by Module</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs uppercase">Module</TableHead>
                <TableHead className="text-xs uppercase text-right">Revenue</TableHead>
                <TableHead className="text-xs uppercase text-right">COGS</TableHead>
                <TableHead className="text-xs uppercase text-right">Gross Profit</TableHead>
                <TableHead className="text-xs uppercase text-right">OpEx</TableHead>
                <TableHead className="text-xs uppercase text-right">Net Profit</TableHead>
                <TableHead className="text-xs uppercase text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plData.map(r => {
                const gp = r.revenue - r.cogs;
                const np = gp - r.opex;
                const margin = r.revenue > 0 ? ((np / r.revenue) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={r.module}>
                    <TableCell className="font-medium">{r.module}</TableCell>
                    <TableCell className="text-right">Ksh {r.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">Ksh {r.cogs.toLocaleString()}</TableCell>
                    <TableCell className="text-right">Ksh {gp.toLocaleString()}</TableCell>
                    <TableCell className="text-right">Ksh {r.opex.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-semibold ${np >= 0 ? "text-emerald-400" : "text-destructive"}`}>Ksh {np.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{margin}%</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t-2 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">Ksh {totalRevenue.toLocaleString()}</TableCell>
                <TableCell className="text-right">Ksh {totalCogs.toLocaleString()}</TableCell>
                <TableCell className="text-right">Ksh {grossProfit.toLocaleString()}</TableCell>
                <TableCell className="text-right">Ksh {totalOpex.toLocaleString()}</TableCell>
                <TableCell className={`text-right ${netProfit >= 0 ? "text-emerald-400" : "text-destructive"}`}>Ksh {netProfit.toLocaleString()}</TableCell>
                <TableCell className="text-right">{totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0"}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
