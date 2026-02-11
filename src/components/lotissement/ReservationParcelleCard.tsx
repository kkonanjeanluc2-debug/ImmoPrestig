import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Banknote, Clock, X, ShoppingCart, FileText, Loader2 } from "lucide-react";
import { ReservationParcelle, useUpdateReservationParcelle } from "@/hooks/useReservationsParcelles";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { SellParcelleDialog } from "./SellParcelleDialog";
import { Parcelle } from "@/hooks/useParcelles";
import { generateFicheReservation, downloadPDF } from "@/lib/generateLotissementPDF";
import { useAgency } from "@/hooks/useAgency";

interface LotissementInfo {
  name: string;
  location: string;
  city?: string | null;
}

interface ReservationParcelleCardProps {
  reservation: ReservationParcelle;
  parcelle?: Parcelle;
  lotissement?: LotissementInfo;
}

export function ReservationParcelleCard({ reservation, parcelle, lotissement }: ReservationParcelleCardProps) {
  const updateReservation = useUpdateReservationParcelle();
  const { data: agency } = useAgency();
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const isExpired = new Date(reservation.expiry_date) < new Date();

  const handleCancel = async () => {
    try {
      await updateReservation.mutateAsync({ id: reservation.id, status: "cancelled" });
      toast.success("Réservation annulée");
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleDownloadPDF = async () => {
    if (!parcelle || !lotissement) {
      toast.error("Informations manquantes pour générer le PDF");
      return;
    }
    setGeneratingPDF(true);
    try {
      const agencyInfo = agency ? {
        name: agency.name,
        email: agency.email || undefined,
        phone: agency.phone || undefined,
        address: agency.address || undefined,
        city: agency.city || undefined,
        country: agency.country || undefined,
        logo_url: agency.logo_url,
        siret: agency.siret || undefined,
      } : null;

      const acquereurInfo = {
        name: reservation.acquereur?.name || "—",
        phone: reservation.acquereur?.phone || null,
        email: reservation.acquereur?.email || null,
        address: null,
        cni_number: null,
        birth_date: null,
        birth_place: null,
        profession: null,
      };

      const doc = await generateFicheReservation(
        { plot_number: parcelle.plot_number, area: parcelle.area, price: parcelle.price },
        { name: lotissement.name, location: lotissement.location, city: lotissement.city },
        acquereurInfo,
        agencyInfo,
        {
          deposit_amount: reservation.deposit_amount,
          reservation_date: reservation.reservation_date,
          expiry_date: reservation.expiry_date,
          validity_days: reservation.validity_days,
          payment_method: reservation.payment_method,
          notes: reservation.notes,
        }
      );
      downloadPDF(doc, `fiche-reservation-${parcelle.plot_number}.pdf`);
      toast.success("Fiche de réservation générée");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              Fiche de réservation
            </CardTitle>
            <Badge variant="outline" className={isExpired ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}>
              {isExpired ? "Expirée" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Acquéreur</p>
                <p className="font-medium">{reservation.acquereur?.name || "—"}</p>
                {reservation.acquereur?.phone && (
                  <p className="text-xs text-muted-foreground">{reservation.acquereur.phone}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Montant de la réservation</p>
                <p className="font-medium">{reservation.deposit_amount.toLocaleString("fr-FR")} F CFA</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Date</p>
                <p className="font-medium">{format(new Date(reservation.reservation_date), "dd MMM yyyy", { locale: fr })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs">Expire le</p>
                <p className={`font-medium ${isExpired ? "text-destructive" : ""}`}>
                  {format(new Date(reservation.expiry_date), "dd MMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          {reservation.notes && (
            <p className="text-sm text-muted-foreground bg-background/50 p-2 rounded">{reservation.notes}</p>
          )}

          <div className="flex gap-2 flex-wrap">
            {parcelle && lotissement && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                Fiche PDF
              </Button>
            )}

            {parcelle && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => setShowSellDialog(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Confirmer la vente
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    La parcelle redeviendra disponible à la vente. Le montant de la réservation reste acquis.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Non</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Oui, annuler
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {parcelle && showSellDialog && (
        <SellParcelleDialog
          parcelle={parcelle}
          open={showSellDialog}
          onOpenChange={setShowSellDialog}
          reservationId={reservation.id}
          defaultAcquereurId={reservation.acquereur_id}
          defaultDownPayment={reservation.deposit_amount}
        />
      )}
    </>
  );
}
