import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Banknote, Clock, X } from "lucide-react";
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

interface ReservationParcelleCardProps {
  reservation: ReservationParcelle;
}

export function ReservationParcelleCard({ reservation }: ReservationParcelleCardProps) {
  const updateReservation = useUpdateReservationParcelle();

  const isExpired = new Date(reservation.expiry_date) < new Date();

  const handleCancel = async () => {
    try {
      await updateReservation.mutateAsync({ id: reservation.id, status: "cancelled" });
      toast.success("Réservation annulée");
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  };

  return (
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
              <p className="text-muted-foreground text-xs">Acompte</p>
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive">
              <X className="h-4 w-4 mr-2" />
              Annuler la réservation
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
              <AlertDialogDescription>
                La parcelle redeviendra disponible à la vente.
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
      </CardContent>
    </Card>
  );
}
