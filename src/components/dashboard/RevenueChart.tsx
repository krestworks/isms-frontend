import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Jan", fuel: 420000, lpg: 85000, water: 62000, auto: 48000, wash: 35000 },
  { month: "Feb", fuel: 380000, lpg: 92000, water: 58000, auto: 52000, wash: 38000 },
  { month: "Mar", fuel: 450000, lpg: 78000, water: 71000, auto: 45000, wash: 42000 },
  { month: "Apr", fuel: 470000, lpg: 88000, water: 65000, auto: 55000, wash: 40000 },
  { month: "May", fuel: 510000, lpg: 95000, water: 74000, auto: 60000, wash: 45000 },
  { month: "Jun", fuel: 490000, lpg: 82000, water: 80000, auto: 58000, wash: 48000 },
];

export function RevenueChart() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-foreground">Revenue by Module</h3>
          <p className="text-xs text-muted-foreground">Monthly breakdown (Ksh)</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v / 1000}k`} />
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
          <Bar dataKey="fuel" name="Fuel" fill="hsl(var(--chart-fuel))" radius={[3, 3, 0, 0]} />
          <Bar dataKey="lpg" name="LPG" fill="hsl(var(--chart-lpg))" radius={[3, 3, 0, 0]} />
          <Bar dataKey="water" name="Water" fill="hsl(var(--chart-water))" radius={[3, 3, 0, 0]} />
          <Bar dataKey="auto" name="Auto" fill="hsl(var(--chart-auto))" radius={[3, 3, 0, 0]} />
          <Bar dataKey="wash" name="Wash" fill="hsl(var(--chart-wash))" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
