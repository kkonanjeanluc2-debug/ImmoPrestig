import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { ComptabiliteData, MonthlyEntry } from "@/hooks/useComptabilite";

interface Props {
  data: ComptabiliteData;
  totalRevenue: number;
  totalReversements?: number;
}

function formatCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} F CFA`;
}

const chartConfig = {
  entrees: { label: "Entrées", color: "hsl(var(--emerald))" },
  sorties: { label: "Sorties", color: "hsl(var(--destructive))" },
  solde: { label: "Solde cumulé", color: "hsl(var(--primary))" },
};

export function TresorerieTab({ data, totalRevenue, totalReversements = 0 }: Props) {
  // Build cumulative cash flow data
  let cumul = 0;
  const cashFlowData = data.monthlyData.map((m) => {
    const entrees = m.loyers + m.ventes + m.achats + m.lotissements;
    const sorties = m.depenses;
    cumul += entrees - sorties;
    return {
      name: m.name,
      entrees,
      sorties,
      flux: entrees - sorties,
      solde: cumul,
    };
  });

  const totalEntrees = totalRevenue;
  const totalSorties = data.totalExpenses + totalReversements;
  const soldeNet = totalEntrees - totalSorties;
  const totalPending = data.loyersEnAttente + data.ventesEnAttente + data.achatsEnAttente + data.lotissementsEnAttente;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total entrées</p>
                <p className="text-lg font-bold text-foreground">{formatCFA(totalEntrees)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald/10">
                <ArrowUpRight className="h-5 w-5 text-emerald" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total sorties</p>
                <p className="text-lg font-bold text-foreground">{formatCFA(totalSorties)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Solde de trésorerie</p>
                <p className={`text-lg font-bold ${soldeNet >= 0 ? "text-emerald" : "text-destructive"}`}>
                  {formatCFA(soldeNet)}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${soldeNet >= 0 ? "bg-emerald/10" : "bg-destructive/10"}`}>
                <Wallet className={`h-5 w-5 ${soldeNet >= 0 ? "text-emerald" : "text-destructive"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Créances à recouvrer</p>
                <p className="text-lg font-bold text-sand">{formatCFA(totalPending)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-sand/10">
                <TrendingUp className="h-5 w-5 text-sand" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash flow chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Flux de trésorerie</CardTitle>
          <p className="text-xs text-muted-foreground">Évolution mensuelle des entrées, sorties et solde cumulé</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <AreaChart data={cashFlowData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(value) => [formatCFA(Number(value))]} />}
              />
              <Area
                type="monotone"
                dataKey="entrees"
                stackId="1"
                stroke="hsl(var(--emerald))"
                fill="hsl(var(--emerald))"
                fillOpacity={0.2}
                name="Entrées"
              />
              <Area
                type="monotone"
                dataKey="sorties"
                stackId="2"
                stroke="hsl(var(--destructive))"
                fill="hsl(var(--destructive))"
                fillOpacity={0.15}
                name="Sorties"
              />
              <Area
                type="monotone"
                dataKey="solde"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
                strokeWidth={2}
                name="Solde cumulé"
              />
            </AreaChart>
          </ChartContainer>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-sm bg-emerald" />
              <span className="text-muted-foreground">Entrées</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-sm bg-destructive" />
              <span className="text-muted-foreground">Sorties</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-sm bg-primary" />
              <span className="text-muted-foreground">Solde cumulé</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly breakdown table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Tableau des flux de trésorerie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mois</th>
                  <th className="text-right py-2 px-3 font-medium text-emerald">Entrées</th>
                  <th className="text-right py-2 px-3 font-medium text-destructive">Sorties</th>
                  <th className="text-right py-2 px-3 font-medium text-foreground">Flux net</th>
                  <th className="text-right py-2 px-3 font-semibold text-primary">Solde cumulé</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowData.map((row) => (
                  <tr key={row.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 font-medium text-foreground">{row.name}</td>
                    <td className="py-2 px-3 text-right text-emerald">{formatCFA(row.entrees)}</td>
                    <td className="py-2 px-3 text-right text-destructive">
                      {row.sorties > 0 ? `-${formatCFA(row.sorties)}` : formatCFA(0)}
                    </td>
                    <td className={`py-2 px-3 text-right font-medium ${row.flux >= 0 ? "text-foreground" : "text-destructive"}`}>
                      {formatCFA(row.flux)}
                    </td>
                    <td className={`py-2 px-3 text-right font-semibold ${row.solde >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatCFA(row.solde)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-semibold">
                  <td className="py-2 px-3 text-foreground">Total</td>
                  <td className="py-2 px-3 text-right text-emerald">{formatCFA(totalEntrees)}</td>
                  <td className="py-2 px-3 text-right text-destructive">
                    {totalSorties > 0 ? `-${formatCFA(totalSorties)}` : formatCFA(0)}
                  </td>
                  <td className={`py-2 px-3 text-right ${soldeNet >= 0 ? "text-foreground" : "text-destructive"}`}>
                    {formatCFA(soldeNet)}
                  </td>
                  <td className={`py-2 px-3 text-right ${soldeNet >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatCFA(soldeNet)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
