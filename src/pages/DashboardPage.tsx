import { useCallback, useEffect, useState } from "react";
import { Fuel, Flame, Droplets, Wrench, Car, DollarSign, Users, MapPin, Gauge, AlertTriangle, LogIn, LogOut, CalendarDays, UserCircle, Building2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";
import { ApproverInbox } from "@/components/dashboard/ApproverInbox";
import { ApprovalsInbox } from "@/components/dashboard/ApprovalsInbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sessionStore, useSession } from "@/data/sessionStore";
import { usePermissions } from "@/lib/permissions";
import { stationsApi, ApiStationFull } from "@/lib/stationsApi";
import { hrApi, ApiAttendance, ApiLeaveBalance } from "@/lib/hrApi";
import { fuelApi, ApiFuelSummary } from "@/lib/fuelApi";
import { accountsApi, ApiAccount } from "@/lib/accountsApi";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppPaths } from "@/hooks/useAppPaths";

function fmtTime(dt?: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const { user } = useSession();
  const can = usePermissions();
  const paths = useAppPaths();

  const modules = [
    { title: "Fuel Management",  description: "Tank levels, pump sales, reconciliation",  icon: Fuel,     href: paths.fuel,       colorVar: "--chart-fuel"  },
    { title: "LPG Management",   description: "Cylinder inventory, sales, refills",        icon: Flame,    href: paths.lpg,        colorVar: "--chart-lpg"   },
    { title: "Water Production", description: "Production, equipment, distribution",       icon: Droplets, href: paths.water,      colorVar: "--chart-water" },
    { title: "Auto Services",    description: "Service records, billing, technicians",     icon: Wrench,   href: paths.automotive, colorVar: "--chart-auto"  },
    { title: "Car Wash",         description: "Queue, packages, daily tracking",           icon: Car,      href: paths.carwash,    colorVar: "--chart-wash"  },
  ];
  const canViewFinance  = can("finance.reports.view");
  const canViewStations = can("stations.view");
  const canViewFuel     = can("fuel.sales.view");
  const canViewHR       = can("hr.staff.view");

  const activeLoc = sessionStore.activeLocation();
  const isAllScope = activeLoc === "All Locations";
  const isSuperAdmin = user.activeRole === "SuperAdmin";
  const isEmployee = !!user.isEmployee; // true only when user has an actual Employee HR record

  const [stations, setStations]           = useState<ApiStationFull[]>([]);
  const [activeStation, setActiveStation] = useState<ApiStationFull | null>(null);
  const [fuelSummary, setFuelSummary]     = useState<ApiFuelSummary | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [accounts, setAccounts]           = useState<ApiAccount[]>([]);

  // Employee quick-view state
  const today = new Date().toISOString().split("T")[0];
  const [todayAttendance, setTodayAttendance] = useState<ApiAttendance | null | undefined>(undefined);
  const [leaveBalances, setLeaveBalances]     = useState<ApiLeaveBalance[]>([]);
  const [clocking, setClocking]               = useState(false);

  const loadEmployee = useCallback(async () => {
    try {
      const [attRes, balRes] = await Promise.allSettled([
        hrApi.self.attendance.list({ from: today, to: today }),
        hrApi.self.leaves.balances(),
      ]);
      if (attRes.status === "fulfilled") {
        setTodayAttendance(attRes.value.data?.[0] ?? null);
      }
      if (balRes.status === "fulfilled") {
        setLeaveBalances(balRes.value.data ?? []);
      }
    } catch { /* non-critical for dashboard */ }
  }, [today]);

  const handleClockIn = async () => {
    setClocking(true);
    try {
      await hrApi.self.attendance.checkIn();
      toast.success("Clocked in");
      loadEmployee();
    } catch (e: any) { toast.error(e?.message || "Clock in failed"); }
    finally { setClocking(false); }
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      await hrApi.self.attendance.checkOut();
      toast.success("Clocked out");
      loadEmployee();
    } catch (e: any) { toast.error(e?.message || "Clock out failed"); }
    finally { setClocking(false); }
  };

  const load = useCallback(async () => {
    if (isSuperAdmin) {
      accountsApi.list({ limit: 50 }).then(r => setAccounts(r.data ?? [])).catch(() => {});
      return;
    }

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
  }, [activeLoc, canViewFuel, canViewHR, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isEmployee) loadEmployee(); }, [isEmployee, loadEmployee]);

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

  // ── Employee redirect ────────────────────────────────────────────────────────
  if (user.activeRole === "Employee") {
    return <Navigate to={paths.employeePortal} replace />;
  }

  // ── SuperAdmin dashboard ────────────────────────────────────────────────────
  if (isSuperAdmin) {
    const active    = accounts.filter(a => a.status === "Active").length;
    const pending   = accounts.filter(a => a.status === "Pending").length;
    const suspended = accounts.filter(a => a.status === "Suspended").length;

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Platform Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of all business accounts on this platform</p>
          </div>
          <Badge variant="outline" className="text-xs"><Building2 className="h-3 w-3 mr-1" /> SuperAdmin</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Accounts",     value: accounts.length, icon: Building2,    color: "" },
            { label: "Active",             value: active,          icon: CheckCircle2, color: "text-green-600" },
            { label: "Pending Activation", value: pending,         icon: Clock,        color: "text-yellow-600" },
            { label: "Suspended",          value: suspended,       icon: XCircle,      color: "text-red-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <s.icon className={`h-5 w-5 ${s.color || "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Business Accounts</CardTitle>
              <Link to="/accounts" className="text-xs text-primary hover:underline">Manage all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No accounts yet. <Link to="/accounts" className="text-primary hover:underline">Create the first one →</Link></p>
            ) : (
              <div className="divide-y divide-border">
                {accounts.slice(0, 8).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        {a.contactEmail && <p className="text-xs text-muted-foreground truncate">{a.contactEmail}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={`ml-3 shrink-0 text-xs ${
                      a.status === "Active"    ? "text-green-600 border-green-500/30" :
                      a.status === "Pending"   ? "text-yellow-600 border-yellow-500/30" :
                      a.status === "Suspended" ? "text-red-600 border-red-500/30" : ""
                    }`}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  // ── End SuperAdmin dashboard ────────────────────────────────────────────────

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

      {/* Employee Quick View — shown whenever the user has an employee record */}
      {isEmployee && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary" />
              My Work Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Attendance */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Attendance</p>
                    <p className="text-xs text-muted-foreground">
                      {todayAttendance === undefined ? "Loading..." :
                       todayAttendance?.checkOut ? `Checked out ${fmtTime(todayAttendance.checkOut)}` :
                       todayAttendance?.checkIn  ? `Checked in ${fmtTime(todayAttendance.checkIn)}` :
                       "Not checked in yet"}
                    </p>
                    {todayAttendance?.checkIn && !todayAttendance.checkOut && (
                      <p className="text-[10px] text-muted-foreground">In: {fmtTime(todayAttendance.checkIn)}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!todayAttendance?.checkIn && (
                      <Button size="sm" onClick={handleClockIn} disabled={clocking || todayAttendance === undefined}>
                        <LogIn className="h-3.5 w-3.5 mr-1" /> Clock In
                      </Button>
                    )}
                    {todayAttendance?.checkIn && !todayAttendance.checkOut && (
                      <Button size="sm" variant="destructive" onClick={handleClockOut} disabled={clocking}>
                        <LogOut className="h-3.5 w-3.5 mr-1" /> Clock Out
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Leave balances */}
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Leave Balances
                </p>
                {leaveBalances.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No allocations — contact HR</p>
                ) : (
                  <div className="space-y-1">
                    {leaveBalances.slice(0, 3).map(b => (
                      <div key={b.leaveType.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{b.leaveType.name}</span>
                        <span className="font-semibold ml-2 shrink-0">{b.available} days</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-2">Quick Links</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "My Details",    hash: "details" },
                    { label: "Attendance",    hash: "attendance" },
                    { label: "Leave",         hash: "leave" },
                    { label: "My Shifts",     hash: "shifts" },
                  ].map(l => (
                    <Link
                      key={l.hash}
                      to={`/employee-portal?tab=${l.hash}`}
                      className="text-xs px-2 py-1.5 rounded border text-center hover:bg-muted/50 transition-colors text-foreground"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
      <ApprovalsInbox />

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
