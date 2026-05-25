import { useCallback, useEffect, useState } from "react";
import { Fuel, Flame, Droplets, Wrench, Car, DollarSign, Users, MapPin, Gauge, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { ApproverInbox } from "@/components/dashboard/ApproverInbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sessionStore, useSession } from "@/data/sessionStore";
import { usePermissions } from "@/lib/permissions";
import { stationsApi, ApiStationFull } from "@/lib/stationsApi";
import { hrApi } from "@/lib/hrApi";
import { fuelApi, ApiFuelSummary } from "@/lib/fuelApi";

const modules = [
  { title: "Fuel Management",  description: "Tank levels, pump sales, reconciliation",  icon: Fuel,     href: "/fuel",       colorVar: "--chart-fuel"  },
  { title: "LPG Management",   description: "Cylinder inventory, sales, refills",        icon: Flame,    href: "/lpg",        colorVar: "--chart-lpg"   },
  { title: "Water Production", description: "Production, equipment, distribution",       icon: Droplets, href: "/water",      colorVar: "--chart-water" },
  { title: "Auto Services",    description: "Service records, billing, technicians",     icon: Wrench,   href: "/automotive", colorVar: "--chart-auto"  },
  { title: "Car Wash",         description: "Queue, packages, daily tracking",           icon: Car,      href: "/carwash",    colorVar: "--chart-wash"  },
];

export default function DashboardPage() {
  useSession(); // re-render on role/location changes
  const can = usePermissions();
  const canViewFinance  = can("finance.reports.view");
  const canViewStations = can("stations.view");
  const canViewFuel     = can("fuel.sales.view");
  const canViewHR       = can("hr.staff.view");

  const activeLoc = sessionStore.activeLocation();
  const isAllScope = activeLoc === "All Locations";

  const [stations, setStations]         = useState<ApiStationFull[]>([]);
  const [activeStation, setActiveStation] = useState<ApiStationFull | null>(null);
  const [fuelSummary, setFuelSummary]   = useState<ApiFuelSummary | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const stRes = await stationsApi.list().catch(() => ({ data: [] as ApiStationFull[] }));
    const all   = stRes.data ?? [];
    setStations(all);
    const match = all.find(s => s.name === activeLoc) ?? all[0] ?? null;
    setActiveStation(match);

    await Promise.allSettled([
      canViewFuel && match
        ? fuelApi.summary(match.id).then(r => setFuelSummary(r.data ?? null)).catch(() => {})
        : Promise.resolve(),
      canViewHR
        ? hrApi.employees.list({ status: "active", limit: 1 }).then(r => setEmployeeCount(r.meta?.total ?? 0)).catch(() => {})
        : Promise.resolve(),
    ]);
  }, [activeLoc, canViewFuel, canViewHR]);

  useEffect(() => { load(); }, [load]);

  const kpis = [
    ...(canViewFinance && fuelSummary != null ? [{
      title: "Today's Fuel Revenue",
      value: `Ksh ${fuelSummary.todayRevenue.toLocaleString()}`,
      change: 0, icon: DollarSign,
    }] : []),
    ...(canViewHR && employeeCount != null ? [{
      title: "Active Employees",
      value: String(employeeCount),
      change: 0, icon: Users,
    }] : []),
    ...(canViewFuel && fuelSummary != null ? [{
      title: "Fuel Transactions Today",
      value: String(fuelSummary.todayTransactions),
      change: 0, icon: Gauge,
    }] : []),
    ...(canViewStations ? [{
      title: "Active Locations",
      value: String(stations.filter(s => s.status === "Active").length),
      change: 0, icon: MapPin,
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isAllScope
              ? `Aggregated view across ${stations.length} location${stations.length !== 1 ? "s" : ""}`
              : `Showing data for ${activeLoc}`}
          </p>
        </div>
        <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> Scope: {activeLoc}</Badge>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
        </div>
      )}

      {/* Fuel at-a-glance */}
      {canViewFuel && fuelSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Litres Today",   value: `${fuelSummary.todayLitres.toLocaleString()} L`,  color: "" },
            { label: "Transactions",   value: String(fuelSummary.todayTransactions),             color: "" },
            { label: "Total Tanks",    value: String(fuelSummary.totalTanks),                   color: "" },
            { label: "Alert Tanks",    value: String(fuelSummary.alertTanks),
              color: fuelSummary.alertTanks > 0 ? "text-destructive" : "text-green-600",
              icon: fuelSummary.alertTanks > 0 ? AlertTriangle : undefined },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Location overview — only for admins who can see all stations */}
      {canViewStations && isAllScope && stations.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Locations</h3>
              <p className="text-xs text-muted-foreground">Click a branch to switch your active location</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stations.filter(s => s.status === "Active").map(s => (
                <button
                  key={s.id}
                  onClick={() => sessionStore.switchLocation(s.name)}
                  className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold truncate">{s.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-1 shrink-0">{s.type}</Badge>
                  </div>
                  {s.city && <p className="text-xs text-muted-foreground">{s.city}</p>}
                  {s.openedOn && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Since {s.openedOn.split("T")[0]}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ApproverInbox />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {canViewFinance && <div className="lg:col-span-2"><RevenueChart /></div>}
        <AlertsFeed />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Modules
          {!isAllScope && <span className="text-xs font-normal text-muted-foreground ml-2">— {activeLoc}</span>}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {modules.map((mod, i) => <ModuleCard key={mod.title} {...mod} stats={[]} index={i} />)}
        </div>
      </div>
    </div>
  );
}
