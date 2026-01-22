import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePayments } from "@/hooks/usePayments";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RecentPayments() {
  const { data: payments, isLoading } = usePayments();

  const statusConfig = {
    "paid": {
      icon: CheckCircle2,
      className: "text-emerald bg-emerald/10",
      label: "Payé"
    },
    "pending": {
      icon: Clock,
      className: "text-sand-dark bg-sand/50",
      label: "En attente"
    },
    "late": {
      icon: XCircle,
      className: "text-destructive bg-destructive/10",
      label: "En retard"
    },
    "upcoming": {
      icon: Clock,
      className: "text-blue-500 bg-blue-500/10",
      label: "À venir"
    },
  };

  const recentPayments = (payments || []).slice(0, 5);

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-in">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Paiements récents
        </h2>
        <Link to="/payments">
          <Button variant="ghost" size="sm" className="text-navy hover:text-navy-dark">
            Voir tout →
          </Button>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : recentPayments.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          Aucun paiement enregistré
        </div>
      ) : (
        <div className="divide-y divide-border">
          {recentPayments.map((payment) => {
            const status = statusConfig[payment.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;
            const tenant = payment.tenant as any;
            const tenantName = tenant?.name || 'Locataire';
            const propertyTitle = tenant?.property?.title || 'Bien';
            
            return (
              <div 
                key={payment.id} 
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    status.className
                  )}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tenantName}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[120px]">{propertyTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {Number(payment.amount).toLocaleString('fr-FR')} F CFA
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
