import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface OwnerRevenueChartProps {
  payments: Array<{
    amount: number | string;
    paid_date: string | null;
    status: string;
    tenant_id: string;
  }>;
  tenantIds: string[];
}

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "hsl(var(--primary))",
  },
};

export function OwnerRevenueChart({ payments, tenantIds }: OwnerRevenueChartProps) {
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

    // Filter payments for owner's tenants and sum for each month
    payments
      .filter((p) => p.status === "paid" && p.paid_date && tenantIds.includes(p.tenant_id))
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
  const isPositive = percentChange >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution des revenus
          </CardTitle>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-emerald" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{isPositive ? "+" : ""}{percentChange}%</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {totalRevenue.toLocaleString("fr-FR")} F CFA
        </p>
        <p className="text-xs text-muted-foreground">Total des 6 derniers mois</p>
      </CardHeader>
      <CardContent className="pt-0">
        {totalRevenue > 0 ? (
          <>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ownerRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
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
                  fill="url(#ownerRevenueGradient)"
                />
              </AreaChart>
            </ChartContainer>
            
            {/* Monthly breakdown legend */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {data.slice(-3).map((month) => (
                <div key={month.name} className="text-center p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">{month.name}</p>
                  <p className="text-sm font-semibold">{month.revenue.toLocaleString("fr-FR")} F</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Aucun revenu enregistré</p>
            <p className="text-xs">Les paiements apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
