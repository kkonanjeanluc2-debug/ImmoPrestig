import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Calendar as CalendarIcon,
  Home,
  Loader2,
  FileText
} from "lucide-react";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";
import { usePayments } from "@/hooks/usePayments";
import { AddPaymentDialog } from "@/components/payment/AddPaymentDialog";
import { CollectPaymentDialog } from "@/components/payment/CollectPaymentDialog";
import { SendReminderDialog } from "@/components/payment/SendReminderDialog";
import { ReceiptActions } from "@/components/payment/ReceiptActions";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const statusConfig = {
  paid: { 
    label: "Payé", 
    icon: CheckCircle, 
    className: "bg-emerald/10 text-emerald border-emerald/20" 
  },
  pending: { 
    label: "En attente", 
    icon: Clock, 
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20" 
  },
  late: { 
    label: "En retard", 
    icon: XCircle, 
    className: "bg-red-500/10 text-red-500 border-red-500/20" 
  },
  upcoming: { 
    label: "À venir", 
    icon: CalendarIcon, 
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20" 
  },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' F CFA';
}

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { canCreate, canEdit } = usePermissions();

  const { data: payments, isLoading, error } = usePayments();

  // Get dates with payments for calendar highlighting
  const paymentDates = (payments || []).reduce((acc, payment) => {
    const date = payment.due_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(payment);
    return acc;
  }, {} as Record<string, typeof payments>);

  const filteredPayments = (payments || []).filter(payment => {
    const tenant = payment.tenant as any;
    const tenantName = tenant?.name || '';
    const propertyTitle = tenant?.property?.title || '';
    
    const matchesSearch = 
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propertyTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Compute stats
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthlyCollected = (payments || []).filter(p => {
    const paidDate = p.paid_date ? new Date(p.paid_date) : null;
    return p.status === 'paid' && paidDate && 
           paidDate.getMonth() === thisMonth && 
           paidDate.getFullYear() === thisYear;
  }).reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingAmount = (payments || []).filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingCount = (payments || []).filter(p => p.status === 'pending').length;

  const lateAmount = (payments || []).filter(p => p.status === 'late')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const lateCount = (payments || []).filter(p => p.status === 'late').length;

  const totalExpected = monthlyCollected + pendingAmount + lateAmount;
  const recoveryRate = totalExpected > 0 ? Math.round((monthlyCollected / totalExpected) * 100) : 0;

  const stats = [
    { 
      title: "Encaissements du mois", 
      value: formatCurrency(monthlyCollected), 
      trend: "",
      trendUp: true,
      icon: TrendingUp, 
      color: "text-emerald" 
    },
    { 
      title: "En attente", 
      value: formatCurrency(pendingAmount), 
      count: `${pendingCount} paiement${pendingCount > 1 ? 's' : ''}`,
      icon: Clock, 
      color: "text-amber-500" 
    },
    { 
      title: "Retards", 
      value: formatCurrency(lateAmount), 
      count: `${lateCount} paiement${lateCount > 1 ? 's' : ''}`,
      icon: AlertTriangle, 
      color: "text-red-500" 
    },
    { 
      title: "Taux de recouvrement", 
      value: `${recoveryRate}%`, 
      trend: "",
      trendUp: true,
      icon: Wallet, 
      color: "text-blue-500" 
    },
  ];

  // Calendar day render function
  const getDayClass = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayPayments = paymentDates[dateStr];
    if (!dayPayments) return "";
    
    const hasLate = dayPayments.some((p: any) => p.status === "late");
    const hasPending = dayPayments.some((p: any) => p.status === "pending");
    const allPaid = dayPayments.every((p: any) => p.status === "paid");
    
    if (hasLate) return "bg-red-500/20 text-red-500 font-bold";
    if (hasPending) return "bg-amber-500/20 text-amber-500 font-bold";
    if (allPaid) return "bg-emerald/20 text-emerald font-bold";
    return "bg-blue-500/20 text-blue-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="pt-8 sm:pt-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Paiements
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Suivi des loyers et encaissements
            </p>
          </div>
          <div className="flex gap-2">
            <ExportDropdown
              data={payments || []}
              filename="paiements"
              columns={[
                { key: 'tenant', label: 'Locataire', format: (v) => v?.name || 'Inconnu' },
                { key: 'tenant', label: 'Bien', format: (v) => v?.property?.title || 'Non assigné' },
                { key: 'amount', label: 'Montant (F CFA)', format: (v) => Number(v).toString() },
                { key: 'due_date', label: 'Échéance', format: (v) => new Date(v).toLocaleDateString('fr-FR') },
                { key: 'paid_date', label: 'Date de paiement', format: (v) => v ? new Date(v).toLocaleDateString('fr-FR') : '' },
                { key: 'status', label: 'Statut', format: (v) => v === 'paid' ? 'Payé' : v === 'pending' ? 'En attente' : v === 'late' ? 'En retard' : 'À venir' },
                { key: 'method', label: 'Mode de paiement', format: (v) => v || '' },
              ]}
            />
            {canCreate && <AddPaymentDialog />}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                      <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{stat.title}</p>
                      <p className="text-base sm:text-xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      {stat.count && (
                        <p className="text-xs text-muted-foreground">{stat.count}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Erreur lors du chargement des paiements.</p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Calendrier des échéances
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={fr}
                  className="w-full pointer-events-auto"
                  modifiers={{
                    hasPayment: (date) => {
                      const dateStr = date.toISOString().split('T')[0];
                      return !!paymentDates[dateStr];
                    }
                  }}
                  modifiersClassNames={{
                    hasPayment: "ring-2 ring-primary ring-offset-1"
                  }}
                />

                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Légende</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-emerald/20" />
                      <span className="text-muted-foreground">Payé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-amber-500/20" />
                      <span className="text-muted-foreground">En attente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-red-500/20" />
                      <span className="text-muted-foreground">En retard</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-blue-500/20" />
                      <span className="text-muted-foreground">À venir</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment List */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-base font-semibold">
                    Historique des paiements
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        className="pl-10 h-9 w-full sm:w-48"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 w-full sm:w-36">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrer" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="paid">Payés</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="late">En retard</SelectItem>
                        <SelectItem value="upcoming">À venir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filteredPayments.map((payment) => {
                    const status = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    const tenant = payment.tenant as any;
                    const tenantName = tenant?.name || 'Locataire inconnu';
                    const propertyTitle = tenant?.property?.title || 'Bien non assigné';
                    
                    return (
                      <div
                        key={payment.id}
                        className="p-4 sm:p-5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              payment.status === "paid" ? "bg-emerald/10" :
                              payment.status === "late" ? "bg-red-500/10" :
                              payment.status === "pending" ? "bg-amber-500/10" : "bg-blue-500/10"
                            )}>
                              <StatusIcon className={cn("h-4 w-4", status.className.split(' ').find(c => c.startsWith('text-')))} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground">{tenantName}</p>
                                <Badge variant="outline" className={cn("text-xs", status.className)}>
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Home className="h-3 w-3" />
                                  <span className="truncate max-w-[150px]">{propertyTitle}</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  Échéance: {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                                </span>
                                {payment.paid_date && (
                                  <span className="flex items-center gap-1 text-emerald">
                                    <CheckCircle className="h-3 w-3" />
                                    Payé le {new Date(payment.paid_date).toLocaleDateString('fr-FR')}
                                  </span>
                                )}
                                {payment.method && (
                                  <span className="text-muted-foreground">
                                    via {payment.method}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 pl-11 sm:pl-0">
                            <span className="text-lg font-bold text-foreground whitespace-nowrap">
                              {formatCurrency(Number(payment.amount))}
                            </span>
                            {payment.status === "paid" && (
                              <ReceiptActions
                                paymentId={payment.id}
                                tenantId={payment.tenant_id}
                                tenantName={tenantName}
                                tenantEmail={tenant?.email || null}
                                propertyTitle={propertyTitle}
                                propertyAddress={tenant?.property?.address}
                                amount={Number(payment.amount)}
                                paidDate={payment.paid_date || payment.due_date}
                                dueDate={payment.due_date}
                                method={payment.method || undefined}
                              />
                            )}
                            {payment.status !== "paid" && canEdit && (
                              <>
                                <SendReminderDialog
                                  paymentId={payment.id}
                                  tenantId={payment.tenant_id}
                                  tenantName={tenantName}
                                  tenantEmail={tenant?.email || null}
                                  tenantPhone={tenant?.phone || null}
                                  propertyTitle={propertyTitle}
                                  amount={Number(payment.amount)}
                                  dueDate={payment.due_date}
                                  status={payment.status}
                                />
                                <CollectPaymentDialog
                                  paymentId={payment.id}
                                  tenantName={tenantName}
                                  amount={Number(payment.amount)}
                                  currentMethod={payment.method}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <div className="p-8 text-center">
                      <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {payments?.length === 0 
                          ? "Aucun paiement enregistré."
                          : "Aucun paiement trouvé."}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
