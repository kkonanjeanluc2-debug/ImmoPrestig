import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, Trophy, Medal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { VenteWithDetails } from "@/hooks/useVentesParcelles";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useEcheancesForLotissement } from "@/hooks/useEcheancesParcelles";

interface SalesPerformanceChartProps {
  ventes: VenteWithDetails[];
  lotissementId?: string;
}

interface SalesStats {
  userId: string;
  name: string;
  email: string | null;
  salesCount: number;
  totalRevenue: number;
  role: string;
}

export function SalesPerformanceChart({ ventes, lotissementId }: SalesPerformanceChartProps) {
  const { data: assignableUsers } = useAssignableUsers();
  const { data: echeances } = useEcheancesForLotissement(lotissementId);

  const salesByUser = useMemo(() => {
    const statsMap: Record<string, SalesStats> = {};

    ventes.forEach((vente) => {
      const soldBy = (vente as any).sold_by;
      if (soldBy) {
        if (!statsMap[soldBy]) {
          const user = assignableUsers?.find(u => u.user_id === soldBy);
          statsMap[soldBy] = {
            userId: soldBy,
            name: user?.full_name || user?.email || "Inconnu",
            email: user?.email || null,
            role: user?.role || "",
            salesCount: 0,
            totalRevenue: 0,
          };
        }
        statsMap[soldBy].salesCount += 1;
        
        // Calculate actual paid amount (down payment + paid installments)
        let totalPaid = vente.down_payment || 0;
        const venteEcheances = echeances?.filter(e => e.vente_id === vente.id) || [];
        venteEcheances.forEach(echeance => {
          if (echeance.status === "paid") {
            totalPaid += echeance.paid_amount || echeance.amount;
          }
        });
        
        statsMap[soldBy].totalRevenue += totalPaid;
      }
    });

    return Object.values(statsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [ventes, assignableUsers, echeances]);

  const chartData = salesByUser.slice(0, 10).map(user => ({
    name: user.name.split(" ")[0],
    fullName: user.name,
    revenue: user.totalRevenue,
    sales: user.salesCount,
  }));

  const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316"];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  if (salesByUser.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance des commerciaux
          </CardTitle>
          <CardDescription>
            Classement des meilleurs vendeurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune vente enregistrée avec un commercial assigné</p>
            <p className="text-sm mt-2">Affectez des lots aux commerciaux pour suivre leurs performances</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance des commerciaux
        </CardTitle>
        <CardDescription>
          Classement basé sur les montants réellement encaissés
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => `${value.toLocaleString("fr-FR")} F CFA`}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.name === label);
                    return item?.fullName || label;
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-3">
          {salesByUser.slice(0, 5).map((user, index) => (
            <div
              key={user.userId}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="w-8 flex justify-center">
                {getRankIcon(index)}
              </div>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.role}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">
                  {user.totalRevenue.toLocaleString("fr-FR")} F
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.salesCount} vente{user.salesCount > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
