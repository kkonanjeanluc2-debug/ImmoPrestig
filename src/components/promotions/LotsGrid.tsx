import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useLotsByProgramme,
  useDeleteLot,
  STATUT_LOT_LABELS,
  STATUT_LOT_COLORS,
  TYPE_BIEN_LABELS,
  type LotProgramme,
  type StatutLot,
} from "@/hooks/usePromotionsImmobilieres";
import { LotFormDialog } from "./LotFormDialog";
import { usePermissions } from "@/hooks/usePermissions";

const fmt = (n: number) => n.toLocaleString("fr-FR");

const ALL_STATUTS: StatutLot[] = ["disponible", "reserve", "vendu", "indisponible"];

interface Props {
  programmeId: string;
  onReserverLot?: (lot: LotProgramme) => void;
}

export function LotsGrid({ programmeId, onReserverLot }: Props) {
  const { data: lots = [], isLoading } = useLotsByProgramme(programmeId);
  const deleteLot = useDeleteLot();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("can_edit_biens_vente");

  const [filterStatut, setFilterStatut] = useState<StatutLot | "tous">("tous");
  const [createOpen, setCreateOpen] = useState(false);
  const [editLot, setEditLot] = useState<LotProgramme | null>(null);

  const filtered = filterStatut === "tous" ? lots : lots.filter((l) => l.statut === filterStatut);

  const handleDelete = async (lot: LotProgramme) => {
    if (!confirm(`Supprimer le lot ${lot.reference_lot} ?`)) return;
    try {
      await deleteLot.mutateAsync({ id: lot.id, programme_id: lot.programme_id });
      toast.success("Lot supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Chargement des lots...</div>;

  return (
    <div className="space-y-4">
      {/* Filtres + bouton */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={filterStatut === "tous" ? "default" : "outline"}
            onClick={() => setFilterStatut("tous")}
            className="h-7 text-xs"
          >
            Tous ({lots.length})
          </Button>
          {ALL_STATUTS.map((s) => {
            const count = lots.filter((l) => l.statut === s).length;
            return (
              <Button
                key={s}
                size="sm"
                variant={filterStatut === s ? "default" : "outline"}
                onClick={() => setFilterStatut(s)}
                className="h-7 text-xs"
              >
                {STATUT_LOT_LABELS[s]} ({count})
              </Button>
            );
          })}
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un lot
          </Button>
        )}
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>Aucun lot{filterStatut !== "tous" ? ` "${STATUT_LOT_LABELS[filterStatut]}"` : ""}</p>
          {canEdit && filterStatut === "tous" && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Créer le premier lot
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((lot) => (
            <div
              key={lot.id}
              className={`relative rounded-lg border-2 p-3 space-y-1.5 transition-shadow hover:shadow-sm ${
                lot.statut === "disponible"
                  ? "border-emerald-200 bg-emerald-50/50"
                  : lot.statut === "reserve"
                  ? "border-blue-200 bg-blue-50/50"
                  : lot.statut === "vendu"
                  ? "border-gray-300 bg-gray-50/50"
                  : "border-red-200 bg-red-50/50"
              }`}
            >
              <div className="font-semibold text-sm truncate">{lot.reference_lot}</div>
              <div className="text-xs text-muted-foreground">{TYPE_BIEN_LABELS[lot.type_bien]}</div>
              {lot.superficie_m2 && (
                <div className="text-xs text-muted-foreground">{lot.superficie_m2} m²</div>
              )}
              <div className="text-xs font-medium">{fmt(lot.prix_fcfa)} F</div>
              <Badge className={`text-[10px] border ${STATUT_LOT_COLORS[lot.statut]}`}>
                {STATUT_LOT_LABELS[lot.statut]}
              </Badge>

              {/* Actions */}
              <div className="flex gap-1 pt-1">
                {lot.statut === "disponible" && onReserverLot && (
                  <Button
                    size="sm"
                    className="h-6 text-[10px] px-2 flex-1"
                    onClick={() => onReserverLot(lot)}
                  >
                    Réserver
                  </Button>
                )}
                {canEdit && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setEditLot(lot)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {lot.statut === "disponible" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(lot)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LotFormDialog open={createOpen} onOpenChange={setCreateOpen} programmeId={programmeId} />
      {editLot && (
        <LotFormDialog
          open={!!editLot}
          onOpenChange={(o) => !o && setEditLot(null)}
          programmeId={programmeId}
          lot={editLot}
        />
      )}
    </div>
  );
}
