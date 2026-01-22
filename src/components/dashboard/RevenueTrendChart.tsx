import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { PeriodFilter } from "@/hooks/useDashboardPreferences";

interface RevenueTrendChartProps {
  payments: Array<{
    amount: number | string;
    paid_date: string | null;
    due_date: string;
    status: string;
  }>;
  period: PeriodFilter;
}

const chartConfig = {
  revenus: {
    label: "Revenus",
    color: "hsl(var(--primary))",
  },
  attendus: {
    label: "Attendus",
    color: "hsl(var(--muted-foreground))",
  },
};

export function RevenueTrendChart({ payments, period }: RevenueTrendChartProps) {
  const getMonthlyData = () => {
    const months: { name: string; revenus: number; attendus: number; month: number; year: number }[] = [];
    const now = new Date();
    
    const periodMonths = period === "month" ? 1 : period === "quarter" ? 3 : 12;

    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("fr-FR", { month: "short" });
      months.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenus: 0,
        attendus: 0,
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }

    payments.forEach((payment) => {
      const dueDate = new Date(payment.due_date);
      const monthData = months.find(
        (m) => m.month === dueDate.getMonth() && m.year === dueDate.getFullYear()
      );
      
      if (monthData) {
        monthData.attendus += Number(payment.amount);
        if (payment.status === "paid" && payment.paid_date) {
          monthData.revenus += Number(payment.amount);
        }
      }
    });

    return months;
  };

  const data = getMonthlyData();
  const totalRevenus = data.reduce((sum, m) => sum + m.revenus, 0);
  const totalAttendus = data.reduce((sum, m) => sum + m.attendus, 0);
  const performance = totalAttendus > 0 ? Math.round((totalRevenus / totalAttendus) * 100) : 0;
  const isPositive = performance >= 80;

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Tendances revenus/dépenses</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Comparaison entre revenus perçus et attendus
            </p>
          </div>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-emerald" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{performance}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
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
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} F CFA`]}
                  />
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="attendus"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Attendus"
              />
              <Line
                type="monotone"
                dataKey="revenus"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
                name="Revenus"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
