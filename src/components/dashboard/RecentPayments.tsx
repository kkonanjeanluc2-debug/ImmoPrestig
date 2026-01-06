import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  tenant: string;
  property: string;
  amount: number;
  date: string;
  status: "payé" | "en attente" | "en retard";
}

const payments: Payment[] = [
  {
    id: "1",
    tenant: "Marie Martin",
    property: "Appartement Haussmann",
    amount: 1200,
    date: "15 Jan 2025",
    status: "payé",
  },
  {
    id: "2",
    tenant: "Pierre Durand",
    property: "Studio Marais",
    amount: 850,
    date: "12 Jan 2025",
    status: "payé",
  },
  {
    id: "3",
    tenant: "Sophie Bernard",
    property: "Maison Vincennes",
    amount: 1800,
    date: "10 Jan 2025",
    status: "en attente",
  },
  {
    id: "4",
    tenant: "Lucas Petit",
    property: "Appartement Montmartre",
    amount: 950,
    date: "05 Jan 2025",
    status: "en retard",
  },
];

export function RecentPayments() {
  const statusConfig = {
    "payé": {
      icon: CheckCircle2,
      className: "text-emerald bg-emerald/10",
    },
    "en attente": {
      icon: Clock,
      className: "text-sand-dark bg-sand/50",
    },
    "en retard": {
      icon: XCircle,
      className: "text-destructive bg-destructive/10",
    },
  };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 animate-fade-in">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Paiements récents
        </h2>
      </div>
      <div className="divide-y divide-border">
        {payments.map((payment) => {
          const StatusIcon = statusConfig[payment.status].icon;
          return (
            <div 
              key={payment.id} 
              className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  statusConfig[payment.status].className
                )}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{payment.tenant}</p>
                  <p className="text-sm text-muted-foreground">{payment.property}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {payment.amount.toLocaleString('fr-FR')} F CFA
                </p>
                <p className="text-sm text-muted-foreground">{payment.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
