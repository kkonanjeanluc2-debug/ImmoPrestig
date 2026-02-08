import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AddBienVenteDialog } from "@/components/vente-immobiliere/AddBienVenteDialog";
import { BiensVenteList } from "@/components/vente-immobiliere/BiensVenteList";
import { VentesImmobilieresList } from "@/components/vente-immobiliere/VentesImmobileresList";
import { EcheancesVentesTabContent } from "@/components/vente-immobiliere/EcheancesVentesTabContent";
import { VentesDashboard } from "@/components/vente-immobiliere/VentesDashboard";
import { VenteProspectsTab } from "@/components/vente-immobiliere/VenteProspectsTab";
import { AcquereurDetailsDialog } from "@/components/vente-immobiliere/AcquereurDetailsDialog";
import { BiensVenteAssignmentsTab } from "@/components/vente-immobiliere/BiensVenteAssignmentsTab";
import { Building2, Receipt, Calendar, Plus, Users, UserSearch, UserCheck } from "lucide-react";
import { useAcquereurs } from "@/hooks/useAcquereurs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";

export default function VentesImmobilieres() {
  const [activeTab, setActiveTab] = useState("biens");
  const { data: acquereurs } = useAcquereurs();
  const { hasPermission, role, isLoading: isLoadingPermissions } = usePermissions();
  const { isAdmin } = useIsAgencyOwner();
  const canCreateBien = hasPermission("can_create_biens_vente");
  const isLocataire = role === "locataire";
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Ventes Immobilières</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez vos biens à vendre, ventes et paiements échelonnés
            </p>
          </div>
          {canCreateBien && (
            <AddBienVenteDialog>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="sm:inline">Ajouter un bien</span>
              </Button>
            </AddBienVenteDialog>
          )}
        </div>

        {/* Dashboard KPIs */}
        <VentesDashboard />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 overflow-x-auto">
            <TabsTrigger value="biens" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Biens</span>
            </TabsTrigger>
            <TabsTrigger value="ventes" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Ventes</span>
            </TabsTrigger>
            <TabsTrigger value="echeances" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Échéances</span>
            </TabsTrigger>
            <TabsTrigger value="prospects" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <UserSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Prospects</span>
            </TabsTrigger>
            <TabsTrigger value="acquereurs" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Acquéreurs</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="affectations" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Affectations</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="biens" className="mt-6">
            <BiensVenteList />
          </TabsContent>

          <TabsContent value="ventes" className="mt-6">
            <VentesImmobilieresList />
          </TabsContent>

          <TabsContent value="echeances" className="mt-6">
            <EcheancesVentesTabContent />
          </TabsContent>

          <TabsContent value="prospects" className="mt-6">
            <VenteProspectsTab />
          </TabsContent>

          <TabsContent value="acquereurs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Liste des acquéreurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {acquereurs?.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun acquéreur enregistré</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Les acquéreurs sont créés automatiquement lors des ventes
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {acquereurs?.map((acq) => {
                      const canClick = !isLocataire && !isLoadingPermissions;
                      const cardContent = (
                        <Card className={`p-4 transition-colors ${canClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{acq.name}</p>
                              {acq.phone && (
                                <p className="text-sm text-muted-foreground">{acq.phone}</p>
                              )}
                              {acq.email && (
                                <p className="text-sm text-muted-foreground truncate">{acq.email}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );

                      if (!canClick) {
                        return <div key={acq.id}>{cardContent}</div>;
                      }

                      return (
                        <AcquereurDetailsDialog key={acq.id} acquereur={acq}>
                          {cardContent}
                        </AcquereurDetailsDialog>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="affectations" className="mt-6">
              <BiensVenteAssignmentsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
