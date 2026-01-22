import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface RevenueChartProps {
  payments: Array<{
    amount: number | string;
    paid_date: string | null;
    status: string;
  }>;
}

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "hsl(var(--primary))",
  },
};

export function RevenueChart({ payments }: RevenueChartProps) {
  // Calculate monthly revenue for the last 6 months
  const getMonthlyData = () => {
    const months: { name: string; revenue: number; month: number; year: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("fr-FR", { month: "short" });
      months.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: 0,
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }

    // Sum payments for each month
    payments
      .filter((p) => p.status === "paid" && p.paid_date)
      .forEach((payment) => {
        const paidDate = new Date(payment.paid_date!);
        const monthData = months.find(
          (m) => m.month === paidDate.getMonth() && m.year === paidDate.getFullYear()
        );
        if (monthData) {
          monthData.revenue += Number(payment.amount);
        }
      });

    return months;
  };

  const data = getMonthlyData();
  const totalRevenue = data.reduce((sum, m) => sum + m.revenue, 0);
  const currentMonth = data[data.length - 1]?.revenue || 0;
  const previousMonth = data[data.length - 2]?.revenue || 0;
  const percentChange =
    previousMonth > 0 ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Revenus mensuels</CardTitle>
          <div className="flex items-center gap-1 text-sm text-emerald">
            <TrendingUp className="h-4 w-4" />
            <span>{percentChange >= 0 ? "+" : ""}{percentChange}%</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {totalRevenue.toLocaleString("fr-FR")} F CFA
        </p>
        <p className="text-xs text-muted-foreground">Total des 6 derniers mois</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} F CFA`, "Revenus"]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
