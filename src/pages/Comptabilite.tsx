import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  ResponsiveContainer, Legend, Tooltip
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle,
  ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, BarChart3
} from "lucide-react";
import { PeriodFilter, PeriodValue, getDefaultPeriod, getPeriodLabel } from "@/components/dashboard/PeriodFilter";
import { useComptabilite } from "@/hooks/useComptabilite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--emerald))",
  "hsl(var(--sand))",
  "hsl(var(--navy-light))",
];

const barChartConfig = {
  loyers: { label: "Loyers", color: "hsl(var(--primary))" },
  ventes: { label: "Ventes Immo.", color: "hsl(var(--emerald))" },
  achats: { label: "Achats Immo.", color: "hsl(var(--sand))" },
  lotissements: { label: "Lotissements", color: "hsl(var(--navy-light))" },
};

const pieChartConfig = {
  loyers: { label: "Loyers", color: "hsl(var(--primary))" },
  ventes: { label: "Ventes Immo.", color: "hsl(var(--emerald))" },
  achats: { label: "Achats Immo.", color: "hsl(var(--sand))" },
  lotissements: { label: "Lotissements", color: "hsl(var(--navy-light))" },
};

function formatCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} F CFA`;
}

const Comptabilite = () => {
  const [period, setPeriod] = useState<PeriodValue>(getDefaultPeriod);
  const periodLabel = getPeriodLabel(period);
  const { data, totalRevenue } = useComptabilite(period.from, period.to);

  const totalPending = data.loyersEnAttente + data.ventesEnAttente + data.achatsEnAttente + data.lotissementsEnAttente;

  const statCards = [
    {
      title: "Total encaissé",
      value: formatCFA(totalRevenue),
      icon: Wallet,
      color: "text-emerald",
      bgColor: "bg-emerald/10",
    },
    {
      title: "En attente",
      value: formatCFA(totalPending),
      icon: Clock,
      color: "text-sand",
      bgColor: "bg-sand/10",
    },
    {
      title: "Impayés (loyers)",
      value: formatCFA(data.loyersImpayes),
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Taux recouvrement",
      value: totalRevenue + totalPending > 0
        ? `${Math.round((totalRevenue / (totalRevenue + totalPending)) * 100)}%`
        : "—",
      icon: totalRevenue >= totalPending ? TrendingUp : TrendingDown,
      color: totalRevenue >= totalPending ? "text-emerald" : "text-destructive",
      bgColor: totalRevenue >= totalPending ? "bg-emerald/10" : "bg-destructive/10",
    },
  ];

  // Breakdown cards
  const breakdownCards = [
    { label: "Loyers", encaisse: data.loyersEncaisses, attente: data.loyersEnAttente, color: "bg-primary" },
    { label: "Ventes Immo.", encaisse: data.ventesEncaissees, attente: data.ventesEnAttente, color: "bg-emerald" },
    { label: "Achats Immo.", encaisse: data.achatsEncaisses, attente: data.achatsEnAttente, color: "bg-sand" },
    { label: "Lotissements", encaisse: data.lotissementsEncaisses, attente: data.lotissementsEnAttente, color: "bg-navy-light" },
  ];

  // Custom pie label
  const renderPieLabel = ({ name, percent }: { name: string; percent: number }) => {
    if (percent < 0.05) return null;
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comptabilité</h1>
            <p className="text-sm text-muted-foreground">{periodLabel.subtitle}</p>
          </div>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-lg font-bold text-foreground">{card.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue breakdown mini-cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {breakdownCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${card.color}`} />
                  <span className="text-sm font-medium text-foreground">{card.label}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Encaissé</span>
                    <span className="font-semibold text-emerald">{formatCFA(card.encaisse)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">En attente</span>
                    <span className="font-semibold text-sand">{formatCFA(card.attente)}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${card.color} rounded-full transition-all`}
                    style={{
                      width: card.encaisse + card.attente > 0
                        ? `${(card.encaisse / (card.encaisse + card.attente)) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts section */}
        <Tabs defaultValue="bar" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Analyse des revenus</h2>
            <TabsList>
              <TabsTrigger value="bar" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Barres
              </TabsTrigger>
              <TabsTrigger value="pie" className="gap-1.5">
                <PieChartIcon className="h-4 w-4" />
                Camembert
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Bar Chart */}
          <TabsContent value="bar">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Revenus mensuels par catégorie
                </CardTitle>
                <p className="text-xs text-muted-foreground">{periodLabel.subtitle}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-[350px] w-full">
                  <BarChart data={data.monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
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
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatCFA(Number(value))]}
                        />
                      }
                    />
                    <Bar dataKey="loyers" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} name="Loyers" />
                    <Bar dataKey="ventes" stackId="a" fill="hsl(var(--emerald))" radius={[0, 0, 0, 0]} name="Ventes Immo." />
                    <Bar dataKey="achats" stackId="a" fill="hsl(var(--sand))" radius={[0, 0, 0, 0]} name="Achats Immo." />
                    <Bar dataKey="lotissements" stackId="a" fill="hsl(var(--navy-light))" radius={[4, 4, 0, 0]} name="Lotissements" />
                  </BarChart>
                </ChartContainer>
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  {Object.entries(barChartConfig).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
                      <span className="text-muted-foreground">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pie Chart */}
          <TabsContent value="pie">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Répartition des revenus
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Total : {formatCFA(totalRevenue)}
                  </p>
                </CardHeader>
                <CardContent>
                  {data.revenueByCategory.length > 0 ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.revenueByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={110}
                            paddingAngle={3}
                            dataKey="value"
                            label={renderPieLabel}
                            labelLine={false}
                          >
                            {data.revenueByCategory.map((entry, index) => (
                              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [formatCFA(value), "Montant"]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      Aucune donnée pour cette période
                    </div>
                  )}
                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                    {data.revenueByCategory.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment methods */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Par mode de paiement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byPaymentMethod.length > 0 ? (
                    <div className="space-y-3 mt-2">
                      {data.byPaymentMethod
                        .sort((a, b) => b.value - a.value)
                        .map((method, i) => {
                          const maxVal = Math.max(...data.byPaymentMethod.map((m) => m.value));
                          const pct = maxVal > 0 ? (method.value / maxVal) * 100 : 0;
                          return (
                            <div key={method.name} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground font-medium capitalize">{method.name}</span>
                                <span className="text-muted-foreground">{formatCFA(method.value)}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: COLORS[i % COLORS.length],
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                      Aucune donnée pour cette période
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Récapitulatif par mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mois</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Loyers</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ventes</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Achats</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Lotissements</th>
                    <th className="text-right py-2 px-3 font-semibold text-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyData.map((row) => (
                    <tr key={row.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-medium text-foreground">{row.name}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{formatCFA(row.loyers)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{formatCFA(row.ventes)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{formatCFA(row.achats)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{formatCFA(row.lotissements)}</td>
                      <td className="py-2 px-3 text-right font-semibold text-foreground">{formatCFA(row.total)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-muted/50 font-semibold">
                    <td className="py-2 px-3 text-foreground">Total</td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {formatCFA(data.monthlyData.reduce((s, r) => s + r.loyers, 0))}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {formatCFA(data.monthlyData.reduce((s, r) => s + r.ventes, 0))}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {formatCFA(data.monthlyData.reduce((s, r) => s + r.achats, 0))}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">
                      {formatCFA(data.monthlyData.reduce((s, r) => s + r.lotissements, 0))}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">{formatCFA(totalRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Comptabilite;
