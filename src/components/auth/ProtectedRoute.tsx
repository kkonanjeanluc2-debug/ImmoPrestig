import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/hooks/useAgency";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { useAgencySubscription } from "@/hooks/useAgencySubscription";
import { Loader2, Ban, AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";

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
  const { data: subscription, isLoading: subLoading } = useAgencySubscription();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = userRole?.role === "admin";
  const isTenant = userRole?.role === "locataire";

  const isSubscriptionExpired = useMemo(() => {
    if (!subscription) return false;
    if (subscription.status === "expired" || subscription.status === "cancelled") return true;
    if (subscription.ends_at) {
      return differenceInDays(parseISO(subscription.ends_at), new Date()) < 0;
    }
    return false;
  }, [subscription]);

  if (loading || agencyLoading || roleLoading || subLoading) {
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

  // Block access when subscription is expired
  if (isSubscriptionExpired && !isTenant) {
    // Allow admin to access settings page for renewal
    if (isAdmin && (location.pathname === "/settings" || location.pathname.startsWith("/settings"))) {
      return <>{children}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Abonnement expiré</CardTitle>
            <CardDescription className="text-base mt-2">
              {isAdmin
                ? "Votre abonnement a expiré. Veuillez renouveler votre forfait pour continuer à utiliser l'application."
                : "L'abonnement de votre agence a expiré. Veuillez contacter votre administrateur pour renouveler le forfait."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {isAdmin && (
              <Button 
                onClick={() => navigate("/settings?tab=subscription")}
                className="gap-2"
              >
                <Crown className="h-4 w-4" />
                Renouveler l'abonnement
              </Button>
            )}
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