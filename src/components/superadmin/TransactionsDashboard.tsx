import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllTransactions, useTransactionStats } from "@/hooks/useTransactions";
import { MonthlyReportPDF } from "./MonthlyReportPDF";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown,
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Wallet,
  Search,
  ArrowDownRight,
  DollarSign,
  BarChart3,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

const paymentMethodLabels: Record<string, { label: string; color: string }> = {
  orange_money: { label: "Orange Money", color: "bg-orange-500" },
  mtn_money: { label: "MTN Money", color: "bg-yellow-500" },
  wave: { label: "Wave", color: "bg-blue-500" },
  moov: { label: "Moov Money", color: "bg-blue-600" },
  card: { label: "Carte", color: "bg-gray-600" },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  completed: { label: "Payé", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { label: "En attente", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  failed: { label: "Échoué", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  refunded: { label: "Remboursé", variant: "outline", icon: <ArrowDownRight className="h-3 w-3" /> },
};

export function TransactionsDashboard() {
  const { data: transactions, isLoading } = useAllTransactions();
  const stats = useTransactionStats();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const formatPrice = (amount: number, currency: string = "XOF") => {
    return new Intl.NumberFormat("fr-CI", {
      style: "decimal",
      minimumFractionDigits: 0,
    }).format(amount) + " " + currency;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy à HH:mm", { locale: fr });
  };

  const filteredTransactions = (transactions || []).filter((tx) => {
    const matchesSearch = 
      tx.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.agency?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.fedapay_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesMethod = methodFilter === "all" || tx.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {/* Header with PDF Export */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tableau de bord des transactions</h2>
        <MonthlyReportPDF />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenus totaux</p>
                <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ce mois-ci</p>
                <p className="text-2xl font-bold">{formatPrice(stats.revenueThisMonth)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.growthRate >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    stats.growthRate >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {stats.growthRate >= 0 ? "+" : ""}{stats.growthRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completedTransactions} réussies
                </p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taux de succès</p>
                <p className="text-2xl font-bold">
                  {stats.totalTransactions > 0 
                    ? Math.round((stats.completedTransactions / stats.totalTransactions) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.failedTransactions} échoués
                </p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Payment Method */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Revenus par mode de paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byPaymentMethod).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune donnée</p>
              ) : (
                Object.entries(stats.byPaymentMethod)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([method, data]) => {
                    const methodInfo = paymentMethodLabels[method] || { label: method, color: "bg-gray-500" };
                    const percentage = stats.totalRevenue > 0 ? (data.amount / stats.totalRevenue) * 100 : 0;
                    return (
                      <div key={method} className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full", methodInfo.color)} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{methodInfo.label}</span>
                            <span className="text-sm text-muted-foreground">{data.count} tx</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full", methodInfo.color)}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-24 text-right">
                              {formatPrice(data.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              Revenus par forfait
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byPlan).length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune donnée</p>
              ) : (
                Object.entries(stats.byPlan)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([plan, data], index) => {
                    const colors = ["bg-primary", "bg-blue-500", "bg-green-500", "bg-orange-500"];
                    const percentage = stats.totalRevenue > 0 ? (data.amount / stats.totalRevenue) * 100 : 0;
                    return (
                      <div key={plan} className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full", colors[index % colors.length])} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{plan}</span>
                            <span className="text-sm text-muted-foreground">{data.count} ventes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full", colors[index % colors.length])}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-24 text-right">
                              {formatPrice(data.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des transactions</CardTitle>
          <CardDescription>
            Toutes les transactions de paiement sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Payé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
                <SelectItem value="refunded">Remboursé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Tous les modes</SelectItem>
                <SelectItem value="orange_money">Orange Money</SelectItem>
                <SelectItem value="mtn_money">MTN Money</SelectItem>
                <SelectItem value="wave">Wave</SelectItem>
                <SelectItem value="moov">Moov Money</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Agence</TableHead>
                    <TableHead>Forfait</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const methodInfo = paymentMethodLabels[tx.payment_method] || { label: tx.payment_method, color: "bg-gray-500" };
                    const status = statusConfig[tx.status] || { label: tx.status, variant: "secondary" as const, icon: null };
                    
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(tx.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{tx.agency?.name || tx.customer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{tx.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{tx.plan?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.billing_cycle === "yearly" ? "Annuel" : "Mensuel"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", methodInfo.color)} />
                            <span className="text-sm">{methodInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {tx.fedapay_reference || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
