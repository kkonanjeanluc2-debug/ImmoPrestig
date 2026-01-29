import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, Users, Building2, Home, Clock, Map, Grid3X3, Layers, UserCheck } from "lucide-react";
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
import { useDeletedLotissements, useRestoreLotissement, usePermanentlyDeleteLotissement } from "@/hooks/useDeletedLotissements";
import { useDeletedParcelles, useRestoreParcelle, usePermanentlyDeleteParcelle } from "@/hooks/useDeletedParcelles";
import { useDeletedIlots, useRestoreIlot, usePermanentlyDeleteIlot } from "@/hooks/useDeletedIlots";
import { useDeletedProspects, useRestoreProspect, usePermanentlyDeleteProspect } from "@/hooks/useDeletedProspects";
import { useTrashCount } from "@/hooks/useTrashCount";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

const Trash = () => {
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
    type: "tenant" | "property" | "owner" | "lotissement" | "parcelle" | "ilot" | "prospect";
  } | null>(null);

  const { data: trashCount } = useTrashCount();
  const { data: deletedTenants, isLoading: loadingTenants } = useDeletedTenants();
  const { data: deletedProperties, isLoading: loadingProperties } = useDeletedProperties();
  const { data: deletedOwners, isLoading: loadingOwners } = useDeletedOwners();
  const { data: deletedLotissements, isLoading: loadingLotissements } = useDeletedLotissements();
  const { data: deletedParcelles, isLoading: loadingParcelles } = useDeletedParcelles();
  const { data: deletedIlots, isLoading: loadingIlots } = useDeletedIlots();
  const { data: deletedProspects, isLoading: loadingProspects } = useDeletedProspects();

  const restoreTenant = useRestoreTenant();
  const restoreProperty = useRestoreProperty();
  const restoreOwner = useRestoreOwner();
  const restoreLotissement = useRestoreLotissement();
  const restoreParcelle = useRestoreParcelle();
  const restoreIlot = useRestoreIlot();
  const restoreProspect = useRestoreProspect();
  const deleteTenant = usePermanentlyDeleteTenant();
  const deleteProperty = usePermanentlyDeleteProperty();
  const deleteOwner = usePermanentlyDeleteOwner();
  const deleteLotissement = usePermanentlyDeleteLotissement();
  const deleteParcelle = usePermanentlyDeleteParcelle();
  const deleteIlot = usePermanentlyDeleteIlot();
  const deleteProspect = usePermanentlyDeleteProspect();

  const { toast } = useToast();

  const handleRestore = async (id: string, name: string, type: "tenant" | "property" | "owner" | "lotissement" | "parcelle" | "ilot" | "prospect") => {
    try {
      if (type === "tenant") {
        await restoreTenant.mutateAsync({ id, name });
      } else if (type === "property") {
        await restoreProperty.mutateAsync({ id, title: name });
      } else if (type === "owner") {
        await restoreOwner.mutateAsync({ id, name });
      } else if (type === "lotissement") {
        await restoreLotissement.mutateAsync({ id, name });
      } else if (type === "parcelle") {
        await restoreParcelle.mutateAsync({ id, plotNumber: name });
      } else if (type === "ilot") {
        await restoreIlot.mutateAsync({ id, name });
      } else {
        await restoreProspect.mutateAsync({ id, name });
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
      } else if (confirmDelete.type === "owner") {
        await deleteOwner.mutateAsync({ id: confirmDelete.id, name: confirmDelete.name });
      } else if (confirmDelete.type === "lotissement") {
        await deleteLotissement.mutateAsync({ id: confirmDelete.id, name: confirmDelete.name });
      } else if (confirmDelete.type === "parcelle") {
        await deleteParcelle.mutateAsync({ id: confirmDelete.id, plotNumber: confirmDelete.name });
      } else if (confirmDelete.type === "ilot") {
        await deleteIlot.mutateAsync({ id: confirmDelete.id, name: confirmDelete.name });
      } else {
        await deleteProspect.mutateAsync({ id: confirmDelete.id, name: confirmDelete.name });
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

  const isRestoring = restoreTenant.isPending || restoreProperty.isPending || restoreOwner.isPending || restoreLotissement.isPending || restoreParcelle.isPending || restoreIlot.isPending || restoreProspect.isPending;
  const isDeleting = deleteTenant.isPending || deleteProperty.isPending || deleteOwner.isPending || deleteLotissement.isPending || deleteParcelle.isPending || deleteIlot.isPending || deleteProspect.isPending;

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
          <TabsList className="h-auto flex-wrap gap-1 p-1 w-full lg:w-auto">
            <TabsTrigger value="tenants" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Locataires</span>
              {trashCount && trashCount.tenants > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.tenants}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="properties" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Biens</span>
              {trashCount && trashCount.properties > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.properties}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="owners" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Propriétaires</span>
              {trashCount && trashCount.owners > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.owners}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="lotissements" className="gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Lotissements</span>
              {trashCount && trashCount.lotissements > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.lotissements}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="parcelles" className="gap-2">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Lots</span>
              {trashCount && trashCount.parcelles > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.parcelles}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ilots" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Îlots</span>
              {trashCount && trashCount.ilots > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.ilots}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="prospects" className="gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Prospects</span>
              {trashCount && trashCount.prospects > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount.prospects}
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

          {/* Lotissements Tab */}
          <TabsContent value="lotissements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Lotissements supprimés
                </CardTitle>
                <CardDescription>
                  {deletedLotissements?.length || 0} lotissement{(deletedLotissements?.length || 0) > 1 ? "s" : ""} dans la corbeille
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  {loadingLotissements ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">Chargement...</p>
                    </div>
                  ) : deletedLotissements && deletedLotissements.length > 0 ? (
                    <div className="space-y-3">
                      {deletedLotissements.map((lotissement) => (
                        <div
                          key={lotissement.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Map className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{lotissement.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {lotissement.location}, {lotissement.city}
                              </p>
                              {lotissement.deleted_at && (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Supprimé le {format(new Date(lotissement.deleted_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDaysRemaining(lotissement.deleted_at)}j restants
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(lotissement.id, lotissement.name, "lotissement")}
                              disabled={isRestoring}
                              className="gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete({ id: lotissement.id, name: lotissement.name, type: "lotissement" })}
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
                      <p className="text-muted-foreground">Aucun lotissement dans la corbeille</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parcelles Tab */}
          <TabsContent value="parcelles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Lots supprimés
                </CardTitle>
                <CardDescription>
                  {deletedParcelles?.length || 0} lot{(deletedParcelles?.length || 0) > 1 ? "s" : ""} dans la corbeille
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  {loadingParcelles ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">Chargement...</p>
                    </div>
                  ) : deletedParcelles && deletedParcelles.length > 0 ? (
                    <div className="space-y-3">
                      {deletedParcelles.map((parcelle) => (
                        <div
                          key={parcelle.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Grid3X3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">Lot {parcelle.plot_number}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {parcelle.lotissement?.name || "Lotissement inconnu"} • {parcelle.area} m² • {parcelle.price.toLocaleString("fr-FR")} F
                              </p>
                              {parcelle.deleted_at && (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Supprimé le {format(new Date(parcelle.deleted_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDaysRemaining(parcelle.deleted_at)}j restants
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(parcelle.id, `Lot ${parcelle.plot_number}`, "parcelle")}
                              disabled={isRestoring}
                              className="gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete({ id: parcelle.id, name: `Lot ${parcelle.plot_number}`, type: "parcelle" })}
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
                      <p className="text-muted-foreground">Aucun lot dans la corbeille</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ilots Tab */}
          <TabsContent value="ilots">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Îlots supprimés
                </CardTitle>
                <CardDescription>
                  {deletedIlots?.length || 0} îlot{(deletedIlots?.length || 0) > 1 ? "s" : ""} dans la corbeille
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  {loadingIlots ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">Chargement...</p>
                    </div>
                  ) : deletedIlots && deletedIlots.length > 0 ? (
                    <div className="space-y-3">
                      {deletedIlots.map((ilot) => (
                        <div
                          key={ilot.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Layers className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{ilot.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {ilot.lotissement?.name || "Lotissement inconnu"}
                                {ilot.plots_count && ` • ${ilot.plots_count} lots`}
                              </p>
                              {ilot.deleted_at && (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Supprimé le {format(new Date(ilot.deleted_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDaysRemaining(ilot.deleted_at)}j restants
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(ilot.id, ilot.name, "ilot")}
                              disabled={isRestoring}
                              className="gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete({ id: ilot.id, name: ilot.name, type: "ilot" })}
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
                      <p className="text-muted-foreground">Aucun îlot dans la corbeille</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prospects Tab */}
          <TabsContent value="prospects">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Prospects supprimés
                </CardTitle>
                <CardDescription>
                  {deletedProspects?.length || 0} prospect{(deletedProspects?.length || 0) > 1 ? "s" : ""} dans la corbeille
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  {loadingProspects ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">Chargement...</p>
                    </div>
                  ) : deletedProspects && deletedProspects.length > 0 ? (
                    <div className="space-y-3">
                      {deletedProspects.map((prospect) => (
                        <div
                          key={prospect.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{prospect.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {prospect.parcelle?.lotissement?.name || "Lotissement inconnu"}
                                {prospect.parcelle?.plot_number && ` • Lot ${prospect.parcelle.plot_number}`}
                                {prospect.phone && ` • ${prospect.phone}`}
                              </p>
                              {prospect.deleted_at && (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Supprimé le {format(new Date(prospect.deleted_at), "dd MMM yyyy", { locale: fr })}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {getDaysRemaining(prospect.deleted_at)}j restants
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(prospect.id, prospect.name, "prospect")}
                              disabled={isRestoring}
                              className="gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Restaurer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmDelete({ id: prospect.id, name: prospect.name, type: "prospect" })}
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
                      <p className="text-muted-foreground">Aucun prospect dans la corbeille</p>
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
