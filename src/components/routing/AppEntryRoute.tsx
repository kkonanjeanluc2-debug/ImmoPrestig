import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PageSkeleton from "@/components/PageSkeleton";
import { getDedicatedLoginPath, hasDedicatedLoginSlug } from "@/lib/dedicatedLogin";

interface AppEntryRouteProps {
  fallback: React.ReactNode;
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function AppEntryRoute({ fallback }: AppEntryRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (isStandaloneApp() && hasDedicatedLoginSlug()) {
    return <Navigate to={user ? "/dashboard" : getDedicatedLoginPath()} replace />;
  }

  return <>{fallback}</>;
}