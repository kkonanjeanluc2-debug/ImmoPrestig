import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Bell, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-muted">
      <Sidebar />
      
      {/* Main Content */}
      <div className="pl-64 transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un bien, locataire..." 
                className="pl-10 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-emerald rounded-full" />
            </Button>
            <div className="h-8 w-px bg-border" />
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
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
