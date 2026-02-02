import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEcheancesVentes, type EcheanceVenteWithDetails } from "@/hooks/useEcheancesVentes";
import { formatCurrency } from "@/lib/pdfFormat";
import { format, differenceInDays, isToday, addDays, isBefore, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, AlertCircle, Bell } from "lucide-react";
import { SendVenteReminderDialog } from "./SendVenteReminderDialog";

export function UpcomingEcheancesVentesList() {
  const { data: echeances, isLoading } = useEcheancesVentes();

  // Filter échéances due within the next 30 days (pending only)
  const upcomingEcheances = useMemo(() => {
    if (!echeances) return [];
    
    const today = new Date();
    const in30Days = addDays(today, 30);
    
    return echeances.filter((echeance) => {
      if (echeance.status !== "pending") return false;
      
      const dueDate = new Date(echeance.due_date);
      return (isToday(dueDate) || isAfter(dueDate, today)) && isBefore(dueDate, in30Days);
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [echeances]);

  const getUrgencyBadge = (echeance: EcheanceVenteWithDetails) => {
    const dueDate = new Date(echeance.due_date);
    const daysUntil = differenceInDays(dueDate, new Date());

    if (isToday(dueDate)) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Aujourd'hui
        </Badge>
      );
    }

    if (daysUntil <= 3) {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30">
          <Clock className="h-3 w-3 mr-1" />
          Dans {daysUntil}j
        </Badge>
      );
    }

    if (daysUntil <= 7) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Dans {daysUntil}j
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Calendar className="h-3 w-3 mr-1" />
        Dans {daysUntil}j
      </Badge>
    );
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayCount = upcomingEcheances.filter(e => isToday(new Date(e.due_date))).length;
    const within7Days = upcomingEcheances.filter(e => {
      const daysUntil = differenceInDays(new Date(e.due_date), today);
      return daysUntil <= 7 && daysUntil >= 0;
    }).length;
    const totalAmount = upcomingEcheances.reduce((sum, e) => sum + e.amount, 0);
    
    return { todayCount, within7Days, totalAmount, total: upcomingEcheances.length };
  }, [upcomingEcheances]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Échéances à venir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total à venir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayCount}</p>
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.within7Days}</p>
                <p className="text-xs text-muted-foreground">Cette semaine</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-sm">{formatCurrency(stats.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">Montant attendu</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Échéances des 30 prochains jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEcheances.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune échéance à venir dans les 30 prochains jours</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bien</TableHead>
                    <TableHead>Acquéreur</TableHead>
                    <TableHead>Date d'échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Urgence</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingEcheances.map((echeance) => (
                    <TableRow key={echeance.id}>
                      <TableCell>
                        <p className="font-medium">{echeance.vente?.bien?.title}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{echeance.vente?.acquereur?.name}</p>
                        <p className="text-sm text-muted-foreground">{echeance.vente?.acquereur?.phone}</p>
                      </TableCell>
                      <TableCell>
                        {format(new Date(echeance.due_date), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(echeance.amount)}
                      </TableCell>
                      <TableCell>{getUrgencyBadge(echeance)}</TableCell>
                      <TableCell className="text-right">
                        <SendVenteReminderDialog
                          echeanceId={echeance.id}
                          acquereurName={echeance.vente?.acquereur?.name || "Client"}
                          acquereurPhone={echeance.vente?.acquereur?.phone}
                          acquereurEmail={echeance.vente?.acquereur?.email}
                          bienTitle={echeance.vente?.bien?.title || "Bien"}
                          amount={echeance.amount}
                          dueDate={echeance.due_date}
                          isLate={false}
                          trigger={
                            <Button size="sm" variant="outline">
                              <Bell className="h-4 w-4 mr-2" />
                              Relancer
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
