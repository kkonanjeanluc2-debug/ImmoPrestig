import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/hooks/useAgency";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes interdites aux locataires
const TENANT_FORBIDDEN_ROUTES = [
  "/dashboard",
  "/properties",
  "/owners",
  "/settings",
  "/trash",
  "/super-admin",
];

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, signOut } = useAuth();
  const { data: agency, isLoading: agencyLoading } = useAgency();
  const { data: userRole, isLoading: roleLoading } = useCurrentUserRole();
  const location = useLocation();

  if (loading || agencyLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Rediriger les locataires vers /payments s'ils accèdent à une route interdite
  const isTenant = userRole?.role === "locataire";
  if (isTenant) {
    const currentPath = location.pathname;
    const isForbidden = TENANT_FORBIDDEN_ROUTES.some(
      (route) => currentPath === route || currentPath.startsWith(route + "/")
    );
    if (isForbidden) {
      return <Navigate to="/payments" replace />;
    }
  }

  // Check if the agency account is deactivated
  if (agency && agency.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Compte désactivé</CardTitle>
            <CardDescription>
              Votre compte a été désactivé par l'administrateur. 
              Veuillez contacter le support pour plus d'informations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => signOut()}
            >
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;