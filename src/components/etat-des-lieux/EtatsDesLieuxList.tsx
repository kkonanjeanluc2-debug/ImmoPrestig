import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, MoreHorizontal, Trash2, ArrowRightLeft, FileText } from "lucide-react";
import { EtatDesLieux, useDeleteEtatDesLieux } from "@/hooks/useEtatsDesLieux";
import { useState } from "react";
import { ViewEtatDesLieuxDialog } from "./ViewEtatDesLieuxDialog";
import { CompareEtatsDesLieuxDialog } from "./CompareEtatsDesLieuxDialog";

interface EtatsDesLieuxListProps {
  etats: EtatDesLieux[];
  isLoading: boolean;
}

const typeLabels: Record<string, string> = {
  entree: "Entrée",
  sortie: "Sortie",
};

const typeColors: Record<string, string> = {
  entree: "bg-blue-500",
  sortie: "bg-orange-500",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  signed: "Signé",
  completed: "Finalisé",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  signed: "bg-yellow-500",
  completed: "bg-green-500",
};

const conditionLabels: Record<string, string> = {
  excellent: "Excellent",
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
};

export function EtatsDesLieuxList({ etats, isLoading }: EtatsDesLieuxListProps) {
  const [viewingEtat, setViewingEtat] = useState<EtatDesLieux | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  
  const deleteEtatDesLieux = useDeleteEtatDesLieux();

  const entryEtat = etats.find(e => e.type === "entree");
  const exitEtat = etats.find(e => e.type === "sortie");
  const canCompare = entryEtat && exitEtat;

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteEtatDesLieux.mutateAsync(deleteId);
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (etats.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucun état des lieux enregistré pour ce locataire.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {canCompare && (
            <div className="p-4 border-b bg-muted/50">
              <Button onClick={() => setShowCompare(true)} variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Comparer entrée / sortie
              </Button>
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>État général</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {etats.map((etat) => (
                <TableRow key={etat.id}>
                  <TableCell>
                    <Badge className={`${typeColors[etat.type]} text-white`}>
                      {typeLabels[etat.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(etat.inspection_date), "dd MMMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {etat.general_condition ? conditionLabels[etat.general_condition] : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${statusColors[etat.status]} text-white border-0`}>
                      {statusLabels[etat.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingEtat(etat)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(etat.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {viewingEtat && (
        <ViewEtatDesLieuxDialog
          etat={viewingEtat}
          open={!!viewingEtat}
          onOpenChange={(open) => !open && setViewingEtat(null)}
        />
      )}

      {canCompare && (
        <CompareEtatsDesLieuxDialog
          entryEtat={entryEtat}
          exitEtat={exitEtat}
          open={showCompare}
          onOpenChange={setShowCompare}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet état des lieux ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'état des lieux sera définitivement supprimé.
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
    </>
  );
}
