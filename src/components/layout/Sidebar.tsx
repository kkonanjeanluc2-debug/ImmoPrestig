import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wallet, 
  FileText, 
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  BarChart3,
  Shield,
  UserCog,
  Eye,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useCurrentUserRole, ROLE_LABELS, type AppRole } from "@/hooks/useUserRoles";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  gestionnaire: <UserCog className="h-3 w-3" />,
  lecture_seule: <Eye className="h-3 w-3" />,
};

const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  admin: "bg-emerald/20 text-emerald border-emerald/30",
  gestionnaire: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lecture_seule: "bg-sand/20 text-sand border-sand/30",
};

const navigation = [
  { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { name: "Dashboard avancé", href: "/dashboard", icon: BarChart3 },
  { name: "Biens immobiliers", href: "/properties", icon: Building2 },
  { name: "Locataires", href: "/tenants", icon: Users },
  { name: "Propriétaires", href: "/owners", icon: Home },
  { name: "Paiements", href: "/payments", icon: Wallet },
  { name: "Documents", href: "/documents", icon: FileText },
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
  const { canInstall, isIOS, promptInstall } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isIOS) {
      navigate("/install");
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

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-navy text-primary-foreground hover:bg-navy-light"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-navy transition-all duration-300 ease-in-out flex flex-col",
          // Mobile: slide in/out
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: collapsed/expanded
          collapsed ? "lg:w-16" : "lg:w-64",
          "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-navy-light">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl text-primary-foreground font-semibold">
                ImmoGest
              </span>
            </div>
          )}
          {collapsed && !mobileOpen && (
            <div className="h-8 w-8 rounded-lg bg-emerald flex items-center justify-center mx-auto">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          
          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-primary-foreground hover:bg-navy-light"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const showText = !collapsed || mobileOpen;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-emerald text-primary-foreground" 
                    : "text-primary-foreground/70 hover:bg-navy-light hover:text-primary-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110",
                  !showText && "mx-auto"
                )} />
                {showText && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Install PWA Button */}
        {canInstall && (
          <div className="px-3 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              className={cn(
                "w-full bg-emerald/10 border-emerald/30 text-emerald hover:bg-emerald/20 hover:text-emerald-light",
                collapsed && !mobileOpen && "px-2"
              )}
            >
              <Download className={cn("h-4 w-4", (!collapsed || mobileOpen) && "mr-2")} />
              {(!collapsed || mobileOpen) && <span className="text-sm">Installer l'app</span>}
            </Button>
          </div>
        )}

        {/* User info and logout */}
        <div className="p-3 border-t border-navy-light">
          {(!collapsed || mobileOpen) && user && (
            <div className="mb-2 px-2">
              <p className="text-xs text-primary-foreground/60 truncate">
                {user.email}
              </p>
              {userRole && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "mt-1 text-[10px] px-1.5 py-0 h-5 gap-1",
                    ROLE_BADGE_COLORS[userRole.role]
                  )}
                >
                  {ROLE_ICONS[userRole.role]}
                  {ROLE_LABELS[userRole.role]}
                </Badge>
              )}
            </div>
          )}
          {collapsed && !mobileOpen && userRole && (
            <div className="flex justify-center mb-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "p-1 h-6 w-6 flex items-center justify-center",
                  ROLE_BADGE_COLORS[userRole.role]
                )}
                title={ROLE_LABELS[userRole.role]}
              >
                {ROLE_ICONS[userRole.role]}
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
            className="w-full text-primary-foreground/70 hover:text-primary-foreground hover:bg-navy-light justify-start"
          >
            <LogOut className={cn("h-4 w-4", (!collapsed || mobileOpen) && "mr-2")} />
            {(!collapsed || mobileOpen) && <span className="text-sm">Déconnexion</span>}
          </Button>
        </div>

        {/* Collapse Button - Desktop only */}
        <div className="p-3 border-t border-navy-light hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapsedChange(!collapsed)}
            className="w-full text-primary-foreground/70 hover:text-primary-foreground hover:bg-navy-light"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Réduire</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
