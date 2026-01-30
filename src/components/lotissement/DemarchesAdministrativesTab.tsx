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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ClipboardList,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Building2,
  MoreVertical,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDemarchesAdministratives, useDeleteDemarcheAdministrative } from "@/hooks/useDemarchesAdministratives";
import { usePermissions } from "@/hooks/usePermissions";
import { AddDemarcheDialog } from "./AddDemarcheDialog";
import { toast } from "sonner";

interface DemarchesAdministrativesTabProps {
  lotissementId: string;
  lotissementName: string;
}

const demarcheTypeLabels: Record<string, string> = {
  demande_titre: "Demande de titre",
  bornage: "Bornage",
  certificat: "Certificat",
  reclamation: "Réclamation",
  visite_terrain: "Visite terrain",
  autre: "Autre",
};

const authorityLabels: Record<string, string> = {
  mairie: "Mairie",
  prefecture: "Préfecture",
  ministere: "Ministère",
  cadastre: "Cadastre",
  tribunal: "Tribunal",
  autre: "Autre",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  en_cours: { label: "En cours", variant: "default", icon: <Clock className="h-3 w-3" /> },
  termine: { label: "Terminé", variant: "secondary", icon: <CheckCircle className="h-3 w-3" /> },
  en_attente: { label: "En attente", variant: "outline", icon: <Pause className="h-3 w-3" /> },
  rejete: { label: "Rejeté", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export function DemarchesAdministrativesTab({ lotissementId, lotissementName }: DemarchesAdministrativesTabProps) {
  const { data: demarches, isLoading } = useDemarchesAdministratives(lotissementId);
  const deleteDemarche = useDeleteDemarcheAdministrative();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer la démarche "${title}" ?`)) return;
    try {
      await deleteDemarche.mutateAsync({ id, title });
      toast.success("Démarche supprimée");
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

  // Stats
  const stats = {
    total: demarches?.length || 0,
    enCours: demarches?.filter(d => d.status === "en_cours").length || 0,
    termine: demarches?.filter(d => d.status === "termine").length || 0,
    enAttente: demarches?.filter(d => d.status === "en_attente").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total démarches</p>
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
              <p className="text-2xl font-bold text-amber-600">{stats.enAttente}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Historique des démarches
          </CardTitle>
          {canCreate && (
            <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle démarche
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : !demarches || demarches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune démarche administrative enregistrée
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Démarche</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Autorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead>Coût</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demarches.map((demarche) => (
                  <TableRow key={demarche.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{demarche.title}</p>
                        {demarche.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {demarche.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{demarcheTypeLabels[demarche.type] || demarche.type}</TableCell>
                    <TableCell>
                      {demarche.authority && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {authorityLabels[demarche.authority] || demarche.authority}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(demarche.status)}</TableCell>
                    <TableCell>
                      {format(new Date(demarche.start_date), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {demarche.end_date
                        ? format(new Date(demarche.end_date), "dd MMM yyyy", { locale: fr })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {demarche.cost
                        ? `${demarche.cost.toLocaleString("fr-FR")} F`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {(canEdit || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem disabled>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(demarche.id, demarche.title)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <AddDemarcheDialog
        lotissementId={lotissementId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}
