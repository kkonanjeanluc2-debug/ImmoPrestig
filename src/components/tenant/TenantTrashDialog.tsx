import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
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
import { useDeletedTenants, useRestoreTenant, usePermanentlyDeleteTenant } from "@/hooks/useDeletedTenants";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TenantWithDetails } from "@/hooks/useTenants";

interface TenantTrashDialogProps {
  trigger?: React.ReactNode;
}

export function TenantTrashDialog({ trigger }: TenantTrashDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  
  const { data: deletedTenants, isLoading } = useDeletedTenants();
  const restoreMutation = useRestoreTenant();
  const permanentDeleteMutation = usePermanentlyDeleteTenant();
  const { toast } = useToast();

  const handleRestore = async (tenant: TenantWithDetails) => {
    try {
      await restoreMutation.mutateAsync({ id: tenant.id, name: tenant.name });
      toast({
        title: "Locataire restauré",
        description: `${tenant.name} a été restauré avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de restaurer le locataire.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDeleteId) return;
    
    try {
      await permanentDeleteMutation.mutateAsync({ 
        id: confirmDeleteId, 
        name: confirmDeleteName 
      });
      toast({
        title: "Locataire supprimé définitivement",
        description: `${confirmDeleteName} a été supprimé définitivement.`,
      });
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le locataire.",
        variant: "destructive",
      });
    }
  };

  const deletedCount = deletedTenants?.length || 0;

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
              Corbeille des locataires
            </DialogTitle>
            <DialogDescription>
              Locataires supprimés récemment. Vous pouvez les restaurer ou les supprimer définitivement.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : deletedTenants && deletedTenants.length > 0 ? (
              <div className="space-y-3">
                {deletedTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{tenant.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {tenant.email}
                      </p>
                      {tenant.deleted_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Supprimé le {format(new Date(tenant.deleted_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(tenant)}
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
                          setConfirmDeleteId(tenant.id);
                          setConfirmDeleteName(tenant.name);
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
                  Les locataires supprimés apparaîtront ici
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
              Cette action est irréversible. Le locataire <strong>{confirmDeleteName}</strong> sera
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
