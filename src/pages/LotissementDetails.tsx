import { useState, useMemo } from "react";
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
  Layers,
  FileSignature,
} from "lucide-react";
import { PeriodFilter, getDefaultPeriod, getPeriodLabel, PeriodValue } from "@/components/dashboard/PeriodFilter";
import { useLotissement } from "@/hooks/useLotissements";
import { useParcelles } from "@/hooks/useParcelles";
import { useVentesParcelles } from "@/hooks/useVentesParcelles";
import { useEcheancesForLotissement } from "@/hooks/useEcheancesParcelles";
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
import { IlotsTab } from "@/components/lotissement/IlotsTab";
import { GenerateLotissementDocumentDialog } from "@/components/lotissement/GenerateLotissementDocumentDialog";
import { AcquereursListCard } from "@/components/lotissement/AcquereursListCard";
import { useNewLotissementProspectsCount } from "@/hooks/useNewProspectsCount";
const LotissementDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lotissement, isLoading: loadingLotissement } = useLotissement(id || "");
  const { data: parcelles, isLoading: loadingParcelles } = useParcelles(id);
  const { data: ventes } = useVentesParcelles(id);
  const { data: echeances } = useEcheancesForLotissement(id);
  const { hasPermission, role } = usePermissions();
  const { isOwner } = useIsAgencyOwner();
  const canCreateParcelle = hasPermission("can_create_parcelles");
  const isGestionnaire = role === "gestionnaire";
  const { count: newProspectsCount, markAsSeen: markProspectsSeen } = useNewLotissementProspectsCount(id);

  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("grid");
  const [showAddParcelle, setShowAddParcelle] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showGenerateDocument, setShowGenerateDocument] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState<PeriodValue>(getDefaultPeriod);

  // Calculate stats based on parcelle status
  const stats = useMemo(() => {
    const total = parcelles?.length || 0;
    const disponibles = parcelles?.filter(p => p.status === "disponible").length || 0;
    const vendues = parcelles?.filter(p => p.status === "vendu").length || 0;
    const reservees = parcelles?.filter(p => p.status === "reserve").length || 0;
    
    return { total, disponibles, vendues, reservees };
  }, [parcelles]);

  // Revenue filtered by period
  const periodRevenue = useMemo(() => {
    let total = 0;
    if (ventes && ventes.length > 0) {
      ventes.forEach(vente => {
        // Down payment: use vente created_at as payment date
        const venteDate = new Date(vente.created_at);
        if (venteDate >= revenuePeriod.from && venteDate <= revenuePeriod.to && (vente.down_payment || 0) > 0) {
          total += vente.down_payment || 0;
        }
        
        const venteEcheances = echeances?.filter(e => e.vente_id === vente.id) || [];
        venteEcheances.forEach(echeance => {
          if (echeance.status === "paid" && echeance.paid_date) {
            const paidDate = new Date(echeance.paid_date);
            if (paidDate >= revenuePeriod.from && paidDate <= revenuePeriod.to) {
              total += echeance.paid_amount || echeance.amount;
            }
          }
        });
      });
    }
    return total;
  }, [ventes, echeances, revenuePeriod]);

  const revenuePeriodLabel = getPeriodLabel(revenuePeriod);

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

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/lotissements")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-display font-bold text-foreground truncate">
                {lotissement.name}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{lotissement.location}, {lotissement.city}</span>
              </p>
            </div>
          </div>
          {canCreateParcelle && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowGenerateDocument(true)}>
                <FileSignature className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Documents</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBulkAdd(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">En masse</span>
              </Button>
              <Button size="sm" onClick={() => setShowAddParcelle(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouvelle parcelle</span>
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total parcelles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">{stats.disponibles}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Disponibles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-amber-600">{stats.reservees}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Réservées</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-4">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.vendues}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Vendues</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:pt-4">
              <div className="text-center">
                <p className="text-sm sm:text-xl font-bold text-primary truncate">
                  {periodRevenue.toLocaleString("fr-FR")} F
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{revenuePeriodLabel.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Period Filter */}
        <PeriodFilter value={revenuePeriod} onChange={setRevenuePeriod} />

        {/* Tabs */}
        <Tabs defaultValue="parcelles" className="space-y-4" onValueChange={(val) => {
          if (val === "prospects") markProspectsSeen();
        }}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList className="h-auto flex-wrap gap-1 p-1 overflow-x-auto">
                <TabsTrigger value="parcelles" className="gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Parcelles</span>
                </TabsTrigger>
                <TabsTrigger value="ilots" className="gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Îlots</span>
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
                  {newProspectsCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center">
                      {newProspectsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                {!isGestionnaire && (
                  <TabsTrigger value="performance" className="gap-2">
                    <Trophy className="h-4 w-4" />
                    <span className="hidden sm:inline">Performance</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="acquereurs" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Acquéreurs</span>
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

          {!isGestionnaire && (
            <TabsContent value="performance">
              <SalesPerformanceChart ventes={ventes || []} lotissementId={id} />
            </TabsContent>
          )}

          <TabsContent value="acquereurs">
            <AcquereursListCard lotissementId={id} />
          </TabsContent>

          <TabsContent value="ilots">
            <IlotsTab 
              lotissementId={id || ""} 
              lotissementName={lotissement.name} 
            />
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
        existingParcelles={parcelles || []}
      />

      <AddBulkParcellesDialog
        lotissementId={id || ""}
        open={showBulkAdd}
        onOpenChange={setShowBulkAdd}
        existingNumbers={parcelles?.map(p => p.plot_number) || []}
        existingParcelles={parcelles?.map(p => ({ ilot_id: p.ilot_id })) || []}
      />

      {lotissement && (
        <GenerateLotissementDocumentDialog
          lotissementId={id || ""}
          lotissementName={lotissement.name}
          lotissement={{
            name: lotissement.name,
            location: lotissement.location,
            city: lotissement.city,
            total_area: lotissement.total_area,
            total_plots: lotissement.total_plots,
          }}
          open={showGenerateDocument}
          onOpenChange={setShowGenerateDocument}
        />
      )}
    </DashboardLayout>
  );
};

export default LotissementDetails;
