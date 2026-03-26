import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  CreditCard,
  BarChart3,
  FileText,
} from "lucide-react";

export const NAV_ITEMS = [
  { label: "Tableau de Bord", path: "/dashboard", icon: LayoutDashboard },
  { label: "Propriétaires", path: "/owners", icon: Users },
  { label: "Biens", path: "/properties", icon: Building2 },
  { label: "Locataires", path: "/tenants", icon: UserCheck },
  { label: "Paiements", path: "/payments", icon: CreditCard },
  { label: "Lotissements", path: "/lotissements", icon: MapPin },
  { label: "Rapports", path: "/rapports", icon: BarChart3 },
  { label: "Comptabilité", path: "/comptabilite", icon: FileText },
];

interface DashboardNavTabsProps {
  mode?: "navigate" | "showcase";
  activeTab?: string;
  onTabChange?: (path: string) => void;
}

export function DashboardNavTabs({ mode = "navigate", activeTab, onTabChange }: DashboardNavTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (path: string) => {
    if (mode === "showcase" && onTabChange) {
      onTabChange(path);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 overflow-x-auto scrollbar-hide">
      {NAV_ITEMS.map((item) => {
        const isActive = mode === "showcase" ? activeTab === item.path : location.pathname === item.path;
        const Icon = item.icon;

        return (
          <button
            key={item.path}
            onClick={() => handleClick(item.path)}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
