import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useActiveStation } from "@/lib/useActiveStation";
import { financeApi, ApiVarianceRow, ApiBudget } from "@/lib/financeApi";
import { ModalForm } from "@/components/shared/ModalForm";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MODULES = ["Fuel","LPG","Water","Automotive","Car Wash","General"];
const METRICS = ["Revenue","Expenses"];

const now = new Date();
const thisYear  = String(now.getFullYear());
const thisMonth = String(now.getMonth() + 1);

export function VarianceTab() {
  const { stationId } = useActiveStation();
  const [year,    setYear]    = useState(thisYear);
  const [month,   setMonth]   = useState(thisMonth);
  const [rows,    setRows]    = useState<ApiVarianceRow[]>([]);
  const [budgets, setBudgets] = useState<ApiBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ module: string; metric: string; amount: number } | null>(null);
  const [editForm, setEditForm] = useState({ module: "Fuel", metric: "Revenue", amount: 0 });

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [varRes, budRes] = await Promise.all([
        financeApi.variance(stationId, { year, month }),
        financeApi.budgets.list(stationId, { year, month }),
      ]);
      setRows(varRes.data?.rows ?? []);
      setBudgets(budRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load variance"); }
    finally { setLoading(false); }
  }, [stationId, year, month]);

  useEffect(() => { load(); }, [load]);

  const openBudget = (row?: ApiVarianceRow) => {
    setEditForm({ module: row?.module ?? "Fuel", metric: row?.metric ?? "Revenue", amount: row?.budget ?? 0 });
    setModal(row ? { module: row.module, metric: row.metric, amount: row.budget } : { module: "Fuel", metric: "Revenue", amount: 0 });
  };

  const handleSaveBudget = async () => {
    if (!stationId) return toast.error("No station selected");
    try {
      await financeApi.budgets.upsert({ year: +year, month: +month, module: editForm.module, metric: editForm.metric, amount: editForm.amount }, stationId);
      toast.success("Budget saved");
      setModal(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to save budget"); }
  };

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        <Button size="sm" onClick={() => openBudget()}><Plus className="h-4 w-4 mr-1" />Set Budget</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Budget vs Actual — {MONTHS[(+month) - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data for this period. Set budgets and record revenue/expenses to see variance.</p>
          ) : (
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
                  <TableHead className="text-xs uppercase"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
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
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openBudget(r)}><Pencil className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {modal !== null && (
        <ModalForm open onClose={() => setModal(null)} title="Set Budget" onSubmit={handleSaveBudget}>
          <div className="space-y-3">
            <div><Label>Module</Label>
              <Select value={editForm.module} onValueChange={v => setEditForm(f => ({ ...f, module: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Metric</Label>
              <Select value={editForm.metric} onValueChange={v => setEditForm(f => ({ ...f, metric: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METRICS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Budget Amount (Ksh)</Label>
              <Input type="number" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: +e.target.value }))} />
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
