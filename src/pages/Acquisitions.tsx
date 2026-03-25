import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AcquisitionsList } from "@/components/acquisition/AcquisitionsList";
import { usePermissions } from "@/hooks/usePermissions";

export default function Acquisitions() {
  const { hasPermission, role, isLoading } = usePermissions();
  const isAdmin = role === "super_admin" || role === "admin";

  if (!isLoading && !isAdmin && !hasPermission("can_view_achats")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">Acquisitions de biens</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gérez vos acquisitions par donation, héritage, apport en société ou échange
          </p>
        </div>
        <AcquisitionsList />
      </div>
    </DashboardLayout>
  );
}
