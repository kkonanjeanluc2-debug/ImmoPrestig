import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PropertyCard } from "@/components/dashboard/PropertyCard";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import { PropertyTypesChart } from "@/components/dashboard/PropertyTypesChart";
import { AddPropertyDialog } from "@/components/property/AddPropertyDialog";
import { Building2, Users, Wallet, TrendingUp, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useTenants } from "@/hooks/useTenants";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: payments, isLoading: paymentsLoading } = usePayments();

  const handleGenerateReceipts = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-receipts');
      
      if (error) throw error;
      
      toast({
        title: "Génération terminée",
        description: `${data.sent || 0} quittance(s) envoyée(s), ${data.skipped || 0} déjà envoyée(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer les quittances.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = propertiesLoading || tenantsLoading || paymentsLoading;

  // Compute stats
  const totalProperties = properties?.length || 0;
  const activeTenants = tenants?.filter(t => 
    t.contracts?.some(c => c.status === 'active')
  ).length || 0;
  
  const monthlyRevenue = payments?.filter(p => {
    const paidDate = p.paid_date ? new Date(p.paid_date) : null;
    const now = new Date();
    return p.status === 'paid' && paidDate && 
           paidDate.getMonth() === now.getMonth() && 
           paidDate.getFullYear() === now.getFullYear();
  }).reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const occupiedProperties = properties?.filter(p => p.status === 'occupé').length || 0;
  const occupancyRate = totalProperties > 0 
    ? Math.round((occupiedProperties / totalProperties) * 100) 
    : 0;

  const recentProperties = properties?.slice(0, 4) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground mt-1">
              Bienvenue. Voici un aperçu de votre patrimoine immobilier.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateReceipts}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Générer les quittances
            </Button>
            <AddPropertyDialog />
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total des biens"
              value={totalProperties}
              change={totalProperties > 0 ? `${totalProperties} bien${totalProperties > 1 ? 's' : ''}` : "Aucun bien"}
              changeType="positive"
              icon={Building2}
              iconBg="navy"
            />
            <StatCard
              title="Locataires actifs"
              value={activeTenants}
              change={activeTenants > 0 ? "Contrats actifs" : "Aucun locataire"}
              changeType="positive"
              icon={Users}
              iconBg="emerald"
            />
            <StatCard
              title="Revenus mensuels"
              value={`${monthlyRevenue.toLocaleString('fr-FR')} F CFA`}
              change="Ce mois-ci"
              changeType="positive"
              icon={Wallet}
              iconBg="sand"
            />
            <StatCard
              title="Taux d'occupation"
              value={`${occupancyRate}%`}
              change={`${occupiedProperties}/${totalProperties} biens`}
              changeType="positive"
              icon={TrendingUp}
              iconBg="navy"
            />
          </div>
        )}

        {/* Charts Section */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RevenueChart payments={payments || []} />
            <OccupancyChart properties={properties || []} />
            <PropertyTypesChart properties={properties || []} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Properties Section */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold text-foreground">
                Biens récents
              </h2>
              <Link to="/properties">
                <Button variant="ghost" className="text-navy hover:text-navy-dark">
                  Voir tous les biens →
                </Button>
              </Link>
            </div>
            
            {propertiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentProperties.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border/50">
                <p className="text-muted-foreground">
                  Aucun bien enregistré. Ajoutez votre premier bien !
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentProperties.map((property, index) => (
                  <div key={property.id} style={{ animationDelay: `${index * 100}ms` }}>
                    <PropertyCard 
                      image={property.image_url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"}
                      title={property.title}
                      address={property.address}
                      price={property.price}
                      type={property.type as "location" | "vente"}
                      propertyType={property.property_type as "maison" | "appartement" | "terrain"}
                      bedrooms={property.bedrooms || undefined}
                      bathrooms={property.bathrooms || undefined}
                      area={property.area || 0}
                      status={property.status as "disponible" | "occupé" | "en attente"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments Section */}
          <div className="xl:col-span-1">
            <RecentPayments />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
