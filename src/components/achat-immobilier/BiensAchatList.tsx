import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Plus, MapPin, Loader2, UserX, Navigation, Pencil, Trash2, FileText, FileDown, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBiensAchat, useUpdateBienAchat, useDeleteBienAchat, type BienAchat } from "@/hooks/useBiensAchat";
import { useVendeurs } from "@/hooks/useVendeurs";
import { useOffresAchat } from "@/hooks/useOffresAchat";
import { useAchatsImmobiliers } from "@/hooks/useAchatsImmobiliers";
import { useEcheancesAchats } from "@/hooks/useEcheancesAchats";
import { useAgency } from "@/hooks/useAgency";
import { useAgencyMembers } from "@/hooks/useAgencyMembers";
import { usePermissions } from "@/hooks/usePermissions";
import { AddBienAchatDialog } from "./AddBienAchatDialog";
import { EditBienAchatDialog } from "./EditBienAchatDialog";
import { DocumentsAchatDialog } from "./DocumentsAchatDialog";
import { generateFicheRecapBien, generateOffreAchatPDF, generateDossierAchatPDF } from "@/lib/generateAchatPDF";


const STATUS_COLORS: Record<string, string> = {
  
  en_negociation: "bg-amber-100 text-amber-800",
  offre_faite: "bg-purple-100 text-purple-800",
  sous_compromis: "bg-orange-100 text-orange-800",
  achete: "bg-emerald-100 text-emerald-800",
  abandonne: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  
  en_negociation: "En négociation",
  offre_faite: "Offre faite",
  sous_compromis: "Sous compromis",
  achete: "Acheté",
  abandonne: "Abandonné",
};

export function BiensAchatList() {
  const { data: biens, isLoading } = useBiensAchat();
  const { data: vendeurs = [] } = useVendeurs();
  const { data: offres = [] } = useOffresAchat();
  const { data: achats = [] } = useAchatsImmobiliers();
  const { data: echeances = [] } = useEcheancesAchats();
  const { data: agency } = useAgency();
  const { data: members = [] } = useAgencyMembers();
  const { hasPermission, role } = usePermissions();
  const updateMutation = useUpdateBienAchat();
  const deleteMutation = useDeleteBienAchat();

  const isAdmin = role === "admin" || role === "super_admin";
  const canCreate = hasPermission("can_create_achats");
  const canEdit = hasPermission("can_edit_achats");
  const canDelete = hasPermission("can_delete_achats");
  const canCreateDocs = hasPermission("can_create_achats_documents");

  const bienHasOffreOrAchat = (bienId: string) => {
    const hasOffre = offres.some(o => o.bien_id === bienId && o.status !== "refusee" && o.status !== "expiree");
    const hasAchat = achats.some(a => a.bien_id === bienId);
    return hasOffre || hasAchat;
  };

  const [editBien, setEditBien] = useState<BienAchat | null>(null);
  const [deleteBienId, setDeleteBienId] = useState<string | null>(null);
  const [docsBien, setDocsBien] = useState<BienAchat | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const handleVendeurChange = (bienId: string, vendeurId: string) => {
    const bien = biens?.find((b) => b.id === bienId);
    if (!bien) return;
    updateMutation.mutate({
      id: bienId,
      title: bien.title,
      property_type: bien.property_type,
      address: bien.address,
      price: bien.price,
      vendeur_id: vendeurId === "__none__" ? undefined : vendeurId,
    });
  };

  const handleAssignChange = (bienId: string, userId: string) => {
    updateMutation.mutate({
      id: bienId,
      assigned_to: userId === "__none__" ? null : userId,
    });
  };

  const activeMembers = members.filter(m => m.status === "active");

  const handleDelete = () => {
    if (!deleteBienId) return;
    deleteMutation.mutate(deleteBienId, {
      onSettled: () => setDeleteBienId(null),
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const PROPERTY_TYPE_LABELS: Record<string, string> = {
    appartement: "Appartement", maison: "Maison à porte multiple", villa: "Villa", terrain: "Terrain",
    bureau: "Bureau", commerce: "Commerce", immeuble: "Immeuble", autre: "Autre",
  };

  const filteredBiens = biens?.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (typeFilter !== "all" && b.property_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Biens à acheter</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate && (
            <AddBienAchatDialog>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter un bien</Button>
            </AddBienAchatDialog>
          )}
        </div>
      </div>

      {!filteredBiens?.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{statusFilter === "all" ? "Aucun bien prospecté" : `Aucun bien avec le statut "${STATUS_LABELS[statusFilter]}"`}</p>
            <p className="text-sm text-muted-foreground mt-1">Commencez par ajouter un bien à acheter</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBiens.map((bien) => (
            <Card key={bien.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold truncate flex-1">{bien.title}</h3>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {canEdit && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditBien(bien)} disabled={bienHasOffreOrAchat(bien.id)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {bienHasOffreOrAchat(bien.id) && <TooltipContent>Ce bien est lié à une offre ou un achat</TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {canDelete && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteBienId(bien.id)} disabled={bienHasOffreOrAchat(bien.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {bienHasOffreOrAchat(bien.id) && <TooltipContent>Ce bien est lié à une offre ou un achat</TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                </div>
                <Badge className={STATUS_COLORS[bien.status] || ""}>{STATUS_LABELS[bien.status] || bien.status}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2 mb-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{bien.address}{bien.city ? `, ${bien.city}` : ""}</span>
                </div>
                <p className="text-lg font-bold text-primary">
                  {Number(bien.price).toLocaleString("fr-FR")} FCFA
                </p>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  {bien.area && <span>{bien.area} m²</span>}
                  {bien.bedrooms && <span>{bien.bedrooms} ch.</span>}
                  {bien.bathrooms && <span>{bien.bathrooms} sdb</span>}
                </div>

                {bien.latitude && bien.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${bien.latitude},${bien.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
                  >
                    <Navigation className="h-3 w-3" />
                    Itinéraire Google Maps
                  </a>
                )}

                {canEdit && (
                  <div className="mt-3 pt-3 border-t">
                    <label className="text-xs text-muted-foreground mb-1 block">Vendeur</label>
                    <Select
                      value={bien.vendeur_id || "__none__"}
                      onValueChange={(v) => handleVendeurChange(bien.id, v)}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Aucun vendeur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <UserX className="h-3 w-3" /> Aucun vendeur
                          </span>
                        </SelectItem>
                        {vendeurs.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Gestionnaire assignment - admin only */}
                {isAdmin && activeMembers.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Gestionnaire assigné
                    </label>
                    <Select
                      value={bien.assigned_to || "__none__"}
                      onValueChange={(v) => handleAssignChange(bien.id, v)}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Non assigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <UserX className="h-3 w-3" /> Non assigné
                          </span>
                        </SelectItem>
                        {activeMembers.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.profile?.full_name || m.profile?.email || "Membre"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Documents & PDF buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {canCreateDocs && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setDocsBien(bien)}>
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Documents
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <FileDown className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        const bienOffres = offres.filter(o => o.bien_id === bien.id);
                        const bienAchat = achats.find(a => a.bien_id === bien.id) || null;
                        const agencyInfo = agency ? { name: agency.name, email: agency.email, phone: agency.phone || undefined, address: agency.address || undefined } : null;
                        generateFicheRecapBien(bien, bienOffres, bienAchat, agencyInfo);
                      }}>
                        Fiche récapitulative
                      </DropdownMenuItem>
                      {offres.filter(o => o.bien_id === bien.id).length > 0 && (
                        <DropdownMenuItem onClick={() => {
                          const lastOffre = offres.filter(o => o.bien_id === bien.id)[0];
                          const vendeurName = bien.vendeurs?.name || "Vendeur";
                          const agencyInfo = agency ? { name: agency.name, email: agency.email, phone: agency.phone || undefined, address: agency.address || undefined } : null;
                          generateOffreAchatPDF(lastOffre, bien, vendeurName, agencyInfo);
                        }}>
                          Offre d'achat
                        </DropdownMenuItem>
                      )}
                      {achats.some(a => a.bien_id === bien.id) && (
                        <DropdownMenuItem onClick={() => {
                          const bienAchat = achats.find(a => a.bien_id === bien.id)!;
                          const bienOffres = offres.filter(o => o.bien_id === bien.id);
                          const bienEcheances = echeances.filter(e => e.achat_id === bienAchat.id);
                          const agencyInfo = agency ? { name: agency.name, email: agency.email, phone: agency.phone || undefined, address: agency.address || undefined } : null;
                          generateDossierAchatPDF(bien, bienOffres, bienAchat, bienEcheances, agencyInfo);
                        }}>
                          Dossier d'achat complet
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documents dialog */}
      {docsBien && (
        <DocumentsAchatDialog bien={docsBien} open={!!docsBien} onOpenChange={(o) => !o && setDocsBien(null)} />
      )}

      {/* Edit dialog */}
      {editBien && (
        <EditBienAchatDialog bien={editBien} open={!!editBien} onOpenChange={(o) => !o && setEditBien(null)} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteBienId} onOpenChange={(o) => !o && setDeleteBienId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce bien sera déplacé dans la corbeille. Vous pourrez le restaurer dans les 30 jours.
            </AlertDialogDescription>
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
