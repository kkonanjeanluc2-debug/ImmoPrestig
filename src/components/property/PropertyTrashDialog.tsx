import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDeletedProperties, useRestoreProperty, usePermanentlyDeleteProperty } from "@/hooks/useDeletedProperties";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Property } from "@/hooks/useProperties";

interface PropertyTrashDialogProps {
  trigger?: React.ReactNode;
}

export function PropertyTrashDialog({ trigger }: PropertyTrashDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string>("");
  
  const { data: deletedProperties, isLoading } = useDeletedProperties();
  const restoreMutation = useRestoreProperty();
  const permanentDeleteMutation = usePermanentlyDeleteProperty();
  const { toast } = useToast();

  const handleRestore = async (property: Property) => {
    try {
      await restoreMutation.mutateAsync({ id: property.id, title: property.title });
      toast({
        title: "Bien restauré",
        description: `${property.title} a été restauré avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de restaurer le bien.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDeleteId) return;
    
    try {
      await permanentDeleteMutation.mutateAsync({ 
        id: confirmDeleteId, 
        title: confirmDeleteTitle 
      });
      toast({
        title: "Bien supprimé définitivement",
        description: `${confirmDeleteTitle} a été supprimé définitivement.`,
      });
      setConfirmDeleteId(null);
      setConfirmDeleteTitle("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bien.",
        variant: "destructive",
      });
    }
  };

  const deletedCount = deletedProperties?.length || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Corbeille
              {deletedCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {deletedCount}
                </Badge>
              )}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Corbeille des biens
            </DialogTitle>
            <DialogDescription>
              Biens supprimés récemment. Vous pouvez les restaurer ou les supprimer définitivement.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : deletedProperties && deletedProperties.length > 0 ? (
              <div className="space-y-3">
                {deletedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{property.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {property.address}
                        </p>
                        {property.deleted_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Supprimé le {format(new Date(property.deleted_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(property)}
                        disabled={restoreMutation.isPending}
                        className="gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restaurer
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setConfirmDeleteId(property.id);
                          setConfirmDeleteTitle(property.title);
                        }}
                        disabled={permanentDeleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">La corbeille est vide</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Les biens supprimés apparaîtront ici
                </p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={!!confirmDeleteId} 
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer définitivement ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bien <strong>{confirmDeleteTitle}</strong> sera
              supprimé définitivement et ne pourra plus être récupéré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
