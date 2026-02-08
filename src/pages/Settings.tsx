import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Bell, Shield, Users, History, MessageCircle, Building2, Paintbrush, FileText, Settings2, CreditCard, Percent, ScrollText, Home } from "lucide-react";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NotificationHistory } from "@/components/settings/NotificationHistory";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { RolesSettings } from "@/components/settings/RolesSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { ReceiptTemplateManager } from "@/components/settings/ReceiptTemplateManager";
import { ContractTemplateManager } from "@/components/settings/ContractTemplateManager";
import { SaleContractTemplateManager } from "@/components/settings/SaleContractTemplateManager";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { ManagementTypesSettings } from "@/components/settings/ManagementTypesSettings";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { usePermissions } from "@/hooks/usePermissions";

const Settings = () => {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { hasFeature, planName } = useFeatureAccess();
  const { hasPermission, role } = usePermissions();
  const hasVentesImmobilieres = hasFeature("ventes_immobilieres");
  const isFreePlan = planName === "Gratuit";
  const isGestionnaire = role === "gestionnaire";
  
  // Permission checks
  const canManageTeam = hasPermission("can_manage_team");
  const canManageAutomations = hasPermission("can_manage_automations");
  const canManageBranding = hasPermission("can_manage_branding");
  const canManageTemplates = hasPermission("can_manage_templates");
  const isAdmin = role === "admin" || role === "super_admin";
  
  // Default tab: gestionnaires go to profile, others to agency
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? "profile" : (isGestionnaire ? "profile" : "agency"));

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
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
            Paramètres
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gérez votre compte et vos préférences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 overflow-x-auto">
            {!isGestionnaire && (
              <TabsTrigger
                value="agency"
                className="flex items-center gap-1.5 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
              >
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Agence</span>
              </TabsTrigger>
            )}
            {!isGestionnaire && (
              <TabsTrigger
                value="management-types"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Percent className="h-4 w-4" />
                <span>Gestion</span>
              </TabsTrigger>
            )}
            {canManageBranding && (
              <TabsTrigger
                value="branding"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Paintbrush className="h-4 w-4" />
                <span>Couleurs</span>
              </TabsTrigger>
            )}
            {!isFreePlan && canManageTemplates && (
              <TabsTrigger
                value="receipts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <FileText className="h-4 w-4" />
                <span>Quittances</span>
              </TabsTrigger>
            )}
            {!isFreePlan && canManageTemplates && (
              <TabsTrigger
                value="contracts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <ScrollText className="h-4 w-4" />
                <span>Contrats</span>
              </TabsTrigger>
            )}
            {hasVentesImmobilieres && !isGestionnaire && (
              <TabsTrigger
                value="sale-contracts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Home className="h-4 w-4" />
                <span>Contrats de vente</span>
              </TabsTrigger>
            )}
            {!isGestionnaire && (
              <TabsTrigger
                value="subscription"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <CreditCard className="h-4 w-4" />
                <span>Abonnement</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
            >
              <User className="h-4 w-4" />
              <span>Profil</span>
            </TabsTrigger>
            {canManageTeam && (
              <TabsTrigger
                value="team"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Users className="h-4 w-4" />
                <span>Équipe</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="roles"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Users className="h-4 w-4" />
                <span>Rôles</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="display"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
            >
              <Palette className="h-4 w-4" />
              <span>Affichage</span>
            </TabsTrigger>
            {!isGestionnaire && (
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Bell className="h-4 w-4" />
                <span>Alertes</span>
              </TabsTrigger>
            )}
            {!isGestionnaire && (
              <TabsTrigger
                value="notification-history"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <History className="h-4 w-4" />
                <span>Historique</span>
              </TabsTrigger>
            )}
            {!isFreePlan && !isGestionnaire && (
              <TabsTrigger
                value="whatsapp"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </TabsTrigger>
            )}
            {!isFreePlan && canManageAutomations && (
              <TabsTrigger
                value="automation"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Settings2 className="h-4 w-4" />
                <span>Automatisations</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
            >
              <Shield className="h-4 w-4" />
              <span>Sécurité</span>
            </TabsTrigger>
          </TabsList>

          {!isGestionnaire && (
            <TabsContent value="agency">
              <AgencySettings />
            </TabsContent>
          )}

          {!isGestionnaire && (
            <TabsContent value="management-types">
              <ManagementTypesSettings />
            </TabsContent>
          )}

          <TabsContent value="branding">
            <BrandingSettings />
          </TabsContent>

          {!isFreePlan && (
            <TabsContent value="receipts">
              <ReceiptTemplateManager />
            </TabsContent>
          )}

          {!isFreePlan && (
            <TabsContent value="contracts">
              <ContractTemplateManager />
            </TabsContent>
          )}

          {hasVentesImmobilieres && !isGestionnaire && (
            <TabsContent value="sale-contracts">
              <SaleContractTemplateManager />
            </TabsContent>
          )}

          {!isGestionnaire && (
            <TabsContent value="subscription">
              <SubscriptionSettings />
            </TabsContent>
          )}

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="team">
            <TeamSettings />
          </TabsContent>

          <TabsContent value="roles">
            <RolesSettings />
          </TabsContent>

          <TabsContent value="display">
            <DisplaySettings />
          </TabsContent>

          {!isGestionnaire && (
            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>
          )}

          {!isGestionnaire && (
            <TabsContent value="notification-history">
              <NotificationHistory />
            </TabsContent>
          )}

          {!isFreePlan && !isGestionnaire && (
            <TabsContent value="whatsapp">
              <WhatsAppSettings />
            </TabsContent>
          )}

          {!isFreePlan && (
            <TabsContent value="automation">
              <AutomationSettings />
            </TabsContent>
          )}

          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
