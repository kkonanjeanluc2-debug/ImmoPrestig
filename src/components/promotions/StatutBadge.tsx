import { Badge } from "@/components/ui/badge";
import {
  STATUT_PROGRAMME_LABELS,
  STATUT_PROGRAMME_COLORS,
  STATUT_LOT_LABELS,
  STATUT_LOT_COLORS,
  type StatutProgramme,
  type StatutLot,
} from "@/hooks/usePromotionsImmobilieres";
import {
  STATUT_RESERVATION_LABELS,
  STATUT_RESERVATION_COLORS,
  type StatutReservation,
} from "@/hooks/useReservationsLots";
import {
  STATUT_PAIEMENT_LABELS,
  STATUT_PAIEMENT_COLORS,
  type StatutPaiement,
} from "@/hooks/useAppelsDeFonds";

export function StatutProgrammeBadge({ statut }: { statut: StatutProgramme }) {
  return (
    <Badge className={`text-xs border-0 ${STATUT_PROGRAMME_COLORS[statut]}`}>
      {STATUT_PROGRAMME_LABELS[statut]}
    </Badge>
  );
}

export function StatutLotBadge({ statut }: { statut: StatutLot }) {
  return (
    <Badge className={`text-xs border ${STATUT_LOT_COLORS[statut]}`}>
      {STATUT_LOT_LABELS[statut]}
    </Badge>
  );
}

export function StatutReservationBadge({ statut }: { statut: StatutReservation }) {
  return (
    <Badge className={`text-xs border-0 ${STATUT_RESERVATION_COLORS[statut]}`}>
      {STATUT_RESERVATION_LABELS[statut]}
    </Badge>
  );
}

export function StatutPaiementBadge({ statut }: { statut: StatutPaiement }) {
  return (
    <Badge className={`text-xs border-0 ${STATUT_PAIEMENT_COLORS[statut]}`}>
      {STATUT_PAIEMENT_LABELS[statut]}
    </Badge>
  );
}
