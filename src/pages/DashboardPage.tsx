import { Fuel, Flame, Droplets, Wrench, Car, DollarSign, ShoppingCart, Users, MapPin } from "lucide-react";
import { useMemo } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { ApproverInbox } from "@/components/dashboard/ApproverInbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocations } from "@/data/locationsStore";
import { useStaff } from "@/data/staffStore";
import { useShifts } from "@/data/shiftsStore";
import { useSession, sessionStore } from "@/data/sessionStore";
import { isLocationVisible } from "@/lib/permissions";

// Per-location revenue mock — in a real backend this would be aggregated from sales tables.
const LOC_REVENUE: Record<string, { fuel: number; lpg: number; water: number; auto: number; wash: number }> = {
  "Nairobi CBD": { fuel: 185000, lpg: 32000, water: 18000, auto: 0, wash: 22000 },
  "Westlands": { fuel: 142000, lpg: 0, water: 0, auto: 28000, wash: 0 },
  "Mombasa Road": { fuel: 168000, lpg: 0, water: 24000, auto: 0, wash: 18500 },
  "Nakuru Depot": { fuel: 0, lpg: 12000, water: 9500, auto: 0, wash: 0 },
};
const sumRev = (loc: string) => Object.values(LOC_REVENUE[loc] || {}).reduce((a, b) => a + b, 0);

const modules = [
  { title: "Fuel Management", description: "Tank levels, pump sales, reconciliation", icon: Fuel, href: "/fuel", colorVar: "--chart-fuel" },
  { title: "LPG Management", description: "Cylinder inventory, sales, refills", icon: Flame, href: "/lpg", colorVar: "--chart-lpg" },
  { title: "Water Production", description: "Production, equipment, distribution", icon: Droplets, href: "/water", colorVar: "--chart-water" },
  { title: "Auto Services", description: "Service records, billing, technicians", icon: Wrench, href: "/automotive", colorVar: "--chart-auto" },
  { title: "Car Wash", description: "Queue, packages, daily tracking", icon: Car, href: "/carwash", colorVar: "--chart-wash" },
];

export default function DashboardPage() {
  useSession();
  const locations = useLocations();
  const staff = useStaff();
  const shifts = useShifts();
  const activeLoc = sessionStore.activeLocation();
  const isAllScope = activeLoc === "All Locations";

  const visibleLocs = useMemo(() => locations.filter(l => isLocationVisible(l.name)), [locations, activeLoc]);
  const today = new Date().toISOString().split("T")[0];

  // KPI calculations honoring location scope
  const scopedStaff = staff.filter(s => isLocationVisible(s.location));
  const scopedShifts = shifts.filter(s => isLocationVisible(s.location) && s.date === today);
  const scopedRevenue = isAllScope
    ? visibleLocs.reduce((sum, l) => sum + sumRev(l.name), 0)
    : sumRev(activeLoc);

  const kpis = [
    { title: "Today's Revenue", value: `Ksh ${scopedRevenue.toLocaleString()}`, change: 12.5, icon: DollarSign },
    { title: "Active Staff", value: String(scopedStaff.filter(s => s.status === "active").length), change: 5.1, icon: Users },
    { title: "Shifts Today", value: String(scopedShifts.length), change: 8.3, icon: ShoppingCart },
    { title: "Locations", value: String(visibleLocs.length), change: 0, icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isAllScope ? `Aggregated view across ${visibleLocs.length} locations` : `Showing data for ${activeLoc}`}
          </p>
        </div>
        <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> Scope: {activeLoc}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
      </div>

      {/* Per-location comparison — only when admin is in All Locations scope */}
      {isAllScope && visibleLocs.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Location Comparison</h3>
                <p className="text-xs text-muted-foreground">Today's revenue by branch — switch the location header to drill in</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {visibleLocs.map(l => {
                const rev = sumRev(l.name);
                const staffCount = staff.filter(s => s.location === l.name && s.status === "active").length;
                const shiftCount = shifts.filter(s => s.location === l.name && s.date === today).length;
                return (
                  <button key={l.id} onClick={() => sessionStore.switchLocation(l.name)} className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{l.name}</span>
                      <Badge variant="outline" className="text-[10px]">{l.type}</Badge>
                    </div>
                    <p className="text-xl font-bold text-primary">Ksh {(rev / 1000).toFixed(0)}k</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{staffCount} staff · {shiftCount} shifts today</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {l.modules.slice(0, 3).map(m => <Badge key={m} variant="secondary" className="text-[9px]">{m}</Badge>)}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <ApproverInbox />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><RevenueChart /></div>
        <AlertsFeed />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Modules {!isAllScope && <span className="text-xs font-normal text-muted-foreground">— filtered to {activeLoc}</span>}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {modules.map((mod, i) => {
            const stats = isAllScope
              ? [{ label: "Total Today", value: `Ksh ${(visibleLocs.reduce((s, l) => s + (LOC_REVENUE[l.name]?.[mod.colorVar.includes("fuel") ? "fuel" : mod.colorVar.includes("lpg") ? "lpg" : mod.colorVar.includes("water") ? "water" : mod.colorVar.includes("auto") ? "auto" : "wash"] || 0), 0) / 1000).toFixed(0)}k` }]
              : [{ label: activeLoc, value: `Ksh ${((LOC_REVENUE[activeLoc]?.[mod.colorVar.includes("fuel") ? "fuel" : mod.colorVar.includes("lpg") ? "lpg" : mod.colorVar.includes("water") ? "water" : mod.colorVar.includes("auto") ? "auto" : "wash"] || 0) / 1000).toFixed(0)}k` }];
            return <ModuleCard key={mod.title} {...mod} stats={stats} index={i} />;
          })}
        </div>
      </div>
    </div>
  );
}
