import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Bell, Shield, Users, Clock, History, MessageCircle, Building2, Paintbrush, FileText, Settings2, CreditCard, Percent, ScrollText } from "lucide-react";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NotificationHistory } from "@/components/settings/NotificationHistory";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { RolesSettings } from "@/components/settings/RolesSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { ActivityHistory } from "@/components/settings/ActivityHistory";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { ReceiptTemplateManager } from "@/components/settings/ReceiptTemplateManager";
import { ContractTemplateManager } from "@/components/settings/ContractTemplateManager";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { ManagementTypesSettings } from "@/components/settings/ManagementTypesSettings";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";

const Settings = () => {
  const { isSuperAdmin } = useIsSuperAdmin();
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "profile" : "agency");

  // Super Admin: simplified settings
  if (isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Paramètres
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez votre compte Super Admin
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-auto gap-2 bg-transparent p-0 max-w-md">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
              <TabsTrigger
                value="display"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Affichage</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Sécurité</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileSettings />
            </TabsContent>

            <TabsContent value="display">
              <DisplaySettings />
            </TabsContent>

            <TabsContent value="security">
              <SecuritySettings />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  // Regular users: full settings
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Paramètres
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre compte et vos préférences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto gap-1 p-1 min-w-max">
              <TabsTrigger
                value="agency"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Building2 className="h-4 w-4" />
                <span>Agence</span>
              </TabsTrigger>
              <TabsTrigger
                value="management-types"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Percent className="h-4 w-4" />
                <span>Gestion</span>
              </TabsTrigger>
              <TabsTrigger
                value="branding"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Paintbrush className="h-4 w-4" />
                <span>Couleurs</span>
              </TabsTrigger>
              <TabsTrigger
                value="receipts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <FileText className="h-4 w-4" />
                <span>Quittances</span>
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <ScrollText className="h-4 w-4" />
                <span>Contrats</span>
              </TabsTrigger>
              <TabsTrigger
                value="subscription"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <CreditCard className="h-4 w-4" />
                <span>Abonnement</span>
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <User className="h-4 w-4" />
                <span>Profil</span>
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Users className="h-4 w-4" />
                <span>Équipe</span>
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Users className="h-4 w-4" />
                <span>Rôles</span>
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Clock className="h-4 w-4" />
                <span>Activité</span>
              </TabsTrigger>
              <TabsTrigger
                value="display"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Palette className="h-4 w-4" />
                <span>Affichage</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Bell className="h-4 w-4" />
                <span>Alertes</span>
              </TabsTrigger>
              <TabsTrigger
                value="notification-history"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <History className="h-4 w-4" />
                <span>Historique</span>
              </TabsTrigger>
              <TabsTrigger
                value="whatsapp"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger
                value="automation"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Settings2 className="h-4 w-4" />
                <span>Automatisations</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Shield className="h-4 w-4" />
                <span>Sécurité</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="agency">
            <AgencySettings />
          </TabsContent>

          <TabsContent value="management-types">
            <ManagementTypesSettings />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="receipts">
            <ReceiptTemplateManager />
          </TabsContent>

          <TabsContent value="contracts">
            <ContractTemplateManager />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionSettings />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="team">
            <TeamSettings />
          </TabsContent>

          <TabsContent value="roles">
            <RolesSettings />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityHistory />
          </TabsContent>

          <TabsContent value="display">
            <DisplaySettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="notification-history">
            <NotificationHistory />
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppSettings />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationSettings />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
