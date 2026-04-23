import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Bell, Shield, Users, History, MessageCircle, Building2, Paintbrush, FileText, Settings2, CreditCard, Percent, ScrollText, Home, MapPin, BookmarkCheck, ShoppingCart, Blocks, BookOpen, Handshake } from "lucide-react";
import { ModulesSettings } from "@/components/settings/ModulesSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NotificationHistory } from "@/components/settings/NotificationHistory";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { RolesSettings } from "@/components/settings/RolesSettings";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { AgencySettings } from "@/components/settings/AgencySettings";
import { ExportAllDataButton } from "@/components/settings/ExportAllDataButton";
import { PDFDocumentSettings } from "@/components/settings/PDFDocumentSettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { ReceiptTemplateManager } from "@/components/settings/ReceiptTemplateManager";
import { ContractTemplateManager } from "@/components/settings/ContractTemplateManager";
import { ColocationContractTemplateManager } from "@/components/settings/ColocationContractTemplateManager";
import { SaleContractTemplateManager } from "@/components/settings/SaleContractTemplateManager";
import { PromesseVenteTemplateManager } from "@/components/settings/PromesseVenteTemplateManager";
import { ReservationFormTemplateManager } from "@/components/settings/ReservationFormTemplateManager";
import { AchatContractTemplateManager } from "@/components/settings/AchatContractTemplateManager";
import { AttestationTemplateManager } from "@/components/settings/AttestationTemplateManager";
import { GuideTemplateManager } from "@/components/settings/GuideTemplateManager";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { ManagementTypesSettings } from "@/components/settings/ManagementTypesSettings";
import { ManagementContractTemplateManager } from "@/components/settings/ManagementContractTemplateManager";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { usePermissions } from "@/hooks/usePermissions";

const Settings = () => {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { hasFeature, planName } = useFeatureAccess();
  const { hasPermission, role } = usePermissions();
  const hasVentesImmobilieres = hasFeature("ventes_immobilieres");
  const hasLotissement = hasFeature("lotissement");
  const hasAchatsImmobiliers = hasFeature("achats_immobiliers");
  const isFreePlan = planName === "Gratuit";
  
  
  // Permission checks
  const canManageTeam = hasPermission("can_manage_team");
  const canManageAutomations = hasPermission("can_manage_automations");
  const canManageBranding = hasPermission("can_manage_branding");
  const canManageTemplates = hasPermission("can_manage_templates");
  const canAccessAgencyTab = hasPermission("can_access_agency_tab");
  const canAccessManagementTab = hasPermission("can_access_management_tab");
  const canAccessSubscriptionTab = hasPermission("can_access_subscription_tab");
  const canAccessNotificationsTab = hasPermission("can_access_notifications_tab");
  const canAccessWhatsappTab = hasPermission("can_access_whatsapp_tab");
  const canAccessSaleContractsTab = hasPermission("can_access_sale_contracts_tab");
  const canAccessPromesseVenteTab = hasPermission("can_access_promesse_vente_tab");
  const canAccessReservationFormsTab = hasPermission("can_access_reservation_forms_tab");
  const canAccessAchatContractsTab = hasPermission("can_access_achat_contracts_tab");
  const isAdmin = role === "admin" || role === "super_admin";
  
  // Check if user has access to any settings tab
  const hasAnySettingsAccess = canAccessAgencyTab || canAccessManagementTab || canAccessSubscriptionTab || canAccessNotificationsTab || canAccessWhatsappTab || canAccessSaleContractsTab || canAccessPromesseVenteTab || canAccessReservationFormsTab || canManageTeam || canManageAutomations || canManageBranding || canManageTemplates;
  
  // Read tab from URL params
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");

  // Default tab: pick first accessible tab
  const getDefaultTab = () => {
    if (urlTab) return urlTab;
    if (isSuperAdmin) return "profile";
    if (canAccessAgencyTab) return "agency";
    if (canAccessManagementTab) return "management-types";
    if (canManageBranding) return "branding";
    if (canManageTemplates) return "receipts";
    if (canAccessSubscriptionTab) return "subscription";
    if (canManageTeam) return "team";
    return "profile";
  };
  const [activeTab, setActiveTab] = useState(getDefaultTab());

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
            <TabsList className="grid w-full grid-cols-4 h-auto gap-2 bg-transparent p-0 max-w-lg">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
              <TabsTrigger
                value="modules"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
              >
                <Blocks className="h-4 w-4" />
                <span className="hidden sm:inline">Modules</span>
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

            <TabsContent value="modules">
              <ModulesSettings />
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
          <h1 data-tour="page-title" className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
            Paramètres
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gérez votre compte et vos préférences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList data-tour="page-tabs" className="flex flex-wrap h-auto gap-1 p-1 overflow-x-auto">
            {canAccessAgencyTab && (
              <TabsTrigger
                value="agency"
                className="flex items-center gap-1.5 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
              >
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Agence</span>
              </TabsTrigger>
            )}
            {canAccessManagementTab && (
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
            {!isFreePlan && canManageTemplates && (
              <TabsTrigger
                value="management-contracts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Handshake className="h-4 w-4" />
                <span>Contrats de gestion</span>
              </TabsTrigger>
            )}
            {hasVentesImmobilieres && canAccessSaleContractsTab && planName !== "Prestige Max" && (
              <TabsTrigger
                value="sale-contracts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Home className="h-4 w-4" />
                <span>Contrats de vente</span>
              </TabsTrigger>
            )}
            {hasLotissement && canAccessPromesseVenteTab && planName !== "Prestige Max" && (
              <TabsTrigger
                value="promesse-vente"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <MapPin className="h-4 w-4" />
                <span>Promesses de vente</span>
              </TabsTrigger>
            )}
            {(hasLotissement || hasVentesImmobilieres) && canAccessReservationFormsTab && planName !== "Prestige Max" && (
              <TabsTrigger
                value="reservation-forms"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <BookmarkCheck className="h-4 w-4" />
                <span>Fiches de réservation</span>
              </TabsTrigger>
            )}
            {hasAchatsImmobiliers && canAccessAchatContractsTab && planName !== "Prestige Max" && (
              <TabsTrigger
                value="achat-contracts"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Documents d'achat</span>
              </TabsTrigger>
            )}
            {hasLotissement && canManageTemplates && planName !== "Prestige Max" && (
              <TabsTrigger
                value="attestation-templates"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <MapPin className="h-4 w-4" />
                <span>Attestations</span>
              </TabsTrigger>
            )}
            {hasLotissement && canManageTemplates && planName !== "Prestige Max" && (
              <TabsTrigger
                value="guide-templates"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>Page de garde</span>
              </TabsTrigger>
            )}
            {canAccessSubscriptionTab && (
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
            {canAccessNotificationsTab && (
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <Bell className="h-4 w-4" />
                <span>Alertes</span>
              </TabsTrigger>
            )}
            {canAccessNotificationsTab && (
              <TabsTrigger
                value="notification-history"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2"
              >
                <History className="h-4 w-4" />
                <span>Historique</span>
              </TabsTrigger>
            )}
            {!isFreePlan && canAccessWhatsappTab && (
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

          {canAccessAgencyTab && (
            <TabsContent value="agency" className="space-y-6">
              <AgencySettings />
              <PDFDocumentSettings />
              {planName !== "Starter" && <ExportAllDataButton />}
            </TabsContent>
          )}

          {canAccessManagementTab && (
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
              <Tabs defaultValue="location" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="colocation">Colocation</TabsTrigger>
                </TabsList>
                <TabsContent value="location">
                  <ContractTemplateManager />
                </TabsContent>
                <TabsContent value="colocation">
                  <ColocationContractTemplateManager />
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}

          {!isFreePlan && (
            <TabsContent value="management-contracts">
              <ManagementContractTemplateManager />
            </TabsContent>
          )}

          {hasVentesImmobilieres && canAccessSaleContractsTab && (
            <TabsContent value="sale-contracts">
              <SaleContractTemplateManager />
            </TabsContent>
          )}

          {hasLotissement && canAccessPromesseVenteTab && (
            <TabsContent value="promesse-vente">
              <PromesseVenteTemplateManager />
            </TabsContent>
          )}

          {(hasLotissement || hasVentesImmobilieres) && canAccessReservationFormsTab && (
            <TabsContent value="reservation-forms">
              <ReservationFormTemplateManager />
            </TabsContent>
          )}

          {hasAchatsImmobiliers && canAccessAchatContractsTab && (
            <TabsContent value="achat-contracts">
              <AchatContractTemplateManager />
            </TabsContent>
          )}

          {hasLotissement && canManageTemplates && (
            <TabsContent value="attestation-templates">
              <Tabs defaultValue="attribution" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="attribution">Attribution</TabsTrigger>
                  <TabsTrigger value="cession">Cession</TabsTrigger>
                </TabsList>
                <TabsContent value="attribution">
                  <AttestationTemplateManager />
                </TabsContent>
                <TabsContent value="cession">
                  <AttestationTemplateManager templateType="cession" />
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}

          {hasLotissement && canManageTemplates && (
            <TabsContent value="guide-templates">
              <GuideTemplateManager />
            </TabsContent>
          )}

          {canAccessSubscriptionTab && (
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

          {canAccessNotificationsTab && (
            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>
          )}

          {canAccessNotificationsTab && (
            <TabsContent value="notification-history">
              <NotificationHistory />
            </TabsContent>
          )}

          {!isFreePlan && canAccessWhatsappTab && (
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
