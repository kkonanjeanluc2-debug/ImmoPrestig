import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAllTransactions } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type PeriodFilter = 3 | 6 | 12;

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  transactions: number;
  avgTransaction: number;
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 3, label: "3 mois" },
  { value: 6, label: "6 mois" },
  { value: 12, label: "1 an" },
];

export function RevenueEvolutionChart() {
  const { data: transactions, isLoading } = useAllTransactions();
  const [period, setPeriod] = useState<PeriodFilter>(12);

  const chartData = useMemo(() => {
    if (!transactions) return [];

    const now = new Date();
    const months: MonthlyData[] = [];

    // Generate months based on selected period
    for (let i = period - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthTransactions = transactions.filter(tx => {
        if (tx.status !== "completed") return false;
        const txDate = new Date(tx.created_at);
        return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      });

      const revenue = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const count = monthTransactions.length;

      months.push({
        month: format(monthDate, "yyyy-MM"),
        monthLabel: format(monthDate, "MMM yy", { locale: fr }),
        revenue,
        transactions: count,
        avgTransaction: count > 0 ? Math.round(revenue / count) : 0,
      });
    }

    return months;
  }, [transactions, period]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return { trend: 0, totalPeriod: 0, avgMonthly: 0, totalTransactions: 0 };

    const lastMonth = chartData[chartData.length - 1]?.revenue || 0;
    const prevMonth = chartData[chartData.length - 2]?.revenue || 0;
    const trend = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;
    const totalPeriod = chartData.reduce((sum, m) => sum + m.revenue, 0);
    const totalTransactions = chartData.reduce((sum, m) => sum + m.transactions, 0);
    const avgMonthly = Math.round(totalPeriod / period);

    return { trend, totalPeriod, avgMonthly, totalTransactions };
  }, [chartData, period]);

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 z-50">
          <p className="font-medium text-sm mb-2 capitalize">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-emerald-600">
              Revenus: <span className="font-semibold">{payload[0]?.value?.toLocaleString("fr-FR")} XOF</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || "1 an";

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Area Chart - Revenue Evolution */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Évolution des revenus</CardTitle>
            <div className="flex items-center gap-2">
              {/* Period Filter Buttons */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                {PERIOD_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setPeriod(option.value)}
                    className={cn(
                      "h-7 px-3 text-xs font-medium transition-all",
                      period === option.value
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {/* Trend indicator */}
              <div className="flex items-center gap-1 text-sm ml-2">
                {stats.trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={stats.trend >= 0 ? "text-green-600" : "text-red-600"}>
                  {stats.trend >= 0 ? "+" : ""}{stats.trend.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <AreaChart 
              data={chartData} 
              width={800} 
              height={300}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--emerald))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--emerald))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={formatPrice}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--emerald))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Revenus"
              />
            </AreaChart>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - Transactions per month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Transactions ({periodLabel})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <BarChart 
              data={chartData} 
              width={400}
              height={250}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              style={{ width: '100%', height: '100%' }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="monthLabel" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [value, "Transactions"]}
              />
              <Bar 
                dataKey="transactions" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Transactions"
              />
            </BarChart>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Résumé ({periodLabel})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Revenus totaux</span>
              <span className="text-lg font-bold">
                {stats.totalPeriod.toLocaleString("fr-FR")} XOF
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Moyenne mensuelle</span>
              <span className="text-lg font-bold">
                {stats.avgMonthly.toLocaleString("fr-FR")} XOF
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Total transactions</span>
              <span className="text-lg font-bold">
                {stats.totalTransactions}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Panier moyen</span>
              <span className="text-lg font-bold">
                {stats.totalTransactions > 0 
                  ? Math.round(stats.totalPeriod / stats.totalTransactions).toLocaleString("fr-FR")
                  : 0} XOF
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
