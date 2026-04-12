import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const revenueByModule = [
  { module: "Fuel", revenue: 2450000, expenses: 1890000, profit: 560000 },
  { module: "LPG", revenue: 890000, expenses: 620000, profit: 270000 },
  { module: "Water", revenue: 540000, expenses: 310000, profit: 230000 },
  { module: "Auto", revenue: 380000, expenses: 240000, profit: 140000 },
  { module: "Car Wash", revenue: 290000, expenses: 160000, profit: 130000 },
];

const monthlyTrend = [
  { month: "Jul", fuel: 2100000, lpg: 780000, water: 490000, auto: 320000, carwash: 250000 },
  { month: "Aug", fuel: 2200000, lpg: 810000, water: 510000, auto: 340000, carwash: 260000 },
  { month: "Sep", fuel: 2350000, lpg: 850000, water: 520000, auto: 360000, carwash: 270000 },
  { month: "Oct", fuel: 2300000, lpg: 860000, water: 530000, auto: 350000, carwash: 275000 },
  { month: "Nov", fuel: 2400000, lpg: 870000, water: 535000, auto: 370000, carwash: 280000 },
  { month: "Dec", fuel: 2450000, lpg: 890000, water: 540000, auto: 380000, carwash: 290000 },
];

const pieData = revenueByModule.map(r => ({ name: r.module, value: r.revenue }));
const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const fmt = (v: number) => `Ksh ${(v / 1000000).toFixed(1)}M`;

export function CrossModuleAnalyticsTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Cross-Module Analytics</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {revenueByModule.map(m => (
          <Card key={m.module}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{m.module}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">Ksh {m.revenue.toLocaleString()}</p>
              <p className="text-xs text-green-500">Profit: Ksh {m.profit.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Margin: {((m.profit / m.revenue) * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue vs Expenses by Module</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByModule}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="module" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">6-Month Revenue Trend by Module</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="fuel" stroke="hsl(var(--primary))" strokeWidth={2} name="Fuel" />
              <Line type="monotone" dataKey="lpg" stroke="hsl(var(--chart-2))" strokeWidth={2} name="LPG" />
              <Line type="monotone" dataKey="water" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Water" />
              <Line type="monotone" dataKey="auto" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Auto" />
              <Line type="monotone" dataKey="carwash" stroke="hsl(var(--chart-5))" strokeWidth={2} name="Car Wash" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
