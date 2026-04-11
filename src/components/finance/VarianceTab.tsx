import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const varianceData = [
  { module: "Fuel", metric: "Revenue", budget: 5000000, actual: 4850000 },
  { module: "Fuel", metric: "Expenses", budget: 4000000, actual: 4125000 },
  { module: "LPG", metric: "Revenue", budget: 950000, actual: 890000 },
  { module: "LPG", metric: "Expenses", budget: 700000, actual: 712000 },
  { module: "Water", metric: "Revenue", budget: 500000, actual: 520000 },
  { module: "Water", metric: "Expenses", budget: 300000, actual: 286000 },
  { module: "Automotive", metric: "Revenue", budget: 350000, actual: 340000 },
  { module: "Automotive", metric: "Expenses", budget: 200000, actual: 204000 },
  { module: "Car Wash", metric: "Revenue", budget: 300000, actual: 280000 },
  { module: "Car Wash", metric: "Expenses", budget: 150000, actual: 140000 },
];

export function VarianceTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Budget vs Actual — January 2025</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs uppercase">Module</TableHead>
                <TableHead className="text-xs uppercase">Metric</TableHead>
                <TableHead className="text-xs uppercase text-right">Budget (Ksh)</TableHead>
                <TableHead className="text-xs uppercase text-right">Actual (Ksh)</TableHead>
                <TableHead className="text-xs uppercase text-right">Variance (Ksh)</TableHead>
                <TableHead className="text-xs uppercase text-right">Variance %</TableHead>
                <TableHead className="text-xs uppercase text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {varianceData.map((r, i) => {
                const variance = r.actual - r.budget;
                const pct = r.budget > 0 ? ((variance / r.budget) * 100).toFixed(1) : "0.0";
                const isRevenue = r.metric === "Revenue";
                const favorable = isRevenue ? variance >= 0 : variance <= 0;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.module}</TableCell>
                    <TableCell>{r.metric}</TableCell>
                    <TableCell className="text-right">Ksh {r.budget.toLocaleString()}</TableCell>
                    <TableCell className="text-right">Ksh {r.actual.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-semibold ${favorable ? "text-emerald-400" : "text-destructive"}`}>
                      {variance >= 0 ? "+" : ""}Ksh {variance.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right ${favorable ? "text-emerald-400" : "text-destructive"}`}>
                      {variance >= 0 ? "+" : ""}{pct}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={favorable ? "default" : "destructive"}>{favorable ? "Favorable" : "Unfavorable"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
