import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Award } from "lucide-react";
import { PeriodFilter } from "@/hooks/useDashboardPreferences";

interface PropertyPerformanceChartProps {
  properties: Array<{
    id: string;
    title: string;
    price: number | string;
    status: string;
  }>;
  payments: Array<{
    amount: number | string;
    paid_date: string | null;
    status: string;
    tenant?: {
      property?: {
        id: string;
      } | null;
    } | null;
  }>;
  period: PeriodFilter;
}

const chartConfig = {
  performance: {
    label: "Performance",
    color: "hsl(var(--primary))",
  },
};

export function PropertyPerformanceChart({ properties, payments, period }: PropertyPerformanceChartProps) {
  const getPerformanceData = () => {
    const now = new Date();
    const periodMonths = period === "month" ? 1 : period === "quarter" ? 3 : 12;
    const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);

    const propertyData = properties
      .filter((p) => p.status === "occupé")
      .map((property) => {
        const propertyPayments = payments.filter(
          (pay) => pay.tenant?.property?.id === property.id
        );

        const periodPayments = propertyPayments.filter((pay) => {
          if (!pay.paid_date) return false;
          const paidDate = new Date(pay.paid_date);
          return paidDate >= startDate && pay.status === "paid";
        });

        const expectedRevenue = Number(property.price) * periodMonths;
        const actualRevenue = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const performance = expectedRevenue > 0 ? Math.round((actualRevenue / expectedRevenue) * 100) : 0;

        return {
          name: property.title.length > 15 ? property.title.substring(0, 15) + "..." : property.title,
          fullName: property.title,
          performance,
          actual: actualRevenue,
          expected: expectedRevenue,
        };
      })
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 6);

    return propertyData;
  };

  const data = getPerformanceData();
  const avgPerformance = data.length > 0 
    ? Math.round(data.reduce((sum, d) => sum + d.performance, 0) / data.length) 
    : 0;

  const getBarColor = (performance: number) => {
    if (performance >= 90) return "hsl(142 76% 36%)"; // emerald
    if (performance >= 70) return "hsl(var(--primary))";
    if (performance >= 50) return "hsl(45 93% 47%)"; // warning
    return "hsl(var(--destructive))";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Performance par bien</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Taux de recouvrement par propriété
            </p>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">{avgPerformance}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground">
            <p>Aucun bien occupé</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={90}
                />
                <ReferenceLine x={avgPerformance} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, props) => [
                        `${props.payload.actual.toLocaleString("fr-FR")} / ${props.payload.expected.toLocaleString("fr-FR")} F CFA (${value}%)`,
                        props.payload.fullName,
                      ]}
                    />
                  }
                />
                <Bar dataKey="performance" radius={[0, 4, 4, 0]} barSize={18}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.performance)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
