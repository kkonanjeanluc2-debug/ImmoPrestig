import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PeriodValue, getDefaultPeriod } from "@/components/dashboard/PeriodFilter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, ShoppingCart, Calendar, Plus, Loader2, FileCheck } from "lucide-react";
import { useBiensAchat } from "@/hooks/useBiensAchat";
import { useVendeurs } from "@/hooks/useVendeurs";
import { useOffresAchat } from "@/hooks/useOffresAchat";
import { useAchatsImmobiliers } from "@/hooks/useAchatsImmobiliers";
import { useEcheancesAchats } from "@/hooks/useEcheancesAchats";
import { BiensAchatList } from "@/components/achat-immobilier/BiensAchatList";
import { VendeursList } from "@/components/achat-immobilier/VendeursList";
import { OffresAchatList } from "@/components/achat-immobilier/OffresAchatList";
import { AchatsImmobiliersList } from "@/components/achat-immobilier/AchatsImmobiliersList";
import { EcheancesAchatsList } from "@/components/achat-immobilier/EcheancesAchatsList";
import { AchatsDashboard } from "@/components/achat-immobilier/AchatsDashboard";
import { MutationsAchatList } from "@/components/achat-immobilier/MutationsAchatList";

const STATUS_LABELS: Record<string, string> = {
  prospection: "Prospection",
  en_negociation: "En négociation",
  offre_faite: "Offre faite",
  sous_compromis: "Sous compromis",
  achete: "Acheté",
  abandonne: "Abandonné",
};

export default function AchatsImmobiliers() {
  const [activeTab, setActiveTab] = useState("biens");
  const [period, setPeriod] = useState<PeriodValue>(getDefaultPeriod);

  // Prefetch all tab data on mount for instant switching
  useBiensAchat();
  useVendeurs();
  useOffresAchat();
  useAchatsImmobiliers();
  useEcheancesAchats();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Achats Immobiliers</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Transactions d'achat-vente pour vos clients particuliers et investisseurs
            </p>
          </div>
        </div>

        <AchatsDashboard period={period} onPeriodChange={setPeriod} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 overflow-x-auto">
            <TabsTrigger value="biens" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Biens</span>
            </TabsTrigger>
            <TabsTrigger value="vendeurs" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Vendeurs</span>
            </TabsTrigger>
            <TabsTrigger value="offres" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Offres</span>
            </TabsTrigger>
            <TabsTrigger value="achats" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Achats</span>
            </TabsTrigger>
            <TabsTrigger value="echeances" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Échéances</span>
            </TabsTrigger>
            <TabsTrigger value="mutations" className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Mutations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="biens" className="mt-6">
            <BiensAchatList />
          </TabsContent>
          <TabsContent value="vendeurs" className="mt-6">
            <VendeursList />
          </TabsContent>
          <TabsContent value="offres" className="mt-6">
            <OffresAchatList />
          </TabsContent>
          <TabsContent value="achats" className="mt-6">
            <AchatsImmobiliersList period={period} />
          </TabsContent>
          <TabsContent value="echeances" className="mt-6">
            <EcheancesAchatsList />
          </TabsContent>
          <TabsContent value="mutations" className="mt-6">
            <MutationsAchatList />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
