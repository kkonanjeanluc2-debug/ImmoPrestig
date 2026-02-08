import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Search, Phone, Mail, MoreHorizontal, Trash2, Calendar, Building2, Link } from "lucide-react";
import { useAllVenteProspects, useDeleteVenteProspect, useUpdateVenteProspect, type ProspectStatus, type InterestLevel } from "@/hooks/useVenteProspects";
import { useBiensVente } from "@/hooks/useBiensVente";
import { AddVenteProspectDialog } from "./AddVenteProspectDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  interesse: "Intéressé",
  negociation: "Négociation",
  perdu: "Perdu",
  converti: "Converti",
};

const statusColors: Record<ProspectStatus, string> = {
  nouveau: "bg-blue-100 text-blue-800",
  contacte: "bg-yellow-100 text-yellow-800",
  interesse: "bg-green-100 text-green-800",
  negociation: "bg-purple-100 text-purple-800",
  perdu: "bg-red-100 text-red-800",
  converti: "bg-emerald-100 text-emerald-800",
};

const interestLabels: Record<InterestLevel, string> = {
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
};

const interestColors: Record<InterestLevel, string> = {
  faible: "bg-gray-100 text-gray-800",
  moyen: "bg-orange-100 text-orange-800",
  eleve: "bg-green-100 text-green-800",
};

export function VenteProspectsTab() {
  const { data: prospects, isLoading } = useAllVenteProspects();
  const { data: biens } = useBiensVente();
  const deleteProspect = useDeleteVenteProspect();
  const updateProspect = useUpdateVenteProspect();
  const { canCreate, canDelete, hasPermission } = usePermissions();
  const canEdit = hasPermission("can_edit_ventes");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignBienDialogOpen, setAssignBienDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [selectedBienId, setSelectedBienId] = useState<string>("");

  const filteredProspects = prospects?.filter((prospect) => {
    const matchesSearch = 
      prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || prospect.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteProspect.mutateAsync({ id, name });
      toast.success("Prospect supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProspectStatus) => {
    try {
      await updateProspect.mutateAsync({ id, status: newStatus, last_contact_date: new Date().toISOString().split('T')[0] });
      toast.success("Statut mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAssignBien = async () => {
    if (!selectedProspect || !selectedBienId) return;
    try {
      await updateProspect.mutateAsync({ id: selectedProspect.id, bien_id: selectedBienId });
      toast.success("Bien associé au prospect");
      setAssignBienDialogOpen(false);
      setSelectedProspect(null);
      setSelectedBienId("");
    } catch (error) {
      toast.error("Erreur lors de l'association");
    }
  };

  const availableBiens = biens?.filter(b => b.status !== 'vendu') || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Prospects ({filteredProspects?.length || 0})
          </CardTitle>
          {canCreate && (
            <AddVenteProspectDialog>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un prospect
              </Button>
            </AddVenteProspectDialog>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher par nom, téléphone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProspects?.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun prospect trouvé</p>
            {canCreate && (
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des prospects intéressés par vos biens
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProspects?.map((prospect) => (
              <Card key={prospect.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{prospect.name}</p>
                        {prospect.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {prospect.phone}
                          </p>
                        )}
                        {prospect.email && (
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {prospect.email}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Assign bien option for prospects without a bien */}
                        {!(prospect as any).bien && canEdit && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedProspect(prospect);
                                setSelectedBienId("");
                                setAssignBienDialogOpen(true);
                              }}
                            >
                              <Link className="h-4 w-4 mr-2" />
                              Associer un bien
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(prospect.id, "contacte")}
                          disabled={prospect.status === "contacte"}
                        >
                          Marquer comme contacté
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(prospect.id, "interesse")}
                          disabled={prospect.status === "interesse"}
                        >
                          Marquer comme intéressé
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(prospect.id, "negociation")}
                          disabled={prospect.status === "negociation"}
                        >
                          En négociation
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(prospect.id, "converti")}
                          disabled={prospect.status === "converti"}
                        >
                          Converti (vendu)
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleStatusChange(prospect.id, "perdu")}
                          disabled={prospect.status === "perdu"}
                        >
                          Marquer comme perdu
                        </DropdownMenuItem>
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(prospect.id, prospect.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={statusColors[prospect.status as ProspectStatus]}>
                      {statusLabels[prospect.status as ProspectStatus]}
                    </Badge>
                    <Badge variant="outline" className={interestColors[prospect.interest_level as InterestLevel]}>
                      {interestLabels[prospect.interest_level as InterestLevel]}
                    </Badge>
                  </div>

                  {(prospect as any).bien ? (
                    <div className="mt-3 p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {(prospect as any).bien.title}
                      </p>
                      <p className="text-xs font-medium">
                        {new Intl.NumberFormat("fr-FR").format((prospect as any).bien.price)} F CFA
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Aucun bien associé
                      </p>
                      {canEdit && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs text-orange-600 dark:text-orange-400"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setSelectedBienId("");
                            setAssignBienDialogOpen(true);
                          }}
                        >
                          Associer un bien →
                        </Button>
                      )}
                    </div>
                  )}

                  {prospect.first_contact_date && (
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Premier contact: {format(new Date(prospect.first_contact_date), "d MMM yyyy", { locale: fr })}
                    </p>
                  )}

                  {prospect.budget_min || prospect.budget_max ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Budget: {prospect.budget_min ? `${new Intl.NumberFormat("fr-FR").format(prospect.budget_min)}` : "?"} 
                      {" - "}
                      {prospect.budget_max ? `${new Intl.NumberFormat("fr-FR").format(prospect.budget_max)} F CFA` : "?"}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog pour associer un bien à un prospect */}
      <Dialog open={assignBienDialogOpen} onOpenChange={setAssignBienDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associer un bien au prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un bien à associer à <strong>{selectedProspect?.name}</strong>
            </p>
            <Select value={selectedBienId} onValueChange={setSelectedBienId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>
              <SelectContent>
                {availableBiens.map((bien) => (
                  <SelectItem key={bien.id} value={bien.id}>
                    {bien.title} - {bien.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignBienDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAssignBien} disabled={!selectedBienId || updateProspect.isPending}>
                {updateProspect.isPending ? "Association..." : "Associer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
