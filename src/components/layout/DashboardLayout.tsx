import { ReactNode, useState, useCallback, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { User, Moon, MoonStar, Crown, UserCog, Eye, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLatePaymentNotifications } from "@/hooks/useLatePaymentNotifications";
import { usePushNotificationTrigger } from "@/hooks/usePushNotificationTrigger";
import { useDoNotDisturb } from "@/hooks/useDoNotDisturb";
import { useBrandColors } from "@/hooks/useBrandColors";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserRole, ROLE_LABELS, AppRole } from "@/hooks/useUserRoles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  super_admin: <Crown className="h-3 w-3" />,
  admin: <Crown className="h-3 w-3" />,
  gestionnaire: <UserCog className="h-3 w-3" />,
  lecture_seule: <Eye className="h-3 w-3" />,
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-amber-100 text-amber-700 border-amber-200",
  gestionnaire: "bg-blue-100 text-blue-700 border-blue-200",
  lecture_seule: "bg-gray-100 text-gray-600 border-gray-200",
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dndKey, setDndKey] = useState(0); // Force re-render on DND change
  const { getSchedule, saveSchedule, isInDNDPeriod } = useDoNotDisturb();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: userRole } = useCurrentUserRole();
  
  // Fetch user profile for display name
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  
  const schedule = getSchedule();
  const isInPeriod = isInDNDPeriod();
  const isDNDActive = schedule.enabled && isInPeriod;
  
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Utilisateur";
  const currentRole = userRole?.role || "lecture_seule";
  
  // Subscribe to real-time late payment notifications
  useLatePaymentNotifications();
  
  // Trigger browser push notifications for new in-app notifications
  usePushNotificationTrigger();

  // Apply brand colors from agency settings
  useBrandColors();

  // Live date and time
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleDND = useCallback(() => {
    const currentSchedule = getSchedule();
    const newEnabled = !currentSchedule.enabled;
    saveSchedule({ ...currentSchedule, enabled: newEnabled });
    setDndKey((k) => k + 1); // Force re-render
    
    toast({
      title: newEnabled ? "Ne pas déranger activé" : "Ne pas déranger désactivé",
      description: newEnabled 
        ? `Sons désactivés de ${currentSchedule.startTime} à ${currentSchedule.endTime}`
        : "Vous recevrez à nouveau les sons de notification",
    });
  }, [getSchedule, saveSchedule, toast]);

  return (
    <div className="min-h-screen bg-muted" key={dndKey}>
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      
      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        // Desktop: adjust padding based on sidebar state
        collapsed ? "lg:pl-16" : "lg:pl-64",
        // Mobile: no left padding (sidebar is overlay)
        "pl-0"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6 shadow-sm">
          {/* Spacer for mobile menu button */}
          <div className="w-10 lg:hidden flex-shrink-0" />
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-primary/5 to-accent/5 px-3 sm:px-4 py-2 rounded-lg border border-primary/10">
              <div className="flex items-center gap-1.5 text-primary">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">
                  {format(currentTime, "EEEE d MMMM yyyy", { locale: fr })}
                </span>
                <span className="text-sm font-medium sm:hidden">
                  {format(currentTime, "d MMM yyyy", { locale: fr })}
                </span>
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-1.5 text-accent">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-semibold tabular-nums animate-fade-in-out">
                  {format(currentTime, "HH")}
                  <span className="animate-pulse">:</span>
                  {format(currentTime, "mm")}
                  <span className="animate-pulse">:</span>
                  {format(currentTime, "ss")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Do Not Disturb Toggle Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleDND}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 h-8 w-8 sm:w-auto rounded-full transition-colors",
                      isDNDActive
                        ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {isDNDActive ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <MoonStar className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium hidden sm:inline">
                      {isDNDActive ? "NPD" : ""}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isDNDActive ? (
                    <>
                      <p>Mode Ne pas déranger actif</p>
                      <p className="text-xs text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cliquer pour désactiver
                      </p>
                    </>
                  ) : (
                    <p>Activer Ne pas déranger</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <NotificationCenter />
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden md:flex flex-col items-start gap-0.5">
                <p className="text-sm font-medium text-foreground leading-none">
                  {displayName}
                </p>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 font-medium flex items-center gap-1",
                    ROLE_COLORS[currentRole]
                  )}
                >
                  {ROLE_ICONS[currentRole]}
                  {ROLE_LABELS[currentRole]}
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
