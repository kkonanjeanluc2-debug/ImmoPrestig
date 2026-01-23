import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Bell, Shield, Users, Clock, History, MessageCircle, Building2, Paintbrush, FileText, Settings2, CreditCard } from "lucide-react";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NotificationHistory } from "@/components/settings/NotificationHistory";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { RolesSettings } from "@/components/settings/RolesSettings";
import { ActivityHistory } from "@/components/settings/ActivityHistory";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { ReceiptTemplateManager } from "@/components/settings/ReceiptTemplateManager";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
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
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 h-auto gap-2 bg-transparent p-0">
            <TabsTrigger
              value="agency"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Agence</span>
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Paintbrush className="h-4 w-4" />
              <span className="hidden sm:inline">Couleurs</span>
            </TabsTrigger>
            <TabsTrigger
              value="receipts"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Quittances</span>
            </TabsTrigger>
            <TabsTrigger
              value="subscription"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Abonnement</span>
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Rôles</span>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Activité</span>
            </TabsTrigger>
            <TabsTrigger
              value="display"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Affichage</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alertes</span>
            </TabsTrigger>
            <TabsTrigger
              value="notification-history"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
            <TabsTrigger
              value="whatsapp"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger
              value="automation"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Automatisations</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agency">
            <AgencySettings />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          <TabsContent value="receipts">
            <ReceiptTemplateManager />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionSettings />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
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
