import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Building2,
  Grid3X3,
  Users,
  Receipt,
  Pencil,
  MapPin,
  CalendarDays,
  FileText,
  HardHat,
} from "lucide-react";
import { useProgramme, useLotsByProgramme, STATUT_PROGRAMME_LABELS, STATUT_PROGRAMME_COLORS, TYPE_PROGRAMME_LABELS } from "@/hooks/usePromotionsImmobilieres";
import { useReservationsByProgramme } from "@/hooks/useReservationsLots";
import { LotsGrid } from "@/components/promotions/LotsGrid";
import { ReservationsList } from "@/components/promotions/ReservationsList";
import { ReservationForm } from "@/components/promotions/ReservationForm";
import { ProgrammeFormDialog } from "@/components/promotions/ProgrammeFormDialog";
import { EcheancierPaiement } from "@/components/promotions/EcheancierPaiement";
import { VisitesChantier } from "@/components/promotions/VisitesChantier";
import { StatutProgrammeBadge } from "@/components/promotions/StatutBadge";
import { usePermissions } from "@/hooks/usePermissions";
import type { LotProgramme } from "@/hooks/usePromotionsImmobilieres";

const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function PromotionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("can_edit_biens_vente");

  const { data: programme, isLoading } = useProgramme(id!);
  const { data: lots = [] } = useLotsByProgramme(id!);
  const { data: reservations = [] } = useReservationsByProgramme(id!);

  const [editOpen, setEditOpen] = useState(false);
  const [reserverLot, setReserverLot] = useState<LotProgramme | null>(null);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-muted-foreground">Chargement...</div>
      </DashboardLayout>
    );
  }

  if (!programme) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-muted-foreground">Programme introuvable.</div>
      </DashboardLayout>
    );
  }

  // Stats depuis les lots
  const disponibles = lots.filter((l) => l.statut === "disponible").length;
  const reserves    = lots.filter((l) => l.statut === "reserve").length;
  const vendus      = lots.filter((l) => l.statut === "vendu").length;
  const totalLots   = lots.length || programme.nombre_lots_total;
  const taux        = totalLots > 0 ? Math.round(((vendus + reserves) / totalLots) * 100) : 0;

  // Tous les IDs de réservations pour les appels de fonds
  const reservationIds = reservations.map((r) => r.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/promotions")} className="mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-display">{programme.nom}</h1>
                <StatutProgrammeBadge statut={programme.statut} />
                <Badge variant="outline" className="text-xs">
                  {TYPE_PROGRAMME_LABELS[programme.type_programme]}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {programme.localisation} · {programme.commune}, {programme.ville}
              </div>
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Disponibles", value: disponibles, color: "text-gray-700" },
            { label: "Réservés",    value: reserves,    color: "text-blue-600" },
            { label: "Vendus",      value: vendus,      color: "text-emerald-600" },
            { label: "Taux",        value: `${taux}%`,  color: "text-orange-600" },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Barre de commercialisation */}
        <div className="bg-muted/40 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Avancement commercial</span>
            <span className="font-medium">{taux}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${taux}%` }} />
          </div>
        </div>

        {/* Onglets */}
        <Tabs defaultValue="apercu">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="apercu" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger value="lots" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Lots</span>
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{lots.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Réservations</span>
              <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{reservations.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="appels" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Appels de fonds</span>
            </TabsTrigger>
            <TabsTrigger value="visites" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <HardHat className="h-4 w-4" />
              <span className="hidden sm:inline">Visites chantier</span>
            </TabsTrigger>
          </TabsList>

          {/* Aperçu */}
          <TabsContent value="apercu" className="mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Infos générales */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {programme.description && <p className="text-muted-foreground">{programme.description}</p>}
                  {programme.superficie_terrain_m2 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Superficie terrain</span>
                      <span>{programme.superficie_terrain_m2.toLocaleString("fr-FR")} m²</span>
                    </div>
                  )}
                  {programme.prix_min_fcfa && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix min</span>
                      <span className="font-medium">{fmt(programme.prix_min_fcfa)} F CFA</span>
                    </div>
                  )}
                  {programme.prix_max_fcfa && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix max</span>
                      <span className="font-medium">{fmt(programme.prix_max_fcfa)} F CFA</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dates & Admin */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    Calendrier & Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {programme.date_lancement && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lancement</span>
                      <span>{new Date(programme.date_lancement).toLocaleDateString("fr-FR")}</span>
                    </div>
                  )}
                  {programme.date_livraison_prevue && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Livraison prévue</span>
                      <span>{new Date(programme.date_livraison_prevue).toLocaleDateString("fr-FR")}</span>
                    </div>
                  )}
                  {programme.date_livraison_effective && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Livraison effective</span>
                      <span>{new Date(programme.date_livraison_effective).toLocaleDateString("fr-FR")}</span>
                    </div>
                  )}
                  {programme.numero_acd && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">N° ACD</span>
                      <span className="font-mono text-xs">{programme.numero_acd}</span>
                    </div>
                  )}
                  {programme.numero_permis_construire && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Permis de construire</span>
                      <span className="font-mono text-xs">{programme.numero_permis_construire}</span>
                    </div>
                  )}
                  {programme.garantie_financiere_achevement && (
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <FileText className="h-3.5 w-3.5" />
                      GFA : {programme.nom_garant || "Oui"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Lots */}
          <TabsContent value="lots" className="mt-4">
            <LotsGrid
              programmeId={programme.id}
              onReserverLot={setReserverLot}
            />
          </TabsContent>

          {/* Réservations */}
          <TabsContent value="reservations" className="mt-4">
            <ReservationsList programmeId={programme.id} />
          </TabsContent>

          {/* Appels de fonds */}
          <TabsContent value="appels" className="mt-4">
            {reservations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Aucune réservation — les appels de fonds apparaîtront ici.
              </div>
            ) : (
              <div className="space-y-6">
                {reservations.map((res) => (
                  <Card key={res.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {res.client?.nom} {res.client?.prenoms}
                        <span className="text-muted-foreground font-normal">— Lot {res.lot?.reference_lot}</span>
                        <span className="ml-auto text-xs font-normal text-muted-foreground">
                          {fmt(res.prix_vente_fcfa)} F CFA
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EcheancierPaiement
                        reservationId={res.id}
                        prixTotal={res.prix_vente_fcfa}
                        clientNom={`${res.client?.nom || ""} ${res.client?.prenoms || ""}`.trim()}
                        clientTelephone={res.client?.telephone || ""}
                        programmeNom={programme.nom}
                        lotRef={res.lot?.reference_lot || ""}
                        numeroContrat={res.numero_contrat_reservation || ""}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Visites de chantier */}
          <TabsContent value="visites" className="mt-4">
            <VisitesChantier programmeId={programme.id} reservations={reservations} />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {canEdit && (
          <ProgrammeFormDialog open={editOpen} onOpenChange={setEditOpen} programme={programme} />
        )}
        {reserverLot && (
          <ReservationForm
            open={!!reserverLot}
            onOpenChange={(o) => !o && setReserverLot(null)}
            lot={reserverLot}
            programmeId={programme.id}
            programmeCommune={programme.commune}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
