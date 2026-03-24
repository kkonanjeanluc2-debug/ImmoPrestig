import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useMemo } from "react";

interface PaymentEvolutionChartProps {
  payments: Array<{
    amount: number | string;
    paid_amount?: number | string | null;
    paid_date: string | null;
    due_date?: string | null;
    status: string;
  }>;
  periodFrom: Date;
  periodTo: Date;
}

export function PaymentEvolutionChart({ payments, periodFrom, periodTo }: PaymentEvolutionChartProps) {
  const data = useMemo(() => {
    const startMonth = new Date(periodFrom.getFullYear(), periodFrom.getMonth(), 1);
    const endMonth = new Date(periodTo.getFullYear(), periodTo.getMonth(), 1);
    const months: { key: string; name: string; aJour: number; enRetard: number; impaye: number }[] = [];

    const cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const monthName = cursor.toLocaleDateString("fr-FR", { month: "short" });
      months.push({
        key: monthKey,
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        aJour: 0,
        enRetard: 0,
        impaye: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    payments.forEach((p) => {
      const dateStr = p.due_date || p.paid_date;
      if (!dateStr) return;
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const month = months.find((m) => m.key === key);
      if (!month) return;

      const amount = Number(p.paid_amount || p.amount) || 0;

      if (p.status === "paid" || p.status === "paye") {
        month.aJour += amount;
      } else if (p.status === "en_retard" || p.status === "late") {
        month.enRetard += amount;
      } else if (p.status === "pending" || p.status === "impaye") {
        const dueDate = p.due_date ? new Date(p.due_date) : null;
        if (dueDate && dueDate < new Date()) {
          month.impaye += amount;
        } else {
          month.enRetard += amount;
        }
      }
    });

    return months;
  }, [payments, periodFrom, periodTo]);

  const formatYAxis = (value: number) => {
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return String(value);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Évolution des Paiements</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString("fr-FR")} F CFA`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="square"
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              <Bar dataKey="aJour" name="À jour" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enRetard" name="En retard" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="impaye" name="Impayé" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
