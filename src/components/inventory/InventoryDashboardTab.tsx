import { useCallback, useEffect, useState } from "react";
import { Package, AlertTriangle, ShoppingCart, ClipboardCheck, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { inventoryApi, ApiInventoryDashboard } from "@/lib/inventoryApi";
import { useActiveStation } from "@/lib/useActiveStation";

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className={`mt-0.5 ${color}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Fuel", lpg: "LPG", water: "Water", auto_parts: "Auto Parts",
  general: "General", pharmacy: "Pharmacy", food_bev: "Food & Bev",
};

export default function InventoryDashboardTab() {
  const { stationId } = useActiveStation();
  const [data, setData]     = useState<ApiInventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.dashboard(stationId);
      setData(res.data);
    } catch (e: any) { toast.error(e?.message || "Failed to load dashboard"); }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading inventory dashboard...</div>;
  if (!data)   return <div className="p-8 text-center text-muted-foreground text-sm">No data available</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Inventory Overview</h3>
          <p className="text-sm text-muted-foreground">Central stock summary across all modules</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" />Refresh</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Package}       label="Total Items"   value={data.totalItems}        sub="active items" />
        <StatCard icon={AlertTriangle} label="Low Stock"     value={data.lowStockCount}     sub="at or below reorder" color="text-amber-500" />
        <StatCard icon={TrendingDown}  label="Out of Stock"  value={data.outOfStockCount}   sub="zero quantity" color="text-destructive" />
        <StatCard icon={ShoppingCart}  label="Pending POs"   value={data.pendingPOs}        sub="draft or sent" color="text-blue-500" />
        <StatCard icon={ClipboardCheck} label="Pending GRNs" value={data.pendingGRNs}       sub="not yet posted" color="text-orange-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Low stock items */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold text-sm">Low Stock Items</h4>
          </div>
          {data.lowStockItems.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">All items are sufficiently stocked</div>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {data.lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category] ?? item.category}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`font-bold text-sm ${item.currentQty <= 0 ? "text-destructive" : "text-amber-600"}`}>
                      {item.currentQty} {item.unit}
                    </p>
                    <p className="text-[10px] text-muted-foreground">min: {item.reorderLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent movements */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Recent Stock Movements</h4>
          </div>
          {data.recentMovements.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No movements recorded yet</div>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {data.recentMovements.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.itemName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()} · {m.reference ?? m.movementType}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`font-bold text-sm ${m.qty < 0 || m.movementType === "issue" ? "text-destructive" : "text-green-600"}`}>
                      {m.movementType === "issue" || m.movementType === "transfer_out" ? "−" : "+"}{Math.abs(m.qty)}
                    </p>
                    <Badge variant="outline" className="text-[10px] py-0 capitalize">{m.movementType.replace("_", " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
