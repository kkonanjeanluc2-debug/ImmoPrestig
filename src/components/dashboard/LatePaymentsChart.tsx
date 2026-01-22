import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle } from "lucide-react";
import { PeriodFilter } from "@/hooks/useDashboardPreferences";

interface LatePaymentsChartProps {
  payments: Array<{
    amount: number | string;
    due_date: string;
    paid_date: string | null;
    status: string;
  }>;
  period: PeriodFilter;
}

const chartConfig = {
  count: {
    label: "Retards",
    color: "hsl(var(--destructive))",
  },
};

export function LatePaymentsChart({ payments, period }: LatePaymentsChartProps) {
  const getLatePaymentsData = () => {
    const now = new Date();
    const periodMonths = period === "month" ? 1 : period === "quarter" ? 3 : 12;
    
    const categories = [
      { name: "1-7 jours", min: 1, max: 7, count: 0, amount: 0 },
      { name: "8-14 jours", min: 8, max: 14, count: 0, amount: 0 },
      { name: "15-30 jours", min: 15, max: 30, count: 0, amount: 0 },
      { name: ">30 jours", min: 31, max: Infinity, count: 0, amount: 0 },
    ];

    const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths + 1, 1);

    payments
      .filter((p) => {
        const dueDate = new Date(p.due_date);
        return (p.status === "late" || (p.status === "pending" && dueDate < now)) && 
               dueDate >= startDate;
      })
      .forEach((payment) => {
        const dueDate = new Date(payment.due_date);
        const referenceDate = payment.paid_date ? new Date(payment.paid_date) : now;
        const daysLate = Math.floor((referenceDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLate > 0) {
          const category = categories.find((c) => daysLate >= c.min && daysLate <= c.max);
          if (category) {
            category.count++;
            category.amount += Number(payment.amount);
          }
        }
      });

    return categories;
  };

  const data = getLatePaymentsData();
  const totalLate = data.reduce((sum, d) => sum + d.count, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);

  const getBarColor = (index: number) => {
    const colors = [
      "hsl(45 93% 47%)", // warning yellow
      "hsl(30 90% 50%)", // orange
      "hsl(15 85% 50%)", // red-orange
      "hsl(var(--destructive))", // red
    ];
    return colors[index] || colors[3];
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Analyse des retards</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Distribution par durée de retard
            </p>
          </div>
          <div className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{totalLate}</span>
          </div>
        </div>
        {totalLate > 0 && (
          <p className="text-sm text-muted-foreground">
            {totalAmount.toLocaleString("fr-FR")} F CFA en retard
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {totalLate === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-emerald" />
              <p>Aucun retard de paiement</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={80}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, props) => [
                        `${props.payload.count} paiement(s) - ${props.payload.amount.toLocaleString("fr-FR")} F CFA`,
                        "Retards",
                      ]}
                    />
                  }
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
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
