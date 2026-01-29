import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useVenteImmobiliere } from "@/hooks/useVentesImmobilieres";
import { useEcheancesVentes, usePayEcheanceVente } from "@/hooks/useEcheancesVentes";
import { formatCurrency } from "@/lib/pdfFormat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  Calendar,
  CreditCard,
  FileText,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { DocumentsVenteDialog } from "@/components/vente-immobiliere/DocumentsVenteDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_CONFIG = {
  en_cours: { label: "En cours", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  complete: { label: "Complété", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  annule: { label: "Annulé", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function VenteImmobiliereDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vente, isLoading } = useVenteImmobiliere(id || "");
  const { data: echeances } = useEcheancesVentes();
  const payEcheance = usePayEcheanceVente();
  const [showDocuments, setShowDocuments] = useState(false);

  const venteEcheances = echeances?.filter((e) => e.vente_id === id) || [];

  const handlePayEcheance = async (echeanceId: string, amount: number) => {
    try {
      await payEcheance.mutateAsync({
        id: echeanceId,
        paid_amount: amount,
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: "especes",
      });
      toast.success("Échéance payée avec succès");
    } catch (error) {
      toast.error("Erreur lors du paiement");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!vente) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Vente non trouvée</p>
          <Button onClick={() => navigate("/ventes-immobilieres")} className="mt-4">
            Retour aux ventes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[vente.status] || STATUS_CONFIG.en_cours;
  const progress =
    vente.payment_type === "echelonne" && vente.total_installments
      ? ((vente.paid_installments || 0) / vente.total_installments) * 100
      : vente.status === "complete"
      ? 100
      : 0;

  const paidAmount =
    vente.payment_type === "echelonne"
      ? (vente.down_payment || 0) +
        venteEcheances
          .filter((e) => e.status === "paid")
          .reduce((sum, e) => sum + (e.paid_amount || e.amount), 0)
      : vente.total_price;

  const remainingAmount = vente.total_price - paidAmount;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ventes-immobilieres")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{vente.bien?.title}</h1>
              <p className="text-muted-foreground">{vente.bien?.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowDocuments(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </Button>
            <Badge variant="outline" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Bien Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Informations du bien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{vente.bien?.property_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adresse</span>
                <span className="font-medium">{vente.bien?.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de vente</span>
                <span className="font-medium">
                  {format(new Date(vente.sale_date), "dd MMMM yyyy", { locale: fr })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Acquéreur Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Acquéreur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{vente.acquereur?.name}</p>
                  {vente.acquereur?.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {vente.acquereur.email}
                    </p>
                  )}
                </div>
              </div>
              {vente.acquereur?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {vente.acquereur.phone}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Récapitulatif financier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Prix total</p>
                <p className="text-xl font-bold">{formatCurrency(vente.total_price)}</p>
              </div>
              <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Montant payé</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
              </div>
              <div className="text-center p-4 bg-amber-500/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Reste à payer</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(remainingAmount)}</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Type de paiement</p>
                <p className="text-xl font-bold">
                  {vente.payment_type === "comptant" ? "Comptant" : "Échelonné"}
                </p>
              </div>
            </div>

            {vente.payment_type === "echelonne" && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression des paiements</span>
                  <span>
                    {vente.paid_installments || 0}/{vente.total_installments} échéances
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Échéances */}
        {vente.payment_type === "echelonne" && venteEcheances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Échéancier de paiement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Date d'échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de paiement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venteEcheances
                    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                    .map((echeance, index) => {
                      const isOverdue =
                        echeance.status === "pending" && new Date(echeance.due_date) < new Date();
                      return (
                        <TableRow key={echeance.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            {format(new Date(echeance.due_date), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>{formatCurrency(echeance.amount)}</TableCell>
                          <TableCell>
                            {echeance.status === "paid" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                <Check className="h-3 w-3 mr-1" />
                                Payé
                              </Badge>
                            ) : isOverdue ? (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                En retard
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                En attente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {echeance.paid_date
                              ? format(new Date(echeance.paid_date), "dd MMM yyyy", { locale: fr })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {echeance.status !== "paid" && (
                              <Button
                                size="sm"
                                onClick={() => handlePayEcheance(echeance.id, echeance.amount)}
                              >
                                Encaisser
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {showDocuments && (
        <DocumentsVenteDialog
          vente={vente}
          open={showDocuments}
          onOpenChange={setShowDocuments}
        />
      )}
    </DashboardLayout>
  );
}
