import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { AgencyWithProfile } from "@/hooks/useSuperAdmin";

interface RegistrationChartProps {
  agencies: AgencyWithProfile[];
}

export function RegistrationChart({ agencies }: RegistrationChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { date: Date; label: string; count: number }[] = [];

    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const count = agencies.filter((agency) => {
        const createdAt = new Date(agency.created_at);
        return isWithinInterval(createdAt, { start, end });
      }).length;

      months.push({
        date: monthDate,
        label: format(monthDate, "MMM yy", { locale: fr }),
        count,
      });
    }

    return months;
  }, [agencies]);

  const totalThisMonth = chartData[chartData.length - 1]?.count || 0;
  const totalLastMonth = chartData[chartData.length - 2]?.count || 0;
  const growth = totalLastMonth > 0 
    ? Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100) 
    : totalThisMonth > 0 ? 100 : 0;

  const chartConfig = {
    count: {
      label: "Inscriptions",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution des inscriptions
            </CardTitle>
            <CardDescription>
              Nouvelles inscriptions sur les 12 derniers mois
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalThisMonth}</p>
            <p className={`text-sm ${growth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {growth >= 0 ? "+" : ""}{growth}% vs mois dernier
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="label" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                allowDecimals={false}
                className="text-muted-foreground"
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Inscriptions"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorRegistrations)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
