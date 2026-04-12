import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency } from "@/hooks/useAgency";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { useAgencySubscription } from "@/hooks/useAgencySubscription";
import { Loader2, Ban, AlertTriangle, Crown, CreditCard } from "lucide-react";
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
    // Check trial expiry
    if (subscription.status === "trial" && subscription.trial_ends_at) {
      return differenceInDays(parseISO(subscription.trial_ends_at), new Date()) < 0;
    }
    // Check ends_at
    if (subscription.ends_at) {
      return differenceInDays(parseISO(subscription.ends_at), new Date()) < 0;
    }
    // For paid plans without ends_at, compute from starts_at + billing cycle
    if (subscription.billing_cycle !== "lifetime" && subscription.plan.price_monthly > 0 && subscription.starts_at) {
      const start = parseISO(subscription.starts_at);
      const cycleMonths: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
      const months = cycleMonths[subscription.billing_cycle] || 1;
      const expectedEnd = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
      return differenceInDays(expectedEnd, new Date()) < 0;
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

  // Block access when subscription is pending payment
  if (subscription?.status === "pending_payment" && !isTenant) {
    // Allow admin to access settings page for payment
    if (isAdmin && (location.pathname === "/settings" || location.pathname.startsWith("/settings"))) {
      return <>{children}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
             <CardTitle>Paiement requis</CardTitle>
             <CardDescription className="text-base mt-2">
               {isAdmin
                 ? "Veuillez souscrire à un forfait et effectuer le paiement pour accéder à l'application."
                 : "L'abonnement de votre agence n'a pas encore été activé. Veuillez contacter votre administrateur pour finaliser le paiement."}
             </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {isAdmin && (
              <Button 
                onClick={() => navigate(`/settings?tab=subscription&upgrade_plan=${encodeURIComponent(subscription?.plan_id || "")}`)}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Choisir un forfait et payer
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
             <CardTitle className="text-destructive">
               {subscription?.status === "trial" ? "Période d'essai terminée" : "Abonnement expiré"}
             </CardTitle>
             <CardDescription className="text-base mt-2">
               {isAdmin
                 ? subscription?.status === "trial"
                   ? "Votre période d'essai gratuite de 30 jours est terminée. Choisissez un forfait pour continuer à utiliser l'application."
                   : "Votre abonnement a expiré. Veuillez renouveler votre forfait pour continuer à utiliser l'application."
                 : "L'abonnement de votre agence a expiré. Veuillez contacter votre administrateur pour renouveler le forfait."}
             </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {isAdmin && (
              <Button 
                onClick={() => navigate(`/settings?tab=subscription&upgrade_plan=${encodeURIComponent(subscription?.plan_id || "")}`)}
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