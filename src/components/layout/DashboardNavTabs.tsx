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

const NAV_ITEMS = [
  { label: "Tableau de Bord", path: "/dashboard", icon: LayoutDashboard },
  { label: "Propriétaires", path: "/owners", icon: Users },
  { label: "Biens", path: "/properties", icon: Building2 },
  { label: "Locataires", path: "/tenants", icon: UserCheck },
  { label: "Paiements", path: "/payments", icon: CreditCard },
  { label: "Rapports", path: "/rapports", icon: BarChart3 },
  { label: "Point Mensuel", path: "/comptabilite", icon: FileText },
];

export function DashboardNavTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 overflow-x-auto scrollbar-hide">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
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
