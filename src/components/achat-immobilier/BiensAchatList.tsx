import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Plus, Loader2, Pencil, Trash2, Eye, MoreHorizontal, Navigation, FileText, FileDown } from "lucide-react";
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

const TYPE_COLORS: Record<string, string> = {
  appartement: "bg-blue-100 text-blue-700",
  maison: "bg-teal-100 text-teal-700",
  villa: "bg-violet-100 text-violet-700",
  terrain: "bg-lime-100 text-lime-700",
  bureau: "bg-orange-100 text-orange-700",
  commerce: "bg-pink-100 text-pink-700",
  immeuble: "bg-cyan-100 text-cyan-700",
  autre: "bg-gray-100 text-gray-700",
};

const TYPE_SHORT: Record<string, string> = {
  appartement: "Appart.",
  maison: "Maison",
  villa: "Villa",
  terrain: "Terrain",
  bureau: "Bureau",
  commerce: "Commerce",
  immeuble: "Immeuble",
  autre: "Autre",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  appartement: "Appartement", maison: "Maison à porte multiple", villa: "Villa", terrain: "Terrain",
  bureau: "Bureau", commerce: "Commerce", immeuble: "Immeuble", autre: "Autre",
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

  const activeMembers = members.filter(m => m.status === "active");

  const getProfileName = (userId: string | null) => {
    if (!userId) return "-";
    const member = activeMembers.find(m => m.user_id === userId);
    return member?.profile?.full_name || member?.profile?.email || "-";
  };

  const handleDelete = () => {
    if (!deleteBienId) return;
    deleteMutation.mutate(deleteBienId, {
      onSettled: () => setDeleteBienId(null),
    });
  };

  const getAgencyInfo = () => agency ? { name: agency.name, email: agency.email, phone: agency.phone || undefined, address: agency.address || undefined, city: agency.city || undefined, country: agency.country || undefined, logo_url: agency.logo_url, siret: agency.siret } : null;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const filteredBiens = biens?.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (typeFilter !== "all" && b.property_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Biens à acheter</h2>
          {canCreate && (
            <AddBienAchatDialog>
              <Button size="sm" className="shrink-0"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
            </AddBienAchatDialog>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
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
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bien</TableHead>
                <TableHead>Vendeur</TableHead>
                {isAdmin && <TableHead>Gestionnaire</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBiens.map((bien) => (
                <TableRow key={bien.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{bien.title}</p>
                      <p className="text-xs text-muted-foreground">{bien.address}{bien.city ? `, ${bien.city}` : ""}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {bien.vendeurs?.name || "-"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-sm">
                      {getProfileName(bien.assigned_to)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs font-medium ${TYPE_COLORS[bien.property_type] || ""}`}>
                      {TYPE_SHORT[bien.property_type] || bien.property_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(bien.price).toLocaleString("fr-FR")} FCFA
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-xs ${STATUS_COLORS[bien.status] || ""}`}>
                      {STATUS_LABELS[bien.status] || bien.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {bien.latitude && bien.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${bien.latitude},${bien.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Navigation className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </a>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditBien(bien)}
                          disabled={bienHasOffreOrAchat(bien.id)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canCreateDocs && (
                            <DropdownMenuItem onClick={() => setDocsBien(bien)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Documents
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => {
                            const bienOffres = offres.filter(o => o.bien_id === bien.id);
                            const bienAchat = achats.find(a => a.bien_id === bien.id) || null;
                            generateFicheRecapBien(bien, bienOffres, bienAchat, getAgencyInfo());
                          }}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Fiche récapitulative
                          </DropdownMenuItem>
                          {offres.filter(o => o.bien_id === bien.id).length > 0 && (
                            <DropdownMenuItem onClick={() => {
                              const lastOffre = offres.filter(o => o.bien_id === bien.id)[0];
                              const vendeurName = bien.vendeurs?.name || "Vendeur";
                              generateOffreAchatPDF(lastOffre, bien, vendeurName, getAgencyInfo());
                            }}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Offre d'achat
                            </DropdownMenuItem>
                          )}
                          {achats.some(a => a.bien_id === bien.id) && (
                            <DropdownMenuItem onClick={() => {
                              const bienAchat = achats.find(a => a.bien_id === bien.id)!;
                              const bienOffres = offres.filter(o => o.bien_id === bien.id);
                              const bienEcheances = echeances.filter(e => e.achat_id === bienAchat.id);
                              generateDossierAchatPDF(bien, bienOffres, bienAchat, bienEcheances, getAgencyInfo());
                            }}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Dossier d'achat complet
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteBienId(bien.id)}
                              disabled={bienHasOffreOrAchat(bien.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {docsBien && (
        <DocumentsAchatDialog bien={docsBien} open={!!docsBien} onOpenChange={(o) => !o && setDocsBien(null)} />
      )}
      {editBien && (
        <EditBienAchatDialog bien={editBien} open={!!editBien} onOpenChange={(o) => !o && setEditBien(null)} />
      )}
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
