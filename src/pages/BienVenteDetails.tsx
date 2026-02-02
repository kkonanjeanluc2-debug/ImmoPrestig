import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBienVente } from "@/hooks/useBiensVente";
import { useReservationVenteByBien } from "@/hooks/useReservationsVente";
import { useAgency } from "@/hooks/useAgency";
import { formatCurrency } from "@/lib/pdfFormat";
import { generateContratReservationImmo } from "@/lib/generateVenteImmoPDF";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Building2,
  HandCoins,
  Bookmark,
  FileText,
  User,
  Phone,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { SellBienDialog } from "@/components/vente-immobiliere/SellBienDialog";
import { ReserveBienDialog } from "@/components/vente-immobiliere/ReserveBienDialog";

const STATUS_CONFIG = {
  disponible: { label: "Disponible", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  reserve: { label: "Réservé", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  vendu: { label: "Vendu", color: "bg-primary/10 text-primary border-primary/30" },
};

export default function BienVenteDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bien, isLoading } = useBienVente(id || "");
  const { data: reservation } = useReservationVenteByBien(id || "");
  const { data: agency } = useAgency();
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);

  const handleDownloadContract = () => {
    if (!reservation || !agency || !bien) {
      toast.error("Données de réservation non disponibles");
      return;
    }

    const doc = generateContratReservationImmo(
      {
        bien: {
          title: bien.title,
          address: bien.address,
          city: bien.city,
          property_type: bien.property_type,
          area: bien.area,
          price: bien.price,
        },
        acquereur: {
          name: reservation.acquereur?.name || "",
          address: reservation.acquereur?.address,
          cni_number: reservation.acquereur?.cni_number,
          phone: reservation.acquereur?.phone,
          birth_date: reservation.acquereur?.birth_date,
          birth_place: reservation.acquereur?.birth_place,
          profession: reservation.acquereur?.profession,
        },
        deposit_amount: reservation.deposit_amount,
        payment_method: reservation.payment_method,
        reservation_date: reservation.reservation_date,
        notes: reservation.notes,
      },
      {
        name: agency.name,
        address: agency.address,
        phone: agency.phone,
        email: agency.email,
        siret: agency.siret,
        logo_url: agency.logo_url,
      },
      reservation.validity_days
    );

    doc.save(`Contrat_Reservation_${bien.title.replace(/\s+/g, "_")}.pdf`);
    toast.success("Contrat de réservation téléchargé");
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

  if (!bien) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Bien non trouvé</p>
          <Button onClick={() => navigate("/ventes-immobilieres")} className="mt-4">
            Retour aux biens
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[bien.status] || STATUS_CONFIG.disponible;

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
              <h1 className="text-2xl font-bold">{bien.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {bien.address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bien.status === "disponible" && (
              <>
                <Button variant="outline" onClick={() => setReserveDialogOpen(true)}>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Réserver
                </Button>
                <Button onClick={() => setSellDialogOpen(true)}>
                  <HandCoins className="h-4 w-4 mr-2" />
                  Vendre
                </Button>
              </>
            )}
            {bien.status === "reserve" && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadContract}
                  disabled={!reservation}
                  title={!reservation ? "Contrat non disponible pour les anciennes réservations" : undefined}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Contrat de réservation
                </Button>
                <Button onClick={() => setSellDialogOpen(true)}>
                  <HandCoins className="h-4 w-4 mr-2" />
                  Finaliser la vente
                </Button>
              </>
            )}
            <Badge variant="outline" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Image */}
          <Card className="overflow-hidden">
            <div className="h-80 bg-muted">
              {bien.image_url ? (
                <img
                  src={bien.image_url}
                  alt={bien.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="h-24 w-24 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du bien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{bien.property_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix</span>
                <span className="font-bold text-primary text-lg">{formatCurrency(bien.price)}</span>
              </div>
              {bien.city && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ville</span>
                  <span className="font-medium">{bien.city}</span>
                </div>
              )}
              <div className="flex items-center gap-4 pt-4 border-t">
                {bien.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <span>{bien.bedrooms} chambres</span>
                  </div>
                )}
                {bien.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <span>{bien.bathrooms} SDB</span>
                  </div>
                )}
                {bien.area && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-5 w-5 text-muted-foreground" />
                    <span>{bien.area} m²</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {bien.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{bien.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Reservation Info */}
        {bien.status === "reserve" && reservation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Réservation en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{reservation.acquereur?.name}</p>
                    {reservation.acquereur?.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {reservation.acquereur.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Acompte versé</span>
                    <span className="font-medium">{formatCurrency(reservation.deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date de réservation</span>
                    <span className="font-medium">
                      {format(new Date(reservation.reservation_date), "dd MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expire le</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(reservation.expiry_date), "dd MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
              {reservation.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{reservation.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {bien && (
        <SellBienDialog
          bien={bien}
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
        />
      )}

      {bien && (
        <ReserveBienDialog
          bien={bien}
          open={reserveDialogOpen}
          onOpenChange={setReserveDialogOpen}
        />
      )}
    </DashboardLayout>
  );
}
