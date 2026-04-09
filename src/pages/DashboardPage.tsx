import { Fuel, Flame, Droplets, Wrench, Car, DollarSign, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { AlertsFeed } from "@/components/dashboard/AlertsFeed";

const kpis = [
  { title: "Today's Revenue", value: "Ksh 284,500", change: 12.5, icon: DollarSign },
  { title: "Total Sales", value: "1,247", change: 8.3, icon: ShoppingCart },
  { title: "Active Clients", value: "386", change: 5.1, icon: Users },
  { title: "Alerts", value: "4", change: -15, icon: AlertTriangle },
];

const modules = [
  {
    title: "Fuel Management",
    description: "Tank levels, pump sales, reconciliation",
    icon: Fuel,
    href: "/fuel",
    colorVar: "--chart-fuel",
    stats: [
      { label: "Today's Sales", value: "Ksh 185K" },
      { label: "Tank Capacity", value: "78%" },
    ],
  },
  {
    title: "LPG Management",
    description: "Cylinder inventory, sales, refills",
    icon: Flame,
    href: "/lpg",
    colorVar: "--chart-lpg",
    stats: [
      { label: "Full Cylinders", value: "342" },
      { label: "Today's Sales", value: "Ksh 48K" },
    ],
  },
  {
    title: "Water Production",
    description: "Production, equipment, distribution",
    icon: Droplets,
    href: "/water",
    colorVar: "--chart-water",
    stats: [
      { label: "Today's Output", value: "5,200L" },
      { label: "Revenue", value: "Ksh 32K" },
    ],
  },
  {
    title: "Auto Services",
    description: "Service records, billing, technicians",
    icon: Wrench,
    href: "/automotive",
    colorVar: "--chart-auto",
    stats: [
      { label: "Active Jobs", value: "7" },
      { label: "Revenue", value: "Ksh 28K" },
    ],
  },
  {
    title: "Car Wash",
    description: "Queue, packages, daily tracking",
    icon: Car,
    href: "/carwash",
    colorVar: "--chart-wash",
    stats: [
      { label: "In Queue", value: "3" },
      { label: "Washed Today", value: "24" },
    ],
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of all station operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <AlertsFeed />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {modules.map((mod, i) => (
            <ModuleCard key={mod.title} {...mod} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
