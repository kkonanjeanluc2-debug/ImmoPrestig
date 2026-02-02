import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBienVente } from "@/hooks/useBiensVente";
import { formatCurrency } from "@/lib/pdfFormat";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Building2,
  HandCoins,
  Bookmark,
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
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);

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
              <Button onClick={() => setSellDialogOpen(true)}>
                <HandCoins className="h-4 w-4 mr-2" />
                Finaliser la vente
              </Button>
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
