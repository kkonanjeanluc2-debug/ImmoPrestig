import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export function InactivityHandler() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleInactivityTimeout = useCallback(async () => {
    if (user) {
      try {
        // Show toast before signOut
        toast.info("Session expirée", {
          description: "Vous avez été déconnecté après 5 minutes d'inactivité.",
        });
        
        // Sign out the user
        await signOut();
      } catch (error) {
        console.error("Error during inactivity signOut:", error);
      } finally {
        // Always redirect to login, even if signOut fails
        // The session might already be expired server-side
        navigate("/login", { replace: true, state: { from: location } });
      }
    }
  }, [user, signOut, navigate, location]);

  useInactivityTimeout({
    timeout: INACTIVITY_TIMEOUT,
    onTimeout: handleInactivityTimeout,
    enabled: !!user, // Only track when user is logged in
  });

  return null;
}
