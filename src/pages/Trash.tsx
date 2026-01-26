import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, Users, Building2, Home, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useDeletedTenants, useRestoreTenant, usePermanentlyDeleteTenant } from "@/hooks/useDeletedTenants";
import { useDeletedProperties, useRestoreProperty, usePermanentlyDeleteProperty } from "@/hooks/useDeletedProperties";
import { useDeletedOwners, useRestoreOwner, usePermanentlyDeleteOwner } from "@/hooks/useDeletedOwners";
import { useTrashCount } from "@/hooks/useTrashCount";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const Trash = () => {
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
    type: "tenant" | "property" | "owner";
  } | null>(null);

  const { data: trashCount } = useTrashCount();
  const { data: deletedTenants, isLoading: loadingTenants } = useDeletedTenants();
  const { data: deletedProperties, isLoading: loadingProperties } = useDeletedProperties();
  const { data: deletedOwners, isLoading: loadingOwners } = useDeletedOwners();

  const restoreTenant = useRestoreTenant();
  const restoreProperty = useRestoreProperty();
  const restoreOwner = useRestoreOwner();
  const deleteTenant = usePermanentlyDeleteTenant();
  const deleteProperty = usePermanentlyDeleteProperty();
  const deleteOwner = usePermanentlyDeleteOwner();

  const { toast } = useToast();

  const handleRestore = async (id: string, name: string, type: "tenant" | "property" | "owner") => {
    try {
      if (type === "tenant") {
        await restoreTenant.mutateAsync({ id, name });
      } else if (type === "property") {
        await restoreProperty.mutateAsync({ id, title: name });
      } else {
        await restoreOwner.mutateAsync({ id, name });
      }
      toast({
        title: "Élément restauré",
        description: `${name} a été restauré avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de restaurer l'élément.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;

    try {
      if (confirmDelete.type === "tenant") {
        await deleteTenant.mutateAsync({ id: confirmDelete.id, name: confirmDelete.name });
      } else if (confirmDelete.type === "property") {
        await deleteProperty.mutateAsync({ id: confirmDelete.id, title: confirmDelete.name });
      } else {
        await deleteOwner.mutateAsync({ id: confirmDelete.id, name: confirmDelete.name });
      }
      toast({
        title: "Supprimé définitivement",
        description: `${confirmDelete.name} a été supprimé définitivement.`,
      });
      setConfirmDelete(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément.",
        variant: "destructive",
      });
    }
  };

  const getDaysRemaining = (deletedAt: string | null) => {
    if (!deletedAt) return 30;
    const daysElapsed = differenceInDays(new Date(), new Date(deletedAt));
    return Math.max(0, 30 - daysElapsed);
  };

  const isRestoring = restoreTenant.isPending || restoreProperty.isPending || restoreOwner.isPending;
  const isDeleting = deleteTenant.isPending || deleteProperty.isPending || deleteOwner.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-6 w-6" />
              Corbeille
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les éléments supprimés. Ils seront définitivement effacés après 30 jours.
            </p>
          </div>
          {trashCount && trashCount.total > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {trashCount.total} élément{trashCount.total > 1 ? "s" : ""} dans la corbeille
            </Badge>
          )}
        </div>

        {/* Warning Alert */}
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Clock className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Les éléments dans la corbeille sont automatiquement supprimés définitivement après 30 jours.
            Restaurez-les avant cette date si vous souhaitez les conserver.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="tenants" className="gap-2">
              <Users className="h-4 w-4" />
              Locataires
              {trashCount && trashCount.tenants > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.tenants}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="properties" className="gap-2">
              <Building2 className="h-4 w-4" />
              Biens
              {trashCount && trashCount.properties > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.properties}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="owners" className="gap-2">
              <Home className="h-4 w-4" />
              Propriétaires
              {trashCount && trashCount.owners > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.owners}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Locataires supprimés
                </CardTitle>
                <CardDescription>
                  {deletedTenants?.length || 0} locataire{(deletedTenants?.length || 0) > 1 ? "s" : ""} dans la corbeille
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  {loadingTenants ? (
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
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{tenant.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {tenant.email}
                              </p>
                              {tenant.deleted_at && (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Supprimé le {format(new Date(tenant.deleted_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDaysRemaining(tenant.deleted_at)}j restants
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(tenant.id, tenant.name, "tenant")}
                              disabled={isRestoring}
                              className="gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete({ id: tenant.id, name: tenant.name, type: "tenant" })}
                              disabled={isDeleting}
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
                      <p className="text-muted-foreground">Aucun locataire dans la corbeille</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Biens supprimés
                </CardTitle>
                <CardDescription>
                  {deletedProperties?.length || 0} bien{(deletedProperties?.length || 0) > 1 ? "s" : ""} dans la corbeille
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  {loadingProperties ? (
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
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Supprimé le {format(new Date(property.deleted_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDaysRemaining(property.deleted_at)}j restants
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(property.id, property.title, "property")}
                              disabled={isRestoring}
                              className="gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete({ id: property.id, name: property.title, type: "property" })}
                              disabled={isDeleting}
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
                      <p className="text-muted-foreground">Aucun bien dans la corbeille</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Owners Tab */}
          <TabsContent value="owners">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Propriétaires supprimés
                </CardTitle>
                <CardDescription>
                  {deletedOwners?.length || 0} propriétaire{(deletedOwners?.length || 0) > 1 ? "s" : ""} dans la corbeille
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  {loadingOwners ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">Chargement...</p>
                    </div>
                  ) : deletedOwners && deletedOwners.length > 0 ? (
                    <div className="space-y-3">
                      {deletedOwners.map((owner) => (
                        <div
                          key={owner.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{owner.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {owner.email}
                              </p>
                              {owner.deleted_at && (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Supprimé le {format(new Date(owner.deleted_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDaysRemaining(owner.deleted_at)}j restants
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(owner.id, owner.name, "owner")}
                              disabled={isRestoring}
                              className="gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete({ id: owner.id, name: owner.name, type: "owner" })}
                              disabled={isDeleting}
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
                      <p className="text-muted-foreground">Aucun propriétaire dans la corbeille</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer définitivement ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. <strong>{confirmDelete?.name}</strong> sera
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
    </DashboardLayout>
  );
};

export default Trash;
