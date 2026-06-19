import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fuelApi, ApiFuelTank } from "@/lib/fuelApi";
import { hrApi, ApiLeaveRequest } from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";
import { sessionStore } from "@/data/sessionStore";
import { useStations } from "@/data/stationsCache";

interface AlertItem {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  detail?: string;
}

function tankToAlert(t: ApiFuelTank): AlertItem {
  return {
    id: t.id,
    type: t.status === "critical" ? "error" : "warning",
    message: `${t.name} (${t.fuelType}) is ${t.status}`,
    detail: `${t.currentLevel.toFixed(0)} L remaining`,
  };
}

function leaveToAlert(r: ApiLeaveRequest): AlertItem {
  const name = (r.employee as any)?.user?.name ?? "An employee";
  return {
    id: r.id,
    type: "info",
    message: `${name} has a pending leave request`,
    detail: `${r.startDate} → ${r.endDate} · ${r.days} day${r.days !== 1 ? "s" : ""}`,
  };
}

const typeStyles: Record<string, string> = {
  warning: "bg-warning/10 text-warning",
  error:   "bg-destructive/10 text-destructive",
  info:    "bg-primary/10 text-primary",
};

const TypeIcon = ({ type }: { type: string }) =>
  type === "error" || type === "warning"
    ? <AlertTriangle className="h-4 w-4" />
    : type === "info" && <Bell className="h-4 w-4" />;

export function AlertsFeed() {
  const can          = usePermissions();
  const canViewFuel  = can("fuel.sales.view");
  const canViewHR    = can("hr.staff.view");
  const stations     = useStations();
  const activeLoc    = sessionStore.activeLocation();
  const activeStation = stations.find(s => s.name === activeLoc);

  const [alerts,  setAlerts]  = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const collected: AlertItem[] = [];

    await Promise.allSettled([
      canViewFuel
        ? fuelApi.tanks.list(activeStation?.id).then(res => {
            const bad = (res.data ?? []).filter(t => t.status === "low" || t.status === "critical");
            bad.forEach(t => collected.push(tankToAlert(t)));
          })
        : Promise.resolve(),

      canViewHR
        ? hrApi.leaves.list({ status: "Pending" }).then(res => {
            (res.data ?? []).slice(0, 5).forEach(r => collected.push(leaveToAlert(r)));
          })
        : Promise.resolve(),
    ]);

    // Errors/warnings first, then info
    collected.sort((a, b) => {
      const order = { error: 0, warning: 1, info: 2 };
      return (order[a.type] ?? 3) - (order[b.type] ?? 3);
    });

    setAlerts(collected);
    setLoading(false);
  }, [canViewFuel, canViewHR, activeStation?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Alerts</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <p className="text-sm font-medium text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground">No alerts at this time</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-start gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${typeStyles[alert.type]}`}>
                <TypeIcon type={alert.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{alert.message}</p>
                {alert.detail && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{alert.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
