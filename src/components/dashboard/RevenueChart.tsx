import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface RevenueChartProps {
  payments: Array<{
    amount: number | string;
    paid_amount?: number | string | null;
    paid_date: string | null;
    due_date?: string | null;
    status: string;
    payment_months?: string[] | null;
  }>;
  periodLabel?: { title: string; subtitle: string };
  periodFrom?: Date;
  periodTo?: Date;
}

const FRENCH_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

const parseMonthYM = (m: string): string | null => {
  const parts = m.split(' ');
  if (parts.length === 2) {
    const idx = FRENCH_MONTHS.indexOf(parts[0]);
    if (idx >= 0) return `${parts[1]}-${String(idx + 1).padStart(2, '0')}`;
  }
  if (m.length >= 7) return m.substring(0, 7);
  return null;
};

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "hsl(var(--primary))",
  },
};

export function RevenueChart({ payments, periodLabel, periodFrom, periodTo }: RevenueChartProps) {
  const getMonthlyData = () => {
    const months: { name: string; revenue: number; month: number; year: number }[] = [];
    const now = new Date();
    const from = periodFrom || new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const to = periodTo || now;

    const startMonth = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
    const cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      const monthName = cursor.toLocaleDateString("fr-FR", { month: "short" });
      months.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        revenue: 0,
        month: cursor.getMonth(),
        year: cursor.getFullYear(),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const addToMonth = (monthIdx: number, yearVal: number, amount: number) => {
      const bucket = months.find(m => m.month === monthIdx && m.year === yearVal);
      if (bucket) bucket.revenue += amount;
    };

    payments.forEach((p: any) => {
      const status = p.status;
      const paidDate = p.paid_date;
      const paymentMonths = p.payment_months as string[] | null;
      const isMultiMonth = paymentMonths && Array.isArray(paymentMonths) && paymentMonths.length > 1;
      const totalAmount = Number(p.paid_amount) || Number(p.amount);

      if (status === 'paid') {
        if (isMultiMonth) {
          const perMonth = Math.round(totalAmount / paymentMonths.length);
          paymentMonths.forEach(m => {
            const ym = parseMonthYM(m);
            if (ym) {
              const [y, mo] = ym.split('-').map(Number);
              addToMonth(mo - 1, y, perMonth);
            }
          });
        } else if (paymentMonths && paymentMonths.length === 1) {
          const ym = parseMonthYM(paymentMonths[0]);
          if (ym) {
            const [y, mo] = ym.split('-').map(Number);
            addToMonth(mo - 1, y, totalAmount);
          } else if (paidDate) {
            const d = new Date(paidDate);
            addToMonth(d.getMonth(), d.getFullYear(), totalAmount);
          }
        } else if (paidDate) {
          const d = new Date(paidDate);
          addToMonth(d.getMonth(), d.getFullYear(), totalAmount);
        }
      } else if ((status === 'pending' || status === 'late') && Number(p.paid_amount) > 0) {
        const paidPortion = Number(p.paid_amount);
        const refDate = paidDate || p.due_date;
        if (refDate) {
          const d = new Date(refDate);
          addToMonth(d.getMonth(), d.getFullYear(), paidPortion);
        }
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
          <CardTitle className="text-base font-semibold">{periodLabel?.title || "Revenus mensuels"}</CardTitle>
          <div className="flex items-center gap-1 text-sm text-emerald">
            <TrendingUp className="h-4 w-4" />
            <span>{percentChange >= 0 ? "+" : ""}{percentChange}%</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {totalRevenue.toLocaleString("fr-FR")} F CFA
        </p>
        <p className="text-xs text-muted-foreground">{periodLabel?.subtitle || "Total des 6 derniers mois"}</p>
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
