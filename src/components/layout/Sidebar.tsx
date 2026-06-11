import React from "react";
import { NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  AlertTriangle,
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Shield,
  UserCog,
  Eye,
  Download,
  Crown,
  ScrollText,
  Trash2,
  Building2,
  HandCoins,
  KeyRound,
  ShoppingCart,
  Briefcase,
  PackagePlus,
  Calculator,
  BarChart3,
  UserPlus
} from "lucide-react";
import immoPrestigeLogo from "@/assets/immoprestige-logo.png";
import { usePlatformBranding } from "@/hooks/usePlatformBranding";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getDedicatedInstallPath, getDedicatedLoginPath } from "@/lib/dedicatedLogin";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUserRole, ROLE_LABELS, type AppRole } from "@/hooks/useUserRoles";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAgency } from "@/hooks/useAgency";
import { useTrashCount } from "@/hooks/useTrashCount";
import { useNewVenteProspectsCount, useNewAllLotissementProspectsCount } from "@/hooks/useNewProspectsCount";
import { useNewTenantRequestsCount } from "@/hooks/useNewTenantRequestsCount";
import { useFeatureAccess, FeatureKey } from "@/hooks/useFeatureAccess";
import { usePlatformSetting } from "@/hooks/usePlatformSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePrefetchRoute } from "@/hooks/usePrefetchRoutes";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  super_admin: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  gestionnaire: <UserCog className="h-3 w-3" />,
  comptable: <UserCog className="h-3 w-3" />,
  caissiere: <UserCog className="h-3 w-3" />,
  lecture_seule: <Eye className="h-3 w-3" />,
  locataire: <Users className="h-3 w-3" />,
};

const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-purple-50 text-purple-600 border-purple-200",
  admin: "bg-emerald-50 text-emerald-600 border-emerald-200",
  gestionnaire: "bg-blue-50 text-blue-600 border-blue-200",
  comptable: "bg-teal-50 text-teal-600 border-teal-200",
  caissiere: "bg-pink-50 text-pink-600 border-pink-200",
  lecture_seule: "bg-amber-50 text-amber-600 border-amber-200",
  locataire: "bg-orange-50 text-orange-600 border-orange-200",
};

const gestionLocativeItems: { name: string; href: string; icon: typeof Building2; hiddenForTenant: boolean; hiddenForGestionnaire: boolean; featureKey?: FeatureKey }[] = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, hiddenForTenant: true, hiddenForGestionnaire: false },
  { name: "Propriétaires", href: "/owners", icon: Home, hiddenForTenant: true, hiddenForGestionnaire: false },
  { name: "Biens", href: "/properties", icon: Building2, hiddenForTenant: true, hiddenForGestionnaire: false },
  { name: "Locataires", href: "/tenants", icon: Users, hiddenForTenant: false, hiddenForGestionnaire: false },
  { name: "Contrats", href: "/contracts", icon: ScrollText, hiddenForTenant: false, hiddenForGestionnaire: true },
  { name: "Paiements", href: "/payments", icon: Wallet, hiddenForTenant: false, hiddenForGestionnaire: false },
  { name: "Impayés", href: "/impayes", icon: AlertTriangle, hiddenForTenant: true, hiddenForGestionnaire: false, featureKey: "gestion_impayes" },
  { name: "Apporteurs", href: "/apporteurs", icon: UserPlus, hiddenForTenant: true, hiddenForGestionnaire: false, featureKey: "apporteurs_affaires" },
];

const crmImmobilierItems: { name: string; href: string; icon: typeof Building2; featureKey: FeatureKey }[] = [
  { name: "Ventes Immobilières", href: "/ventes-immobilieres", icon: HandCoins, featureKey: "ventes_immobilieres" },
  { name: "Achats Immobiliers", href: "/achats-immobiliers", icon: ShoppingCart, featureKey: "achats_immobiliers" },
  { name: "Acquisitions", href: "/acquisitions", icon: PackagePlus, featureKey: "achats_immobiliers" },
];

const otherNavigation: { name: string; href: string; icon: typeof Building2; featureKey?: FeatureKey }[] = [
  { name: "Lotissements", href: "/lotissements", icon: Building2, featureKey: "lotissement" },
  { name: "Comptabilité", href: "/comptabilite", icon: Calculator },
  { name: "Rapports", href: "/rapports", icon: BarChart3 },
];

const superAdminNavigation = [
  { name: "Gestion plateforme", href: "/super-admin", icon: Crown },
  { name: "Paramètres", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: userRole } = useCurrentUserRole();
  const { data: ownAgency } = useAgency();
  const { canInstall, isIOS, promptInstall } = usePWAInstall();
  const { data: trashCount } = useTrashCount();
  const { count: newVenteProspectsCount } = useNewVenteProspectsCount();
  const { count: newLotProspectsCount } = useNewAllLotissementProspectsCount();
  const { count: newRequestsCount } = useNewTenantRequestsCount();
  const { hasFeature } = useFeatureAccess();
  const { data: acquisitionsModuleSetting } = usePlatformSetting("module_acquisitions_enabled");
  const isAcquisitionsEnabled = acquisitionsModuleSetting?.value === "true";
  const { data: comptaModuleSetting } = usePlatformSetting("module_comptabilite_enabled");
  const isComptaEnabled = comptaModuleSetting?.value === "true";
  const { hasPermission } = usePermissions();
  const prefetchRoute = usePrefetchRoute();
  const { logoUrl: platformLogo, appName: platformAppName } = usePlatformBranding();
  const canAccessSettings = hasPermission("can_access_settings");
  
  const isLocataire = userRole?.role === "locataire";
  
  // Fetch tenant's agency info when logged in as tenant
  const { data: tenantAgency } = useQuery({
    queryKey: ["tenant-agency-sidebar", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Find the tenant record for this portal user
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("user_id")
        .eq("portal_user_id", user.id)
        .eq("has_portal_access", true)
        .maybeSingle();
      
      if (tenantError || !tenant) return null;
      
      // Fetch the agency owned by the tenant's user_id
      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("id, name, logo_url, account_type")
        .eq("user_id", tenant.user_id)
        .maybeSingle();
      
      if (agencyError) return null;
      return agencyData;
    },
    enabled: !!user?.id && isLocataire,
  });
  
  // Use tenant's agency or the user's own agency
  const agency = isLocataire ? tenantAgency : ownAgency;

  const handleInstallClick = async () => {
    if (isIOS) {
      navigate(getDedicatedInstallPath());
    } else {
      await promptInstall();
    }
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showText = !collapsed || mobileOpen;

  const renderNavItem = (
    item: { name: string; href: string; icon: typeof Building2 },
    opts?: { badgeCount?: number; indent?: boolean }
  ) => {
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
    const badgeCount = opts?.badgeCount || 0;
    return (
      <NavLink
        key={item.name}
        to={item.href}
        onMouseEnter={() => prefetchRoute(item.href)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
          opts?.indent && "ml-2",
          isActive
            ? "bg-blue-50 text-blue-600"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <div className="relative flex-shrink-0">
          <item.icon strokeWidth={1.75} className={cn(
            "h-5 w-5 transition-all duration-200",
            isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600",
            !showText && "mx-auto"
          )} />
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-3.5 flex items-center justify-center px-0.5 ring-2 ring-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </div>
        {showText && (
          <span className={cn(
            "text-sm transition-colors duration-200",
            isActive ? "font-semibold" : "font-medium"
          )}>{item.name}</span>
        )}
        {isActive && showText && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-600 rounded-r-full" />
        )}
      </NavLink>
    );
  };

  const renderSectionLabel = (label: string) => {
    if (!showText) return null;
    return (
      <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>
    );
  };

  const renderCollapsibleGroup = (
    label: string,
    icon: typeof Building2,
    children: React.ReactNode
  ) => (
    <Collapsible defaultOpen className="space-y-0.5">
      <CollapsibleTrigger className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full group",
        "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}>
        {React.createElement(icon, {
          strokeWidth: 1.75,
          className: cn("h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-600", !showText && "mx-auto")
        })}
        {showText && (
          <>
            <span className="font-semibold text-sm flex-1 text-left">{label}</span>
            <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className={cn("space-y-0.5", showText && "pl-1")}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl shadow-md"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen transition-all duration-300 ease-in-out flex flex-col",
          "bg-white border-r border-gray-200",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[68px]" : "lg:w-[260px]",
          "w-[260px]"
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          "flex items-center justify-between px-4 h-[68px] border-b border-gray-100",
        )}>
          {showText ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-gray-200">
                <img
                  src={platformLogo}
                  alt={platformAppName}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-display text-[15px] text-gray-900 font-semibold truncate">
                {platformAppName}
              </span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-xl overflow-hidden mx-auto ring-1 ring-gray-200">
              <img
                src={platformLogo}
                alt={platformAppName}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav data-tour="sidebar-nav" className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {/* Super Admin Navigation */}
          {userRole?.role === "super_admin" ? (
            <>
              {renderSectionLabel("Administration")}
              {superAdminNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                      isActive
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon strokeWidth={1.75} className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-purple-600" : "text-gray-400 group-hover:text-gray-600",
                      !showText && "mx-auto"
                    )} />
                    {showText && (
                      <span className={cn("text-sm", isActive ? "font-semibold" : "font-medium")}>{item.name}</span>
                    )}
                    {isActive && showText && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-purple-600 rounded-r-full" />
                    )}
                  </NavLink>
                );
              })}
            </>
          ) : (
            <>
              {/* Gestion Locative */}
              {(userRole?.role === "admin" || userRole?.role === "locataire" || hasPermission("can_access_gestion_locative")) && (
                renderCollapsibleGroup("Gestion locative", KeyRound, 
                  gestionLocativeItems
                    .filter((item) => !(userRole?.role === "locataire" && item.hiddenForTenant))
                    .filter((item) => !(userRole?.role === "gestionnaire" && item.hiddenForGestionnaire))
                    .filter((item) => !item.featureKey || hasFeature(item.featureKey))
                    .filter((item) => {
                      if (userRole?.role === "locataire") return true;
                      if (userRole?.role === "super_admin" || userRole?.role === "admin") return true;
                      if (item.href === "/owners") return hasPermission("can_view_owners");
                      if (item.href === "/properties") return hasPermission("can_view_properties");
                      if (item.href === "/tenants") return hasPermission("can_view_tenants");
                      if (item.href === "/contracts") return hasPermission("can_view_contracts");
                      if (item.href === "/payments") return hasPermission("can_view_payments");
                      if (item.href === "/impayes") return hasPermission("can_view_impayes");
                      if (item.href === "/apporteurs") return hasPermission("can_view_apporteurs");
                      return true;
                    })
                    .map((item) => renderNavItem(item, {
                      badgeCount: item.href === "/tenants" ? newRequestsCount : 0,
                      indent: true,
                    }))
                )
              )}

              {/* CRM Immobilier */}
              {crmImmobilierItems.some(item => hasFeature(item.featureKey)) && (userRole?.role === "admin" || hasPermission("can_access_crm_immobilier")) && (
                renderCollapsibleGroup("CRM Immobilier", Briefcase,
                  crmImmobilierItems
                    .filter((item) => {
                      if (!hasFeature(item.featureKey)) return false;
                      if (item.href === "/acquisitions" && !isAcquisitionsEnabled) return false;
                      if (item.href === "/ventes-immobilieres") return hasPermission("can_view_ventes");
                      if (item.href === "/achats-immobiliers" || item.href === "/acquisitions") return hasPermission("can_view_achats");
                      return true;
                    })
                    .map((item) => renderNavItem(item, {
                      badgeCount: item.href === "/ventes-immobilieres" ? newVenteProspectsCount : 0,
                      indent: true,
                    }))
                )
              )}

              {/* Other navigation */}
              {otherNavigation
                .filter((item) => {
                  if (item.href === "/comptabilite") {
                    if (userRole?.role === "locataire") return false;
                    return isComptaEnabled && hasPermission("can_view_comptabilite");
                  }
                  if (item.href === "/rapports") {
                    if (userRole?.role === "locataire") return false;
                    if (userRole?.role === "super_admin" || userRole?.role === "admin") return true;
                    return hasPermission("can_view_reports");
                  }
                  if (item.href === "/lotissements") {
                    if (userRole?.role === "super_admin" || userRole?.role === "admin") return !item.featureKey || hasFeature(item.featureKey);
                    return (!item.featureKey || hasFeature(item.featureKey)) && hasPermission("can_view_lotissements");
                  }
                  return !item.featureKey || hasFeature(item.featureKey);
                })
                .map((item) => renderNavItem(item, {
                  badgeCount: item.href === "/lotissements" ? newLotProspectsCount : 0,
                }))}
              
              {/* Divider */}
              <div className={cn("py-3", showText ? "px-3" : "px-2")}>
                <div className="border-t border-gray-100" />
              </div>
              
              {/* Settings */}
              {canAccessSettings && renderNavItem({ name: "Paramètres", href: "/settings", icon: Settings })}
              
              {/* Trash */}
              {userRole?.role === "admin" && renderNavItem(
                { name: "Corbeille", href: "/trash", icon: Trash2 },
                { badgeCount: trashCount?.total || 0 }
              )}
            </>
          )}
        </nav>

        {/* Install PWA Button */}
        {canInstall && (
          <div className="px-2.5 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInstallClick}
              className={cn(
                "w-full rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200",
                collapsed && !mobileOpen && "px-2"
              )}
            >
              <Download className={cn("h-4 w-4", showText && "mr-2")} />
              {showText && <span className="text-[13px]">Installer l'app</span>}
            </Button>
          </div>
        )}

        {/* User Profile Section */}
        <div className="border-t border-gray-100">
          {showText ? (
            <div className="p-3 space-y-3">
              {/* Agency/User Card */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                {userRole?.role === "super_admin" ? (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <Avatar className="h-10 w-10 rounded-xl border border-gray-200 flex-shrink-0">
                    <AvatarImage src={agency?.logo_url || undefined} alt={agency?.name || "Logo"} className="object-cover" />
                    <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl">
                      {agency?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">
                    {userRole?.role === "super_admin" ? "Super Admin" : (agency?.name || "Mon agence")}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {userRole?.role === "super_admin" ? "Administrateur plateforme" : (agency?.account_type === "proprietaire" ? "Propriétaire" : "Agence")}
                  </p>
                </div>
              </div>

              {/* Email & Role */}
              <div className="px-1 space-y-1.5">
                <p className="text-[11px] text-gray-400 truncate">
                  {user?.email}
                </p>
                {userRole && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-2 py-0.5 h-5 gap-1 rounded-full",
                      ROLE_BADGE_COLORS[userRole.role]
                    )}
                  >
                    {ROLE_ICONS[userRole.role]}
                    {ROLE_LABELS[userRole.role]}
                  </Badge>
                )}
              </div>

              {/* Logout */}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate(getDedicatedLoginPath());
                }}
                className="w-full text-gray-500 hover:text-gray-900 hover:bg-gray-50 justify-start rounded-xl h-9"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-[13px]">Déconnexion</span>
              </Button>
            </div>
          ) : (
            <div className="p-2 flex flex-col items-center gap-2">
              {userRole?.role === "super_admin" ? (
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              ) : (
                <Avatar className="h-8 w-8 rounded-xl border border-gray-200">
                  <AvatarImage src={agency?.logo_url || undefined} alt={agency?.name || "Logo"} className="object-cover" />
                  <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl">
                    {agency?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
              )}
              {userRole && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "p-1 h-6 w-6 flex items-center justify-center rounded-lg",
                    ROLE_BADGE_COLORS[userRole.role]
                  )}
                  title={ROLE_LABELS[userRole.role]}
                >
                  {ROLE_ICONS[userRole.role]}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  navigate(getDedicatedLoginPath());
                }}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl h-8 w-8"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Collapse Toggle - Desktop only */}
        <div className="p-2 border-t border-gray-100 hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(!collapsed)}
            className="w-full text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl h-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-[12px]">Réduire</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
