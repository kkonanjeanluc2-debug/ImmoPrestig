import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownToLine,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Smartphone,
  User,
  Calendar,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useOnlineRentPayments, useOnlineRentPaymentStats } from "@/hooks/useOnlineRentPayments";
import {
  useWithdrawalRequests,
  useWithdrawalStats,
  useCancelWithdrawalRequest,
} from "@/hooks/useWithdrawalRequests";
import { RequestWithdrawalDialog } from "./RequestWithdrawalDialog";
import { PAYMENT_OPERATORS } from "@/hooks/useAgency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR") + " F CFA";
}

function getOperatorLabel(value: string): string {
  const op = PAYMENT_OPERATORS.find((o) => o.value === value);
  return op?.label || value;
}

const statusConfig = {
  pending: {
    label: "En attente",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  processing: {
    label: "En cours",
    icon: Loader2,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  completed: {
    label: "Effectué",
    icon: CheckCircle,
    className: "bg-emerald/10 text-emerald border-emerald/20",
  },
  failed: {
    label: "Échoué",
    icon: XCircle,
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  received: {
    label: "Reçu",
    icon: CheckCircle,
    className: "bg-emerald/10 text-emerald border-emerald/20",
  },
};

export function AccountTab() {
  const [subTab, setSubTab] = useState("received");

  const { data: onlinePayments = [], isLoading: loadingPayments } = useOnlineRentPayments();
  const { data: withdrawalRequests = [], isLoading: loadingWithdrawals } = useWithdrawalRequests();
  const paymentStats = useOnlineRentPaymentStats();
  const withdrawalStats = useWithdrawalStats();
  const cancelWithdrawal = useCancelWithdrawalRequest();

  // Calculate available balance (received - pending withdrawals - completed withdrawals)
  const availableBalance =
    paymentStats.totalReceived - withdrawalStats.pendingTotal - withdrawalStats.completedTotal;

  const stats = [
    {
      title: "Solde disponible",
      value: formatCurrency(Math.max(0, availableBalance)),
      icon: Wallet,
      color: "text-emerald",
    },
    {
      title: "Encaissements en ligne",
      value: formatCurrency(paymentStats.totalReceived),
      count: `${paymentStats.totalCount} paiement${paymentStats.totalCount > 1 ? "s" : ""}`,
      icon: ArrowUpRight,
      color: "text-blue-500",
    },
    {
      title: "Reversements en attente",
      value: formatCurrency(withdrawalStats.pendingTotal),
      count: `${withdrawalStats.pendingCount} demande${withdrawalStats.pendingCount > 1 ? "s" : ""}`,
      icon: Clock,
      color: "text-amber-500",
    },
    {
      title: "Reversements effectués",
      value: formatCurrency(withdrawalStats.completedTotal),
      icon: ArrowDownToLine,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
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
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                      {stat.title}
                    </p>
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

      {/* Action Button */}
      <div className="flex justify-end">
        <RequestWithdrawalDialog availableBalance={Math.max(0, availableBalance)} />
      </div>

      {/* Sub-Tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Paiements reçus
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Demandes de reversement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paiements de loyer en ligne</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPayments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : onlinePayments.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucun paiement en ligne reçu pour le moment.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les paiements effectués par vos locataires via le portail apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {onlinePayments.map((payment) => {
                    const status = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.received;
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={payment.id}
                        className="p-4 sm:p-5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg", status.className.split(" ")[0])}>
                              <StatusIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground">
                                  {payment.tenant?.name || "Locataire"}
                                </p>
                                <Badge variant="outline" className={cn("text-xs", status.className)}>
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {payment.tenant?.property?.title && (
                                  <span>{payment.tenant.property.title}</span>
                                )}
                                {payment.payment_method && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {getOperatorLabel(payment.payment_method)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(payment.paid_at).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {payment.kkiapay_transaction_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Réf: {payment.kkiapay_transaction_id}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center pl-11 sm:pl-0">
                            <span className="text-lg font-bold text-emerald whitespace-nowrap">
                              +{formatCurrency(Number(payment.amount))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demandes de reversement</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingWithdrawals ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : withdrawalRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <ArrowDownToLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Aucune demande de reversement.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Demandez un reversement pour transférer les fonds vers votre compte.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {withdrawalRequests.map((request) => {
                    const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={request.id}
                        className="p-4 sm:p-5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg", status.className.split(" ")[0])}>
                              <StatusIcon
                                className={cn(
                                  "h-4 w-4",
                                  request.status === "processing" && "animate-spin"
                                )}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground">
                                  Reversement vers {getOperatorLabel(request.payment_method)}
                                </p>
                                <Badge variant="outline" className={cn("text-xs", status.className)}>
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Smartphone className="h-3 w-3" />
                                  {request.recipient_phone}
                                </span>
                                {request.recipient_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {request.recipient_name}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(request.created_at).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                              {request.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {request.notes}
                                </p>
                              )}
                              {request.processed_at && (
                                <p className="text-xs text-emerald mt-1">
                                  Traité le{" "}
                                  {new Date(request.processed_at).toLocaleDateString("fr-FR")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 pl-11 sm:pl-0">
                            <span
                              className={cn(
                                "text-lg font-bold whitespace-nowrap",
                                request.status === "completed"
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                              )}
                            >
                              {formatCurrency(Number(request.amount))}
                            </span>
                            {request.status === "pending" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive">
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Annuler la demande ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir annuler cette demande de reversement
                                      de {formatCurrency(Number(request.amount))} ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Non, garder</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => cancelWithdrawal.mutate(request.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Oui, annuler
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
