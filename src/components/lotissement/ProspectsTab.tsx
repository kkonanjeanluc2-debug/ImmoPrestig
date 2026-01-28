import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Users,
  Target,
  AlertCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useLotissementProspects, useDeleteParcelleProspect, useUpdateParcelleProspect, ProspectStatus, InterestLevel, ParcelleProspect } from "@/hooks/useParcelleProspects";
import { useParcelles, Parcelle } from "@/hooks/useParcelles";
import { usePermissions } from "@/hooks/usePermissions";
import { AddProspectDialog } from "./AddProspectDialog";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { ConvertProspectDialog } from "./ConvertProspectDialog";

interface ProspectsTabProps {
  lotissementId: string;
  lotissementName: string;
}

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  contacte: { label: "Contacté", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  interesse: { label: "Intéressé", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  negociation: { label: "Négociation", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  perdu: { label: "Perdu", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  converti: { label: "Converti", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
};

const INTEREST_CONFIG: Record<InterestLevel, { label: string; color: string }> = {
  faible: { label: "Faible", color: "text-muted-foreground" },
  moyen: { label: "Moyen", color: "text-amber-600" },
  eleve: { label: "Élevé", color: "text-emerald-600" },
};

const STATUS_ORDER: ProspectStatus[] = ["nouveau", "contacte", "interesse", "negociation", "converti", "perdu"];

export function ProspectsTab({ lotissementId, lotissementName }: ProspectsTabProps) {
  const { data: prospects, isLoading } = useLotissementProspects(lotissementId);
  const { data: parcelles } = useParcelles(lotissementId);
  const deleteProspect = useDeleteParcelleProspect();
  const updateProspect = useUpdateParcelleProspect();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedParcelleId, setSelectedParcelleId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [convertingProspect, setConvertingProspect] = useState<ParcelleProspect | null>(null);

  const availableParcelles = parcelles?.filter(p => p.status === "disponible") || [];

  const filteredProspects = prospects?.filter(prospect => {
    const matchesSearch = prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || prospect.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getParcelleNumber = (parcelleId: string) => {
    return parcelles?.find(p => p.id === parcelleId)?.plot_number || "N/A";
  };

  const handleStatusChange = async (prospectId: string, newStatus: ProspectStatus) => {
    try {
      await updateProspect.mutateAsync({
        id: prospectId,
        status: newStatus,
        last_contact_date: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const prospect = prospects?.find(p => p.id === deletingId);
    try {
      await deleteProspect.mutateAsync({ id: deletingId, name: prospect?.name });
      toast.success("Prospect supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
    setDeletingId(null);
  };

  // Stats
  const stats = {
    total: prospects?.length || 0,
    nouveaux: prospects?.filter(p => p.status === "nouveau").length || 0,
    enCours: prospects?.filter(p => ["contacte", "interesse", "negociation"].includes(p.status)).length || 0,
    convertis: prospects?.filter(p => p.status === "converti").length || 0,
    followupsToday: prospects?.filter(p => {
      if (!p.next_followup_date) return false;
      const followupDate = new Date(p.next_followup_date);
      const today = new Date();
      return followupDate.toDateString() === today.toDateString();
    }).length || 0,
  };

  const getFollowupStatus = (date: string | null) => {
    if (!date) return null;
    const followupDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(followupDate, today)) {
      return "overdue";
    } else if (followupDate.toDateString() === today.toDateString()) {
      return "today";
    } else if (isBefore(followupDate, addDays(today, 3))) {
      return "soon";
    }
    return "future";
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.nouveaux}</p>
                <p className="text-xs text-muted-foreground">Nouveaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.enCours}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.convertis}</p>
                <p className="text-xs text-muted-foreground">Convertis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.followupsToday}</p>
                <p className="text-xs text-muted-foreground">Suivis aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Liste des prospects</CardTitle>
              <CardDescription>
                Gérez vos prospects pour le lotissement {lotissementName}
              </CardDescription>
            </div>
            {canCreate && availableParcelles.length > 0 && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedParcelleId || ""}
                  onValueChange={(value) => setSelectedParcelleId(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Choisir une parcelle" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParcelles.map((parcelle) => (
                      <SelectItem key={parcelle.id} value={parcelle.id}>
                        Lot {parcelle.plot_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  disabled={!selectedParcelleId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, téléphone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {prospects?.length === 0
                ? "Aucun prospect enregistré. Sélectionnez une parcelle et cliquez sur Ajouter."
                : "Aucun prospect trouvé avec ces critères."}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Intérêt</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prochain suivi</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.map((prospect) => {
                    const followupStatus = getFollowupStatus(prospect.next_followup_date);
                    return (
                      <TableRow key={prospect.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{prospect.name}</p>
                            {prospect.source && (
                              <p className="text-xs text-muted-foreground capitalize">
                                {prospect.source}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            Lot {getParcelleNumber(prospect.parcelle_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {prospect.phone && (
                              <WhatsAppButton
                                phone={prospect.phone}
                                message={`Bonjour ${prospect.name}, concernant le lot ${getParcelleNumber(prospect.parcelle_id)} du lotissement ${lotissementName}...`}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              />
                            )}
                            {prospect.email && (
                              <a
                                href={`mailto:${prospect.email}`}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Mail className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${INTEREST_CONFIG[prospect.interest_level].color}`}>
                            {INTEREST_CONFIG[prospect.interest_level].label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Select
                              value={prospect.status}
                              onValueChange={(value) => handleStatusChange(prospect.id, value as ProspectStatus)}
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_ORDER.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {STATUS_CONFIG[status].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={STATUS_CONFIG[prospect.status].color}>
                              {STATUS_CONFIG[prospect.status].label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {prospect.next_followup_date ? (
                            <div className={cn(
                              "flex items-center gap-1 text-sm",
                              followupStatus === "overdue" && "text-red-600",
                              followupStatus === "today" && "text-orange-600",
                              followupStatus === "soon" && "text-amber-600"
                            )}>
                              <Calendar className="h-3 w-3" />
                              {format(new Date(prospect.next_followup_date), "dd/MM/yyyy")}
                              {followupStatus === "overdue" && (
                                <AlertCircle className="h-3 w-3" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && prospect.status !== "converti" && prospect.status !== "perdu" && (
                                <DropdownMenuItem
                                  onClick={() => setConvertingProspect(prospect)}
                                  className="text-emerald-600"
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Convertir en vente
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeletingId(prospect.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Prospect Dialog */}
      {selectedParcelleId && (
        <AddProspectDialog
          parcelleId={selectedParcelleId}
          parcelleName={availableParcelles.find(p => p.id === selectedParcelleId)?.plot_number || ""}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Sale Dialog */}
      {convertingProspect && (
        <ConvertProspectDialog
          prospect={convertingProspect}
          parcelle={parcelles?.find(p => p.id === convertingProspect.parcelle_id)!}
          open={!!convertingProspect}
          onOpenChange={(open) => !open && setConvertingProspect(null)}
        />
      )}
    </div>
  );
}
