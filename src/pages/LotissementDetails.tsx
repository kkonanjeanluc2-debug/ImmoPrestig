import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  MapPin, 
  Plus, 
  Grid3X3, 
  List, 
  Users,
  TrendingUp,
  Calendar,
  Map,
  Wallet,
  UserCheck,
  Trophy,
  FileText,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import { useLotissement } from "@/hooks/useLotissements";
import { useParcelles } from "@/hooks/useParcelles";
import { useVentesParcelles } from "@/hooks/useVentesParcelles";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { ParcellesList } from "@/components/lotissement/ParcellesList";
import { ParcellesGrid } from "@/components/lotissement/ParcellesGrid";
import { PlanMasse } from "@/components/lotissement/PlanMasse";
import { VentesList } from "@/components/lotissement/VentesList";
import { EcheancesDashboard } from "@/components/lotissement/EcheancesDashboard";
import { AddParcelleDialog } from "@/components/lotissement/AddParcelleDialog";
import { AddBulkParcellesDialog } from "@/components/lotissement/AddBulkParcellesDialog";
import { LotAssignmentSettings } from "@/components/lotissement/LotAssignmentSettings";
import { SalesPerformanceChart } from "@/components/lotissement/SalesPerformanceChart";
import { LotissementDocumentsTab } from "@/components/lotissement/LotissementDocumentsTab";
import { DemarchesAdministrativesTab } from "@/components/lotissement/DemarchesAdministrativesTab";
import { ProspectsTab } from "@/components/lotissement/ProspectsTab";

const LotissementDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lotissement, isLoading: loadingLotissement } = useLotissement(id || "");
  const { data: parcelles, isLoading: loadingParcelles } = useParcelles(id);
  const { data: ventes } = useVentesParcelles(id);
  const { canCreate } = usePermissions();
  const { isOwner } = useIsAgencyOwner();

  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("grid");
  const [showAddParcelle, setShowAddParcelle] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  if (loadingLotissement) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lotissement) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <Card className="py-12 text-center">
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Lotissement introuvable</h3>
              <Button onClick={() => navigate("/lotissements")} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux lotissements
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const stats = {
    total: parcelles?.length || 0,
    disponibles: parcelles?.filter(p => p.status === "disponible").length || 0,
    vendues: parcelles?.filter(p => p.status === "vendu").length || 0,
    reservees: parcelles?.filter(p => p.status === "reserve").length || 0,
    totalRevenue: parcelles?.filter(p => p.status === "vendu").reduce((sum, p) => sum + p.price, 0) || 0,
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/lotissements")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                {lotissement.name}
              </h1>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {lotissement.location}, {lotissement.city}
              </p>
            </div>
          </div>
          {canCreate && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBulkAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter en masse
              </Button>
              <Button onClick={() => setShowAddParcelle(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle parcelle
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total parcelles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.disponibles}</p>
                <p className="text-sm text-muted-foreground">Disponibles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.reservees}</p>
                <p className="text-sm text-muted-foreground">Réservées</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.vendues}</p>
                <p className="text-sm text-muted-foreground">Vendues</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-xl font-bold text-primary">
                  {stats.totalRevenue.toLocaleString("fr-FR")} F
                </p>
                <p className="text-sm text-muted-foreground">Revenus</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="parcelles" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="parcelles" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline">Parcelles</span>
              </TabsTrigger>
              <TabsTrigger value="ventes" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Ventes</span>
              </TabsTrigger>
              <TabsTrigger value="echeances" className="gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Échéances</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger value="demarches" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Démarches</span>
              </TabsTrigger>
              <TabsTrigger value="prospects" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Prospects</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Performance</span>
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="affectations" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Affectations</span>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "map" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("map")}
                title="Plan de masse"
              >
                <Map className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
                title="Vue grille"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
                title="Vue liste"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="parcelles">
            {loadingParcelles ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : viewMode === "map" ? (
              <PlanMasse 
                parcelles={parcelles || []} 
                lotissementName={lotissement.name}
              />
            ) : viewMode === "grid" ? (
              <ParcellesGrid 
                parcelles={parcelles || []} 
                lotissementId={id || ""} 
              />
            ) : (
              <ParcellesList 
                parcelles={parcelles || []} 
                lotissementId={id || ""} 
              />
            )}
          </TabsContent>

          <TabsContent value="ventes">
            <VentesList ventes={ventes || []} lotissementId={id || ""} />
          </TabsContent>

          <TabsContent value="echeances">
            <EcheancesDashboard lotissementId={id} />
          </TabsContent>

          <TabsContent value="documents">
            <LotissementDocumentsTab 
              lotissementId={id || ""} 
              lotissementName={lotissement.name} 
            />
          </TabsContent>

          <TabsContent value="demarches">
            <DemarchesAdministrativesTab 
              lotissementId={id || ""} 
              lotissementName={lotissement.name} 
            />
          </TabsContent>

          <TabsContent value="prospects">
            <ProspectsTab 
              lotissementId={id || ""} 
              lotissementName={lotissement.name} 
            />
          </TabsContent>

          <TabsContent value="performance">
            <SalesPerformanceChart ventes={ventes || []} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="affectations">
              <LotAssignmentSettings 
                parcelles={parcelles || []} 
                lotissementName={lotissement.name}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <AddParcelleDialog
        lotissementId={id || ""}
        open={showAddParcelle}
        onOpenChange={setShowAddParcelle}
        existingNumbers={parcelles?.map(p => p.plot_number) || []}
      />

      <AddBulkParcellesDialog
        lotissementId={id || ""}
        open={showBulkAdd}
        onOpenChange={setShowBulkAdd}
        existingNumbers={parcelles?.map(p => p.plot_number) || []}
      />
    </DashboardLayout>
  );
};

export default LotissementDetails;
