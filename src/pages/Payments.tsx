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
  Plus, 
  Search, 
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Calendar as CalendarIcon,
  User,
  Home
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";

interface Payment {
  id: string;
  tenant: string;
  property: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: "paid" | "pending" | "late" | "upcoming";
  method?: string;
}

const payments: Payment[] = [
  {
    id: "1",
    tenant: "Marie Dupont",
    property: "Appartement Haussmannien",
    amount: 450000,
    dueDate: "2026-01-05",
    paidDate: "2026-01-03",
    status: "paid",
    method: "Virement"
  },
  {
    id: "2",
    tenant: "Pierre Martin",
    property: "Studio Moderne",
    amount: 320000,
    dueDate: "2026-01-10",
    status: "pending"
  },
  {
    id: "3",
    tenant: "Sophie Bernard",
    property: "Maison de Ville",
    amount: 680000,
    dueDate: "2025-12-05",
    paidDate: "2025-12-08",
    status: "paid",
    method: "Espèces"
  },
  {
    id: "4",
    tenant: "Lucas Petit",
    property: "Loft Industriel",
    amount: 550000,
    dueDate: "2026-01-03",
    paidDate: "2026-01-02",
    status: "paid",
    method: "Mobile Money"
  },
  {
    id: "5",
    tenant: "Emma Rousseau",
    property: "Duplex Lumineux",
    amount: 400000,
    dueDate: "2025-12-31",
    status: "late"
  },
  {
    id: "6",
    tenant: "Thomas Leroy",
    property: "Villa Moderne",
    amount: 850000,
    dueDate: "2026-01-15",
    status: "upcoming"
  },
  {
    id: "7",
    tenant: "Julie Moreau",
    property: "Appartement Centre-Ville",
    amount: 380000,
    dueDate: "2026-01-20",
    status: "upcoming"
  },
  {
    id: "8",
    tenant: "Antoine Dubois",
    property: "T3 Résidentiel",
    amount: 290000,
    dueDate: "2025-12-28",
    status: "late"
  },
];

const stats = [
  { 
    title: "Encaissements du mois", 
    value: "2 450 000", 
    trend: "+12%",
    trendUp: true,
    icon: TrendingUp, 
    color: "text-emerald" 
  },
  { 
    title: "En attente", 
    value: "720 000", 
    count: "2 paiements",
    icon: Clock, 
    color: "text-amber-500" 
  },
  { 
    title: "Retards", 
    value: "690 000", 
    count: "2 paiements",
    icon: AlertTriangle, 
    color: "text-red-500" 
  },
  { 
    title: "Taux de recouvrement", 
    value: "87%", 
    trend: "+3%",
    trendUp: true,
    icon: Wallet, 
    color: "text-blue-500" 
  },
];

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

  // Get dates with payments for calendar highlighting
  const paymentDates = payments.reduce((acc, payment) => {
    const date = payment.dueDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(payment);
    return acc;
  }, {} as Record<string, Payment[]>);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.property.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calendar day render function
  const getDayClass = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayPayments = paymentDates[dateStr];
    if (!dayPayments) return "";
    
    const hasLate = dayPayments.some(p => p.status === "late");
    const hasPending = dayPayments.some(p => p.status === "pending");
    const allPaid = dayPayments.every(p => p.status === "paid");
    
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
          <Button className="bg-emerald hover:bg-emerald/90 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Enregistrer un paiement
          </Button>
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
                        {stat.value} {stat.title !== "Taux de recouvrement" && <span className="text-xs font-normal">F CFA</span>}
                      </p>
                      {stat.count && (
                        <p className="text-xs text-muted-foreground">{stat.count}</p>
                      )}
                    </div>
                  </div>
                  {stat.trend && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        stat.trendUp 
                          ? "text-emerald border-emerald/20 bg-emerald/10" 
                          : "text-red-500 border-red-500/20 bg-red-500/10"
                      )}
                    >
                      {stat.trendUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {stat.trend}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
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
                components={{
                  Day: ({ date, ...props }) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const dayPayments = paymentDates[dateStr];
                    return (
                      <div className="relative">
                        <button
                          {...props}
                          className={cn(
                            "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
                            getDayClass(date)
                          )}
                        >
                          {date.getDate()}
                        </button>
                        {dayPayments && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayPayments.slice(0, 3).map((_, i) => (
                              <div key={i} className="h-1 w-1 rounded-full bg-current" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
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
                  const status = statusConfig[payment.status];
                  const StatusIcon = status.icon;
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
                              <p className="font-medium text-foreground">{payment.tenant}</p>
                              <Badge variant="outline" className={cn("text-xs", status.className)}>
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{payment.property}</span>
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                Échéance: {new Date(payment.dueDate).toLocaleDateString('fr-FR')}
                              </span>
                              {payment.paidDate && (
                                <span className="flex items-center gap-1 text-emerald">
                                  <CheckCircle className="h-3 w-3" />
                                  Payé le {new Date(payment.paidDate).toLocaleDateString('fr-FR')}
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
                        <div className="flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0">
                          <span className="text-lg font-bold text-foreground whitespace-nowrap">
                            {formatCurrency(payment.amount)}
                          </span>
                          {payment.status !== "paid" && (
                            <Button size="sm" variant="outline" className="text-xs">
                              Encaisser
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <div className="p-8 text-center">
                    <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun paiement trouvé</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
