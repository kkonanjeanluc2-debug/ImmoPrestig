import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import {
  useReservationsByProgramme,
  useUpdateReservationStatut,
  STATUT_RESERVATION_LABELS,
  type StatutReservation,
  type ReservationWithDetails,
} from "@/hooks/useReservationsLots";
import { StatutReservationBadge } from "./StatutBadge";
import { EcheancierPaiement } from "./EcheancierPaiement";
import { DocumentsClient } from "./DocumentsClient";

const fmt = (n: number) => n.toLocaleString("fr-FR");

const STATUTS_TRANSITION: StatutReservation[] = ["en_cours", "confirmee", "acte_signe", "annulee", "resiliee"];

interface Props {
  programmeId: string;
}

export function ReservationsList({ programmeId }: Props) {
  const { data: reservations = [], isLoading } = useReservationsByProgramme(programmeId);
  const updateStatut = useUpdateReservationStatut();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docsRes, setDocsRes] = useState<ReservationWithDetails | null>(null);

  const handleStatutChange = async (res: ReservationWithDetails, statut: StatutReservation) => {
    try {
      await updateStatut.mutateAsync({
        id: res.id,
        statut,
        programme_id: res.programme_id,
        lot_id: res.lot_id,
      });
      toast.success(`Statut mis à jour : ${STATUT_RESERVATION_LABELS[statut]}`);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Chargement...</div>;

  if (reservations.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Aucune réservation pour ce programme.</p>
        <p className="text-sm mt-1">Réservez un lot depuis l'onglet Lots.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Prix de vente</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>N° Contrat</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((res) => (
              <React.Fragment key={res.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expandedId === res.id ? null : res.id)}
                >
                  <TableCell className="font-medium">
                    {res.lot?.reference_lot || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{res.client?.nom} {res.client?.prenoms}</div>
                    <div className="text-xs text-muted-foreground">{res.client?.telephone}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(res.date_reservation).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {fmt(res.prix_vente_fcfa)} F
                  </TableCell>
                  <TableCell>
                    <StatutReservationBadge statut={res.statut} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {res.numero_contrat_reservation || "—"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDocsRes(res)}>
                          <FolderOpen className="h-3.5 w-3.5 mr-2" />
                          Gérer les documents
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {STATUTS_TRANSITION.filter((s) => s !== res.statut).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => handleStatutChange(res, s)}>
                            → {STATUT_RESERVATION_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {expandedId === res.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-muted/30 p-4">
                      <EcheancierPaiement
                        reservationId={res.id}
                        prixTotal={res.prix_vente_fcfa}
                        clientNom={`${res.client?.nom || ""} ${res.client?.prenoms || ""}`.trim()}
                        clientTelephone={res.client?.telephone || ""}
                        programmeNom={res.programme?.nom || ""}
                        lotRef={res.lot?.reference_lot || ""}
                        numeroContrat={res.numero_contrat_reservation || ""}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {docsRes && (
        <DocumentsClient
          reservationId={docsRes.id}
          clientNom={`${docsRes.client?.nom || ""} ${docsRes.client?.prenoms || ""}`.trim()}
          open={!!docsRes}
          onOpenChange={(o) => !o && setDocsRes(null)}
        />
      )}
    </div>
  );
}
