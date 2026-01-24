import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, Percent } from "lucide-react";
import { PeriodFilter } from "@/hooks/useDashboardPreferences";
import { useOwners } from "@/hooks/useOwners";

interface CommissionEvolutionChartProps {
  payments: Array<{
    amount: number | string;
    paid_date: string | null;
    status: string;
    tenant?: {
      property?: {
        owner_id: string | null;
      } | null;
    } | null;
  }>;
  period: PeriodFilter;
}

const chartConfig = {
  commissions: {
    label: "Commissions",
    color: "hsl(var(--primary))",
  },
};

export function CommissionEvolutionChart({ payments, period }: CommissionEvolutionChartProps) {
  const { data: owners } = useOwners();

  const getMonthlyData = () => {
    const months: { name: string; commissions: number; month: number; year: number }[] = [];
    const now = new Date();
    const periodMonths = period === "month" ? 6 : period === "quarter" ? 6 : 12;

    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("fr-FR", { month: "short" });
      months.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        commissions: 0,
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }

    // Build owner percentage map
    const ownerPercentageMap = new Map<string, number>();
    owners?.forEach((owner) => {
      if (owner.management_type?.percentage) {
        ownerPercentageMap.set(owner.id, Number(owner.management_type.percentage));
      }
    });

    payments.forEach((payment) => {
      if (payment.status !== "paid" || !payment.paid_date) return;

      const paidDate = new Date(payment.paid_date);
      const monthData = months.find(
        (m) => m.month === paidDate.getMonth() && m.year === paidDate.getFullYear()
      );

      if (monthData) {
        const ownerId = payment.tenant?.property?.owner_id;
        const percentage = ownerId ? ownerPercentageMap.get(ownerId) || 0 : 0;
        const commission = (Number(payment.amount) * percentage) / 100;
        monthData.commissions += commission;
      }
    });

    return months;
  };

  const data = getMonthlyData();
  const totalCommissions = data.reduce((sum, m) => sum + m.commissions, 0);
  const currentMonth = data[data.length - 1]?.commissions || 0;
  const previousMonth = data[data.length - 2]?.commissions || 0;
  const percentChange = previousMonth > 0 
    ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Évolution des commissions</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-sm text-emerald">
            <TrendingUp className="h-4 w-4" />
            <span>{percentChange >= 0 ? "+" : ""}{percentChange}%</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground mt-2">
          {totalCommissions.toLocaleString("fr-FR")} F CFA
        </p>
        <p className="text-xs text-muted-foreground">
          Total des commissions sur la période
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {totalCommissions > 0 ? (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} F CFA`]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="commissions"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#commissionGradient)"
                name="Commissions"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Aucune commission enregistrée
          </div>
        )}
      </CardContent>
    </Card>
  );
}
