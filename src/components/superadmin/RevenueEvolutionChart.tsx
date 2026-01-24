import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  transactions: number;
  avgTransaction: number;
}

export function RevenueEvolutionChart() {
  const { data: transactions, isLoading } = useAllTransactions();

  const chartData = useMemo(() => {
    if (!transactions) return [];

    const now = new Date();
    const months: MonthlyData[] = [];

    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
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
  }, [transactions]);

  const stats = useMemo(() => {
    if (chartData.length < 2) return { trend: 0, totalYear: 0, avgMonthly: 0 };

    const lastMonth = chartData[chartData.length - 1]?.revenue || 0;
    const prevMonth = chartData[chartData.length - 2]?.revenue || 0;
    const trend = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;
    const totalYear = chartData.reduce((sum, m) => sum + m.revenue, 0);
    const avgMonthly = Math.round(totalYear / 12);

    return { trend, totalYear, avgMonthly };
  }, [chartData]);

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
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2 capitalize">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-emerald-600">
              Revenus: <span className="font-semibold">{payload[0]?.value?.toLocaleString("fr-FR")} XOF</span>
            </p>
            <p className="text-blue-600">
              Transactions: <span className="font-semibold">{payload[1]?.value || 0}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Évolution des revenus (12 mois)</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                {stats.trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={stats.trend >= 0 ? "text-green-600" : "text-red-600"}>
                  {stats.trend >= 0 ? "+" : ""}{stats.trend.toFixed(1)}% ce mois
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - Transactions per month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Transactions mensuelles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Résumé annuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Revenus totaux (12 mois)</span>
              <span className="text-lg font-bold">
                {stats.totalYear.toLocaleString("fr-FR")} XOF
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
                {chartData.reduce((sum, m) => sum + m.transactions, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Panier moyen</span>
              <span className="text-lg font-bold">
                {chartData.length > 0 
                  ? Math.round(stats.totalYear / Math.max(chartData.reduce((sum, m) => sum + m.transactions, 0), 1)).toLocaleString("fr-FR")
                  : 0} XOF
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
