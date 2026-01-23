import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { PieChart, CheckCircle, Clock, XCircle, Calendar } from "lucide-react";

interface TenantPaymentStatusChartProps {
  payments: Array<{
    amount: number | string;
    status: string;
    due_date: string;
  }>;
}

const statusConfig = {
  paid: { label: "Payé", color: "hsl(var(--emerald))" },
  pending: { label: "En attente", color: "hsl(var(--warning))" },
  late: { label: "En retard", color: "hsl(var(--destructive))" },
  upcoming: { label: "À venir", color: "hsl(var(--primary))" },
};

const chartConfig = {
  paid: { label: "Payé", color: "hsl(var(--emerald))" },
  pending: { label: "En attente", color: "hsl(142 76% 36%)" },
  late: { label: "En retard", color: "hsl(var(--destructive))" },
  upcoming: { label: "À venir", color: "hsl(var(--primary))" },
};

export function TenantPaymentStatusChart({ payments }: TenantPaymentStatusChartProps) {
  // Count payments by status
  const statusCounts = payments.reduce((acc, payment) => {
    const status = payment.status as keyof typeof statusConfig;
    if (status in statusConfig) {
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusConfig).map(([key, config]) => ({
    name: config.label,
    value: statusCounts[key] || 0,
    status: key,
    color: config.color,
  })).filter(d => d.value > 0);

  const totalPayments = payments.length;
  const paidCount = statusCounts.paid || 0;
  const lateCount = statusCounts.late || 0;
  const pendingCount = statusCounts.pending || 0;

  const paymentRate = totalPayments > 0 ? Math.round((paidCount / totalPayments) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Répartition des paiements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalPayments > 0 ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald" />
                  <span className="text-xs text-muted-foreground">Payés</span>
                </div>
                <p className="text-xl font-bold text-emerald">{paidCount}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">En retard</span>
                </div>
                <p className="text-xl font-bold text-destructive">{lateCount}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">En attente</span>
                </div>
                <p className="text-xl font-bold text-amber-500">{pendingCount}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Taux paiement</span>
                </div>
                <p className="text-xl font-bold text-primary">{paymentRate}%</p>
              </div>
            </div>

            {/* Bar Chart */}
            {data.length > 0 && (
              <ChartContainer config={chartConfig} className="h-[120px] w-full">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    width={80}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`${value} paiement(s)`, ""]}
                      />
                    }
                  />
                  <Bar dataKey="value" radius={4}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <PieChart className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Aucun paiement enregistré</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
