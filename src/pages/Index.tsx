import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { PropertyCard } from "@/components/dashboard/PropertyCard";
import { RecentPayments } from "@/components/dashboard/RecentPayments";
import { Building2, Users, Wallet, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const properties = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    title: "Villa Belle Époque",
    address: "16 Avenue Foch, Paris 16ème",
    price: 3500,
    type: "location" as const,
    propertyType: "maison" as const,
    bedrooms: 5,
    bathrooms: 3,
    area: 280,
    status: "disponible" as const,
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    title: "Appartement Haussmannien",
    address: "42 Boulevard Saint-Germain, Paris 5ème",
    price: 1850,
    type: "location" as const,
    propertyType: "appartement" as const,
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    status: "occupé" as const,
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    title: "Loft Design Bastille",
    address: "8 Rue de la Roquette, Paris 11ème",
    price: 2200,
    type: "location" as const,
    propertyType: "appartement" as const,
    bedrooms: 2,
    bathrooms: 1,
    area: 95,
    status: "en attente" as const,
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    title: "Terrain Constructible",
    address: "Chemin des Vignes, Fontainebleau",
    price: 185000,
    type: "vente" as const,
    propertyType: "terrain" as const,
    area: 1200,
    status: "disponible" as const,
  },
];

const Index = () => {
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
              Bienvenue, Jean. Voici un aperçu de votre patrimoine immobilier.
            </p>
          </div>
          <Button className="bg-emerald hover:bg-emerald-dark text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un bien
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total des biens"
            value={24}
            change="+2 ce mois"
            changeType="positive"
            icon={Building2}
            iconBg="navy"
          />
          <StatCard
            title="Locataires actifs"
            value={18}
            change="100% occupés"
            changeType="positive"
            icon={Users}
            iconBg="emerald"
          />
          <StatCard
            title="Revenus mensuels"
            value="32 450 €"
            change="+8% vs mois dernier"
            changeType="positive"
            icon={Wallet}
            iconBg="sand"
          />
          <StatCard
            title="Taux d'occupation"
            value="94%"
            change="+2% vs trimestre"
            changeType="positive"
            icon={TrendingUp}
            iconBg="navy"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Properties Section */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold text-foreground">
                Biens récents
              </h2>
              <Button variant="ghost" className="text-navy hover:text-navy-dark">
                Voir tous les biens →
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {properties.map((property, index) => (
                <div key={property.id} style={{ animationDelay: `${index * 100}ms` }}>
                  <PropertyCard {...property} />
                </div>
              ))}
            </div>
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
