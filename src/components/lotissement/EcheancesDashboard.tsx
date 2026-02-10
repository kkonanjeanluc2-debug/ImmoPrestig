import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckCircle2,
  Phone,
  MessageCircle,
  Banknote,
  Filter,
} from "lucide-react";
import { format, differenceInDays, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { useUpcomingEcheances, useOverdueEcheances, EcheanceWithDetails } from "@/hooks/useEcheancesParcelles";
import { openWhatsApp } from "@/lib/whatsapp";
import { Skeleton } from "@/components/ui/skeleton";
import { PayEcheanceDialog } from "./PayEcheanceDialog";

interface EcheancesDashboardProps {
  lotissementId?: string;
}

const monthsOptions = [
  { value: "1", label: "1 mois" },
  { value: "2", label: "2 mois" },
  { value: "3", label: "3 mois" },
  { value: "6", label: "6 mois" },
  { value: "12", label: "12 mois" },
  { value: "24", label: "24 mois" },
];

export function EcheancesDashboard({ lotissementId }: EcheancesDashboardProps) {
  const [monthsAhead, setMonthsAhead] = useState(1);
  const { data: upcomingEcheances, isLoading: loadingUpcoming } = useUpcomingEcheances(monthsAhead, lotissementId);
  const { data: overdueEcheances, isLoading: loadingOverdue } = useOverdueEcheances(lotissementId);
  const [payingEcheance, setPayingEcheance] = useState<EcheanceWithDetails | null>(null);

  const filteredUpcoming = upcomingEcheances;
  const filteredOverdue = overdueEcheances;

  const totalOverdueAmount = filteredOverdue?.reduce((sum, e) => sum + e.amount, 0) || 0;
  const totalUpcomingAmount = filteredUpcoming?.reduce((sum, e) => sum + e.amount, 0) || 0;

  const getDaysLabel = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (isToday(new Date(dueDate))) return "Aujourd'hui";
    if (days === 1) return "Demain";
    if (days < 0) return `${Math.abs(days)} jour(s) de retard`;
    return `Dans ${days} jours`;
  };

  const getUrgencyBadge = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> En retard</Badge>;
    }
    if (days === 0) {
      return <Badge className="bg-orange-500 gap-1"><Clock className="h-3 w-3" /> Aujourd'hui</Badge>;
    }
    if (days <= 3) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600 gap-1"><Clock className="h-3 w-3" /> Imminent</Badge>;
    }
    if (days <= 30) {
      return <Badge variant="secondary" className="gap-1"><Calendar className="h-3 w-3" /> À venir</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" /> Dans {days}j</Badge>;
  };

  const handleWhatsApp = (phone: string | null, echeance: EcheanceWithDetails) => {
    if (!phone) return;
    const message = `Bonjour, nous vous rappelons que l'échéance de ${echeance.amount.toLocaleString("fr-FR")} F CFA pour la parcelle ${echeance.vente?.parcelle?.plot_number} est prévue le ${format(new Date(echeance.due_date), "dd/MM/yyyy")}. Merci de procéder au paiement.`;
    openWhatsApp(phone, message);
  };

  const EcheanceRow = ({ echeance }: { echeance: EcheanceWithDetails }) => (
    <TableRow>
      <TableCell>
        <div className="font-medium">{echeance.vente?.acquereur?.name || "—"}</div>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {echeance.vente?.acquereur?.phone || "Non renseigné"}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">
          Parcelle {echeance.vente?.parcelle?.plot_number}
        </div>
        <div className="text-sm text-muted-foreground">
          {echeance.vente?.parcelle?.lotissement?.name}
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold">
        {echeance.amount.toLocaleString("fr-FR")} F
      </TableCell>
      <TableCell>
        <div>{format(new Date(echeance.due_date), "dd MMM yyyy", { locale: fr })}</div>
        <div className="text-sm text-muted-foreground">{getDaysLabel(echeance.due_date)}</div>
      </TableCell>
      <TableCell>{getUrgencyBadge(echeance.due_date)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPayingEcheance(echeance)}
            title="Encaisser cette échéance"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          >
            <Banknote className="h-4 w-4" />
          </Button>
          {echeance.vente?.acquereur?.phone && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleWhatsApp(echeance.vente?.acquereur?.phone || null, echeance)}
              title="Envoyer un rappel WhatsApp"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  if (loadingUpcoming || loadingOverdue) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Échéances en retard</p>
                <p className="text-2xl font-bold text-destructive">
                  {filteredOverdue?.length || 0}
                </p>
                <p className="text-sm font-medium text-destructive">
                  {totalOverdueAmount.toLocaleString("fr-FR")} F
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">À venir ({monthsAhead} mois)</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredUpcoming?.length || 0}
                </p>
                <p className="text-sm font-medium text-orange-600">
                  {totalUpcomingAmount.toLocaleString("fr-FR")} F
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total attendu</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {(totalOverdueAmount + totalUpcomingAmount).toLocaleString("fr-FR")} F
                </p>
                <p className="text-sm text-muted-foreground">
                  {(filteredOverdue?.length || 0) + (filteredUpcoming?.length || 0)} échéances
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with tables */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Échéances de paiement
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Afficher :</span>
              <Select
                value={String(monthsAhead)}
                onValueChange={(v) => setMonthsAhead(parseInt(v))}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthsOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming" className="gap-2">
                <Clock className="h-4 w-4" />
                À venir
                {(filteredUpcoming?.length || 0) > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {filteredUpcoming?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="overdue" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                En retard
                {(filteredOverdue?.length || 0) > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {filteredOverdue?.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {!filteredUpcoming?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune échéance à venir dans les {monthsAhead} prochain(s) mois</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Acquéreur</TableHead>
                        <TableHead>Parcelle</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUpcoming.map((echeance) => (
                        <EcheanceRow key={echeance.id} echeance={echeance} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overdue">
              {!filteredOverdue?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>Aucune échéance en retard</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[650px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Acquéreur</TableHead>
                        <TableHead>Parcelle</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOverdue.map((echeance) => (
                        <EcheanceRow key={echeance.id} echeance={echeance} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {payingEcheance && (
        <PayEcheanceDialog
          echeance={payingEcheance}
          open={!!payingEcheance}
          onOpenChange={(open) => !open && setPayingEcheance(null)}
        />
      )}
    </div>
  );
}