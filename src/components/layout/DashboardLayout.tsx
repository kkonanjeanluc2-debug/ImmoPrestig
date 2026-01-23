import { ReactNode, useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { Search, User, Moon, MoonStar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLatePaymentNotifications } from "@/hooks/useLatePaymentNotifications";
import { usePushNotificationTrigger } from "@/hooks/usePushNotificationTrigger";
import { useDoNotDisturb } from "@/hooks/useDoNotDisturb";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dndKey, setDndKey] = useState(0); // Force re-render on DND change
  const { getSchedule, saveSchedule, isInDNDPeriod } = useDoNotDisturb();
  const { toast } = useToast();
  
  const schedule = getSchedule();
  const isInPeriod = isInDNDPeriod();
  const isDNDActive = schedule.enabled && isInPeriod;
  
  // Subscribe to real-time late payment notifications
  useLatePaymentNotifications();
  
  // Trigger browser push notifications for new in-app notifications
  usePushNotificationTrigger();

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
        <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shadow-sm">
          {/* Spacer for mobile menu button */}
          <div className="w-10 lg:hidden" />
          
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher..." 
                className="pl-10 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Do Not Disturb Toggle Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleDND}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 h-8 rounded-full transition-colors",
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
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-navy flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">Jean Dupont</p>
                <p className="text-xs text-muted-foreground">Administrateur</p>
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
