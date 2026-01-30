import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export function InactivityHandler() {
  const { user, signOut } = useAuth();

  const handleInactivityTimeout = useCallback(async () => {
    if (user) {
      toast.info("Session expirée", {
        description: "Vous avez été déconnecté après 5 minutes d'inactivité.",
      });
      await signOut();
    }
  }, [user, signOut]);

  useInactivityTimeout({
    timeout: INACTIVITY_TIMEOUT,
    onTimeout: handleInactivityTimeout,
    enabled: !!user, // Only track when user is logged in
  });

  return null;
}
