import { AlertTriangle, TrendingDown, Package, Bell } from "lucide-react";

const alerts = [
  { type: "warning", icon: AlertTriangle, message: "Tank 2 (Diesel) below 20% capacity", time: "5 min ago" },
  { type: "error", icon: TrendingDown, message: "Fuel variance detected: -45L on Pump 3", time: "12 min ago" },
  { type: "info", icon: Package, message: "LPG delivery scheduled: 200 cylinders", time: "1 hr ago" },
  { type: "warning", icon: AlertTriangle, message: "Car wash soap inventory low", time: "2 hrs ago" },
  { type: "info", icon: Bell, message: "Monthly report ready for review", time: "3 hrs ago" },
];

const typeStyles: Record<string, string> = {
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
};

export function AlertsFeed() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4">Recent Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${typeStyles[alert.type]}`}>
              <alert.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{alert.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
