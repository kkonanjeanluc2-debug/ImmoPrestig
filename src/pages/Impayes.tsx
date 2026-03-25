import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UnpaidCasesList } from "@/components/impayes/UnpaidCasesList";
import { AIAdvisorChat } from "@/components/ai/AIAdvisorChat";
import { usePermissions } from "@/hooks/usePermissions";

export default function Impayes() {
  const { hasPermission, role, isLoading } = usePermissions();

  if (!isLoading && role !== "super_admin" && role !== "admin" && !hasPermission("can_view_impayes")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="pt-8 sm:pt-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Gestion des impayés
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Suivi des dossiers d'impayés et procédures de recouvrement
          </p>
        </div>
        <UnpaidCasesList />
      </div>
      <AIAdvisorChat context="unpaid" title="Conseiller Recouvrement" />
    </DashboardLayout>
  );
}
