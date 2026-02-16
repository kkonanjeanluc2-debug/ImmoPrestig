import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useAssignableUsers, useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)", // emerald
  "hsl(262, 83%, 58%)", // violet
  "hsl(24, 95%, 53%)",  // orange
  "hsl(199, 89%, 48%)", // sky
  "hsl(339, 90%, 51%)", // pink
];

interface MonthData {
  month: string;
  [key: string]: number | string;
}

interface ManagerPerformanceChartProps {
  periodFrom?: Date;
  periodTo?: Date;
}

export function ManagerPerformanceChart({ periodFrom, periodTo }: ManagerPerformanceChartProps) {
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();
  const { data: assignableUsers = [], isLoading: usersLoading } = useAssignableUsers();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();

  // Build unique display names for each manager
  const managerDisplayNames = useMemo(() => {
    const nameCount: Record<string, number> = {};
    return assignableUsers.map((user) => {
      const fullName = user.full_name || user.email || "Utilisateur";
      const firstName = fullName.split(" ")[0];
      nameCount[firstName] = (nameCount[firstName] || 0) + 1;
      // If duplicate first names, append last initial
      if (nameCount[firstName] > 1) {
        const parts = fullName.split(" ");
        return parts.length > 1 ? `${firstName} ${parts[1][0]}.` : `${firstName} ${nameCount[firstName]}`;
      }
      return firstName;
    });
  }, [assignableUsers]);

  // Fix duplicates in a second pass
  const uniqueNames = useMemo(() => {
    const firstNames = assignableUsers.map((u) => (u.full_name || u.email || "Utilisateur").split(" ")[0]);
    const counts: Record<string, number> = {};
    firstNames.forEach((n) => (counts[n] = (counts[n] || 0) + 1));

    const seen: Record<string, number> = {};
    return assignableUsers.map((user) => {
      const fullName = user.full_name || user.email || "Utilisateur";
      const firstName = fullName.split(" ")[0];
      if (counts[firstName] > 1) {
        seen[firstName] = (seen[firstName] || 0) + 1;
        const parts = fullName.split(" ");
        return parts.length > 1 ? `${firstName} ${parts[1][0]}.` : `${firstName}${seen[firstName]}`;
      }
      return firstName;
    });
  }, [assignableUsers]);

  const chartData = useMemo(() => {
    if (!assignableUsers.length || !payments.length) return [];

    const from = periodFrom || subMonths(new Date(), 5);
    const to = periodTo || new Date();

    const months: MonthData[] = [];

    let current = startOfMonth(from);
    const end = startOfMonth(to);
    while (current <= end) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      const monthLabel = format(current, "MMM yy", { locale: fr });

      const monthData: MonthData = { month: monthLabel };

      assignableUsers.forEach((user, index) => {
        const userTenants = tenants.filter(
          (t: any) => t.assigned_to === user.user_id
        );
        const tenantIds = new Set(userTenants.map((t: any) => t.id));

        const monthPayments = payments.filter((p: any) => {
          const dueDate = new Date(p.due_date);
          return (
            tenantIds.has(p.tenant_id) &&
            isWithinInterval(dueDate, { start: monthStart, end: monthEnd })
          );
        });

        const paidPayments = monthPayments.filter((p: any) => p.status === "paid");

        const collectionRate =
          monthPayments.length > 0
            ? Math.round((paidPayments.length / monthPayments.length) * 100)
            : 0;

        monthData[uniqueNames[index]] = collectionRate;
      });

      months.push(monthData);
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return months;
  }, [assignableUsers, tenants, payments, periodFrom, periodTo, uniqueNames]);

  const isLoading = usersLoading || tenantsLoading || paymentsLoading;

  // Only show for agency owners with multiple managers
  if (!isAgencyOwner || assignableUsers.length < 2) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return null;
  }

  // Get manager names for legend - use uniqueNames
  const managerNames = uniqueNames;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Évolution des performances
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`${value}%`, "Taux"]}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                iconType="circle"
                iconSize={8}
              />
              {managerNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Taux de recouvrement mensuel par gestionnaire
        </p>
      </CardContent>
    </Card>
  );
}
