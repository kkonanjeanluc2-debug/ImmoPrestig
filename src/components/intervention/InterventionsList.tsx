import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Wrench, Trash2, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  PropertyIntervention, 
  usePropertyInterventions, 
  useOwnerInterventions,
  useDeletePropertyIntervention 
} from "@/hooks/usePropertyInterventions";
import { usePermissions } from "@/hooks/usePermissions";
import { AddInterventionDialog } from "./AddInterventionDialog";
import { toast } from "sonner";

interface InterventionsListProps {
  propertyId?: string;
  ownerId?: string;
  showPropertyColumn?: boolean;
}

const typeLabels: Record<string, string> = {
  reparation: "Réparation",
  procedure: "Procédure",
  maintenance: "Maintenance",
  autre: "Autre",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  en_cours: { label: "En cours", variant: "default", icon: <Clock className="h-3 w-3" /> },
  termine: { label: "Terminé", variant: "secondary", icon: <CheckCircle className="h-3 w-3" /> },
  annule: { label: "Annulé", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  basse: { label: "Basse", className: "text-muted-foreground" },
  normale: { label: "Normale", className: "text-foreground" },
  haute: { label: "Haute", className: "text-amber-600" },
  urgente: { label: "Urgente", className: "text-destructive font-semibold" },
};

export function InterventionsList({ propertyId, ownerId, showPropertyColumn = false }: InterventionsListProps) {
  const { data: propertyInterventions, isLoading: propLoading } = usePropertyInterventions(propertyId);
  const { data: ownerInterventions, isLoading: ownerLoading } = useOwnerInterventions(ownerId);
  
  const interventions = ownerId ? ownerInterventions : propertyInterventions;
  const isLoading = ownerId ? ownerLoading : propLoading;

  const deleteIntervention = useDeletePropertyIntervention();
  const { canCreate, canDelete } = usePermissions();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer l'intervention "${title}" ?`)) return;
    try {
      await deleteIntervention.mutateAsync({ id, title });
      toast.success("Intervention supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.en_cours;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPriorityDisplay = (priority: string) => {
    const config = priorityConfig[priority] || priorityConfig.normale;
    return (
      <span className={config.className}>
        {priority === "urgente" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
        {config.label}
      </span>
    );
  };

  // Stats
  const stats = {
    total: interventions?.length || 0,
    enCours: interventions?.filter(i => i.status === "en_cours").length || 0,
    termine: interventions?.filter(i => i.status === "termine").length || 0,
    totalCost: interventions?.reduce((sum, i) => sum + (i.cost || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total interventions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.enCours}</p>
              <p className="text-sm text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.termine}</p>
              <p className="text-sm text-muted-foreground">Terminées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalCost.toLocaleString("fr-FR")} F</p>
              <p className="text-sm text-muted-foreground">Coût total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Interventions & Réparations
          </CardTitle>
          {canCreate && (
            <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle intervention
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : !interventions || interventions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune intervention enregistrée
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Intervention</TableHead>
                    {showPropertyColumn && <TableHead>Bien</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date début</TableHead>
                    <TableHead>Coût</TableHead>
                    <TableHead>Prestataire</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interventions.map((intervention: PropertyIntervention & { property_title?: string }) => (
                    <TableRow key={intervention.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{intervention.title}</p>
                          {intervention.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {intervention.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      {showPropertyColumn && (
                        <TableCell className="text-sm">
                          {intervention.property_title || "-"}
                        </TableCell>
                      )}
                      <TableCell>{typeLabels[intervention.type] || intervention.type}</TableCell>
                      <TableCell>{getPriorityDisplay(intervention.priority)}</TableCell>
                      <TableCell>{getStatusBadge(intervention.status)}</TableCell>
                      <TableCell>
                        {format(new Date(intervention.start_date), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {intervention.cost
                          ? `${intervention.cost.toLocaleString("fr-FR")} F`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {intervention.provider_name ? (
                          <div>
                            <p className="text-sm">{intervention.provider_name}</p>
                            {intervention.provider_phone && (
                              <p className="text-xs text-muted-foreground">{intervention.provider_phone}</p>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(intervention.id, intervention.title)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddInterventionDialog
        propertyId={propertyId}
        ownerId={ownerId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}
