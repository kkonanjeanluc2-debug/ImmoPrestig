import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, FileCheck, Trash2, Eye } from "lucide-react";
import { useMutationsAchats, useDeleteMutationAchat, type MutationAchat } from "@/hooks/useMutationsAchats";
import { useAchatsImmobiliers } from "@/hooks/useAchatsImmobiliers";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { AddMutationDialog } from "./AddMutationDialog";
import { MutationDetailDialog } from "./MutationDetailDialog";

const STATUS_COLORS: Record<string, string> = {
  offre_creee: "bg-blue-100 text-blue-800",
  dossier_constitue: "bg-amber-100 text-amber-800",
  acte_signe: "bg-purple-100 text-purple-800",
  depot_notaire: "bg-orange-100 text-orange-800",
  mutation_enregistree: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS: Record<string, string> = {
  offre_creee: "Offre créée",
  dossier_constitue: "Dossier constitué",
  acte_signe: "Acte signé",
  depot_notaire: "Dépôt notaire",
  mutation_enregistree: "Mutation enregistrée",
};

const TYPE_LABELS: Record<string, string> = {
  vente: "Vente",
  donation: "Donation",
  heritage: "Héritage",
  transfert_lot: "Transfert de lot",
};

export function MutationsAchatList() {
  const { data: mutations, isLoading } = useMutationsAchats();
  const { data: achats = [] } = useAchatsImmobiliers();
  const { data: biens = [] } = useBiensAchat();
  const deleteMutation = useDeleteMutationAchat();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailMutation, setDetailMutation] = useState<MutationAchat | null>(null);

  // Achats sans mutation existante
  const achatsWithoutMutation = achats.filter(
    (a) => !mutations?.some((m) => m.achat_id === a.id)
  );

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Mutations foncières</h2>
        {achatsWithoutMutation.length > 0 && (
          <AddMutationDialog achats={achatsWithoutMutation} biens={biens}>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle mutation</Button>
          </AddMutationDialog>
        )}
      </div>

      {!mutations?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun dossier de mutation</p>
            <p className="text-sm text-muted-foreground mt-1">
              {achatsWithoutMutation.length > 0
                ? "Créez un dossier de mutation pour un achat finalisé"
                : "Finalisez d'abord un achat pour pouvoir créer une mutation"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mutations.map((mut) => {
            const bienTitle = mut.biens_achat?.title || "Bien inconnu";
            const totalCosts = (mut.droits_enregistrement || 0) + (mut.taxe_publicite || 0) + (mut.frais_fixes || 0) + (mut.frais_notariaux || 0);
            const docsCount = [mut.titre_propriete, mut.pieces_identite, mut.certificat_localisation, mut.etat_foncier, mut.situation_fiscale, mut.quittances_paiement].filter(Boolean).length;

            return (
              <Card key={mut.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold truncate flex-1">{bienTitle}</h3>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailMutation(mut)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(mut.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={STATUS_COLORS[mut.status] || ""}>{STATUS_LABELS[mut.status] || mut.status}</Badge>
                    <Badge variant="outline">{TYPE_LABELS[mut.type_mutation] || mut.type_mutation}</Badge>
                  </div>

                  {mut.biens_achat?.address && (
                    <p className="text-sm text-muted-foreground truncate">
                      {mut.biens_achat.address}{mut.biens_achat.city ? `, ${mut.biens_achat.city}` : ""}
                    </p>
                  )}

                  {mut.achats_immobiliers && (
                    <p className="text-sm font-medium mt-1">
                      Prix : {Number(mut.achats_immobiliers.sale_price).toLocaleString("fr-FR")} FCFA
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progression</span>
                      <span>{Math.round((Object.keys(STATUS_LABELS).indexOf(mut.status) + 1) / 5 * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${(Object.keys(STATUS_LABELS).indexOf(mut.status) + 1) / 5 * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span>📄 {docsCount}/6 documents</span>
                    {totalCosts > 0 && <span>💰 {totalCosts.toLocaleString("fr-FR")} FCFA</span>}
                  </div>

                  {mut.notaire_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      🏛️ Me {mut.notaire_name}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      {detailMutation && (
        <MutationDetailDialog
          mutation={detailMutation}
          open={!!detailMutation}
          onOpenChange={(o) => !o && setDetailMutation(null)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce dossier de mutation ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
