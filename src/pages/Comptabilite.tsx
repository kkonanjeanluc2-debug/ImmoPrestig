import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle,
  BarChart3, Receipt, ArrowUpRight,
  ArrowDownRight, Plus, DollarSign, Minus, BookOpen, Landmark,
} from "lucide-react";
import { PeriodFilter, PeriodValue, getDefaultPeriod, getPeriodLabel } from "@/components/dashboard/PeriodFilter";
import { useComptabilite } from "@/hooks/useComptabilite";
import { useExpenses } from "@/hooks/useExpenses";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExpensesTable } from "@/components/comptabilite/ExpensesTable";
import { AddExpenseDialog } from "@/components/comptabilite/AddExpenseDialog";
import { SyscohadaCompteResultat } from "@/components/comptabilite/SyscohadaCompteResultat";
import { TresorerieTab } from "@/components/comptabilite/TresorerieTab";
import { ExportComptabilite } from "@/components/comptabilite/ExportComptabilite";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenses";
import { useAgency } from "@/hooks/useAgency";

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
  depenses: { label: "Dépenses", color: "hsl(var(--destructive))" },
};

const profitChartConfig = {
  total: { label: "Revenus", color: "hsl(var(--emerald))" },
  depenses: { label: "Dépenses", color: "hsl(var(--destructive))" },
  benefice: { label: "Bénéfice", color: "hsl(var(--primary))" },
};

function formatCFA(amount: number) {
  return `${amount.toLocaleString("fr-FR")} F CFA`;
}

function getCategoryLabel(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value;
}

const Comptabilite = () => {
  const [period, setPeriod] = useState<PeriodValue>(getDefaultPeriod);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const periodLabel = getPeriodLabel(period);
  const { data, totalRevenue } = useComptabilite(period.from, period.to);
  const { data: expenses, isLoading: expensesLoading } = useExpenses(period.from, period.to);
  const { data: agency } = useAgency();

  const totalPending = data.loyersEnAttente + data.ventesEnAttente + data.achatsEnAttente + data.lotissementsEnAttente;
  const beneficeNet = totalRevenue - data.totalExpenses;
  const margePercent = totalRevenue > 0 ? Math.round((beneficeNet / totalRevenue) * 100) : 0;

  const renderPieLabel = ({ name, percent }: { name: string; percent: number }) => {
    if (percent < 0.05) return null;
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  const statCards = [
    {
      title: "Revenus encaissés",
      value: formatCFA(totalRevenue),
      icon: ArrowUpRight,
      color: "text-emerald",
      bgColor: "bg-emerald/10",
    },
    {
      title: "Total dépenses",
      value: formatCFA(data.totalExpenses),
      icon: ArrowDownRight,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Bénéfice net",
      value: formatCFA(beneficeNet),
      icon: beneficeNet >= 0 ? TrendingUp : TrendingDown,
      color: beneficeNet >= 0 ? "text-emerald" : "text-destructive",
      bgColor: beneficeNet >= 0 ? "bg-emerald/10" : "bg-destructive/10",
    },
    {
      title: "Marge bénéficiaire",
      value: totalRevenue > 0 ? `${margePercent}%` : "—",
      icon: DollarSign,
      color: margePercent >= 50 ? "text-emerald" : margePercent >= 20 ? "text-sand" : "text-destructive",
      bgColor: margePercent >= 50 ? "bg-emerald/10" : margePercent >= 20 ? "bg-sand/10" : "bg-destructive/10",
    },
  ];

  const secondaryCards = [
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

  const breakdownCards = [
    { label: "Loyers", encaisse: data.loyersEncaisses, attente: data.loyersEnAttente, color: "bg-primary" },
    { label: "Ventes Immo.", encaisse: data.ventesEncaissees, attente: data.ventesEnAttente, color: "bg-emerald" },
    { label: "Achats Immo.", encaisse: data.achatsEncaisses, attente: data.achatsEnAttente, color: "bg-sand" },
    { label: "Lotissements", encaisse: data.lotissementsEncaisses, attente: data.lotissementsEnAttente, color: "bg-navy-light" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Comptabilité</h1>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setAddExpenseOpen(true)} variant="outline" className="gap-1 text-xs h-8 px-2 sm:px-3">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dépense</span>
                <span className="sm:hidden">Dép.</span>
              </Button>
              <ExportComptabilite
                data={data}
                totalRevenue={totalRevenue}
                expenses={expenses || []}
                periodLabel={periodLabel.subtitle}
                agency={agency}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {periodLabel.subtitle} — Conforme SYSCOHADA
          </p>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        {/* Main tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="w-full grid grid-cols-5 h-auto p-0.5 sm:p-1">
            <TabsTrigger value="overview" className="gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Vue d'ensemble</span>
              <span className="sm:hidden">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger value="revenus" className="gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5">
              <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Revenus</span>
              <span className="sm:hidden">Rev.</span>
            </TabsTrigger>
            <TabsTrigger value="depenses" className="gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Dépenses</span>
              <span className="sm:hidden">Dép.</span>
            </TabsTrigger>
            <TabsTrigger value="tresorerie" className="gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5">
              <Landmark className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Trésorerie</span>
              <span className="sm:hidden">Trés.</span>
            </TabsTrigger>
            <TabsTrigger value="syscohada" className="gap-1 text-[10px] sm:text-sm px-1 sm:px-3 py-1.5">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">SYSCOHADA</span>
              <span className="sm:hidden">SYS.</span>
            </TabsTrigger>
          </TabsList>

          {/* === OVERVIEW TAB === */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards - Primary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {statCards.map((card) => (
                <Card key={card.title} className="relative overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-1">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">{card.title}</p>
                        <p className="text-sm sm:text-lg font-bold text-foreground truncate">{card.value}</p>
                      </div>
                      <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${card.bgColor} shrink-0`}>
                        <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {secondaryCards.map((card) => (
                <Card key={card.title}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">{card.title}</p>
                        <p className="text-sm sm:text-lg font-bold text-foreground truncate">{card.value}</p>
                      </div>
                      <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl ${card.bgColor} shrink-0 self-end sm:self-auto`}>
                        <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Profit/Loss Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Revenus vs Dépenses vs Bénéfice
                </CardTitle>
                <p className="text-xs text-muted-foreground">{periodLabel.subtitle}</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={profitChartConfig} className="h-[300px] w-full">
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
                    <Bar dataKey="total" fill="hsl(var(--emerald))" radius={[4, 4, 0, 0]} name="Revenus" />
                    <Bar dataKey="depenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Dépenses" />
                    <Bar dataKey="benefice" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Bénéfice" />
                  </BarChart>
                </ChartContainer>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-sm bg-emerald" />
                    <span className="text-muted-foreground">Revenus</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-sm bg-destructive" />
                    <span className="text-muted-foreground">Dépenses</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-sm bg-primary" />
                    <span className="text-muted-foreground">Bénéfice</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Compte de résultat simplifié</CardTitle>
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
                        <th className="text-right py-2 px-3 font-medium text-emerald">Total revenus</th>
                        <th className="text-right py-2 px-3 font-medium text-destructive">Dépenses</th>
                        <th className="text-right py-2 px-3 font-semibold text-foreground">Bénéfice</th>
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
                          <td className="py-2 px-3 text-right font-medium text-emerald">{formatCFA(row.total)}</td>
                          <td className="py-2 px-3 text-right font-medium text-destructive">
                            {row.depenses > 0 ? `-${formatCFA(row.depenses)}` : formatCFA(0)}
                          </td>
                          <td className={`py-2 px-3 text-right font-semibold ${row.benefice >= 0 ? "text-foreground" : "text-destructive"}`}>
                            {formatCFA(row.benefice)}
                          </td>
                        </tr>
                      ))}
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
                        <td className="py-2 px-3 text-right text-emerald">{formatCFA(totalRevenue)}</td>
                        <td className="py-2 px-3 text-right text-destructive">
                          {data.totalExpenses > 0 ? `-${formatCFA(data.totalExpenses)}` : formatCFA(0)}
                        </td>
                        <td className={`py-2 px-3 text-right ${beneficeNet >= 0 ? "text-foreground" : "text-destructive"}`}>
                          {formatCFA(beneficeNet)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === REVENUS TAB === */}
          <TabsContent value="revenus" className="space-y-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Revenus mensuels par catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                    <BarChart data={data.monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => [formatCFA(Number(value))]} />} />
                      <Bar dataKey="loyers" stackId="a" fill="hsl(var(--primary))" name="Loyers" />
                      <Bar dataKey="ventes" stackId="a" fill="hsl(var(--emerald))" name="Ventes Immo." />
                      <Bar dataKey="achats" stackId="a" fill="hsl(var(--sand))" name="Achats Immo." />
                      <Bar dataKey="lotissements" stackId="a" fill="hsl(var(--navy-light))" radius={[4, 4, 0, 0]} name="Lotissements" />
                    </BarChart>
                  </ChartContainer>
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                    {Object.entries(barChartConfig).filter(([k]) => k !== "depenses").map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
                        <span className="text-muted-foreground">{cfg.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Répartition des revenus</CardTitle>
                  <p className="text-xs text-muted-foreground">Total : {formatCFA(totalRevenue)}</p>
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
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Par mode de paiement</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byPaymentMethod.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Aucune donnée pour cette période
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === DEPENSES TAB === */}
          <TabsContent value="depenses" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Total dépenses</p>
                      <p className="text-lg font-bold text-foreground">{formatCFA(data.totalExpenses)}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-destructive/10">
                      <Minus className="h-5 w-5 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Nb transactions</p>
                      <p className="text-lg font-bold text-foreground">{expenses?.length || 0}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Dépense moyenne</p>
                      <p className="text-lg font-bold text-foreground">
                        {expenses && expenses.length > 0
                          ? formatCFA(Math.round(data.totalExpenses / expenses.length))
                          : "—"}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sand/10">
                      <Wallet className="h-5 w-5 text-sand" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.expensesByCategory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Dépenses par catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.expensesByCategory.map((e) => ({
                              ...e,
                              name: getCategoryLabel(e.name),
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {data.expensesByCategory.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
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
                    <div className="space-y-2">
                      {data.expensesByCategory.map((cat) => {
                        const pct = data.totalExpenses > 0 ? (cat.value / data.totalExpenses) * 100 : 0;
                        return (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-foreground">{getCategoryLabel(cat.name)}</span>
                              </div>
                              <span className="text-muted-foreground">{formatCFA(cat.value)} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: cat.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <ExpensesTable expenses={expenses || []} isLoading={expensesLoading} />
          </TabsContent>

          {/* === TRESORERIE TAB === */}
          <TabsContent value="tresorerie">
            <TresorerieTab data={data} totalRevenue={totalRevenue} />
          </TabsContent>

          {/* === SYSCOHADA TAB === */}
          <TabsContent value="syscohada" className="space-y-6">
            <SyscohadaCompteResultat data={data} totalRevenue={totalRevenue} />
          </TabsContent>
        </Tabs>
      </div>

      <AddExpenseDialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen} />
    </DashboardLayout>
  );
};

export default Comptabilite;
