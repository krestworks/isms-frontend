import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fuelApi } from "@/lib/fuelApi";
import { sessionStore } from "@/data/sessionStore";
import { useStations } from "@/data/stationsCache";

interface ChartPoint {
  month: string;
  fuel: number;
  lpg: number;
  water: number;
  auto: number;
  wash: number;
}

export function RevenueChart() {
  const stations      = useStations();
  const activeLoc     = sessionStore.activeLocation();
  const activeStation = stations.find(s => s.name === activeLoc);

  const [data,    setData]    = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fuelApi.monthlySummary(6, activeStation?.id)
      .then(res => {
        setData(
          (res.data ?? []).map(d => ({
            month: d.month,
            fuel:  d.fuel,
            lpg:   0,
            water: 0,
            auto:  0,
            wash:  0,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeStation?.id]);

  const hasData = data.some(d => d.fuel > 0);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-foreground">Revenue by Module</h3>
          <p className="text-xs text-muted-foreground">Monthly breakdown (Ksh) — last 6 months</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
          Loading revenue data…
        </div>
      ) : !hasData ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm font-medium text-muted-foreground">No revenue recorded yet</p>
          <p className="text-xs text-muted-foreground">Revenue will appear here as sales are recorded across modules.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, undefined]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="fuel"  name="Fuel"  fill="hsl(var(--chart-fuel))"  radius={[3, 3, 0, 0]} />
            <Bar dataKey="lpg"   name="LPG"   fill="hsl(var(--chart-lpg))"   radius={[3, 3, 0, 0]} />
            <Bar dataKey="water" name="Water" fill="hsl(var(--chart-water))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="auto"  name="Auto"  fill="hsl(var(--chart-auto))"  radius={[3, 3, 0, 0]} />
            <Bar dataKey="wash"  name="Wash"  fill="hsl(var(--chart-wash))"  radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
