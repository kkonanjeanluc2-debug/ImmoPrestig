import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { useCallback, useState } from "react";

const VENTE_PROSPECTS_SEEN_KEY = "vente_prospects_last_seen";
const LOTISSEMENT_PROSPECTS_SEEN_KEY = "lotissement_prospects_last_seen";

const getLastSeen = (key: string): string => {
  return localStorage.getItem(key) || new Date(0).toISOString();
};

const setLastSeen = (key: string) => {
  localStorage.setItem(key, new Date().toISOString());
};

export const useNewVenteProspectsCount = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAgencyOwner();
  const [lastSeen, setLastSeenState] = useState(() => getLastSeen(VENTE_PROSPECTS_SEEN_KEY));

  const query = useQuery({
    queryKey: ["new-vente-prospects-count", lastSeen],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("vente_prospects")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gt("created_at", lastSeen);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isAdmin,
    staleTime: 30000,
  });

  const markAsSeen = useCallback(() => {
    setLastSeen(VENTE_PROSPECTS_SEEN_KEY);
    setLastSeenState(new Date().toISOString());
  }, []);

  return { count: isAdmin ? (query.data ?? 0) : 0, markAsSeen };
};

export const useNewLotissementProspectsCount = (lotissementId?: string) => {
  const { user } = useAuth();
  const { isAdmin } = useIsAgencyOwner();
  const storageKey = lotissementId 
    ? `${LOTISSEMENT_PROSPECTS_SEEN_KEY}_${lotissementId}` 
    : LOTISSEMENT_PROSPECTS_SEEN_KEY;
  const [lastSeen, setLastSeenState] = useState(() => getLastSeen(storageKey));

  const query = useQuery({
    queryKey: ["new-lotissement-prospects-count", lotissementId, lastSeen],
    queryFn: async () => {
      if (!lotissementId) return 0;

      const { data: parcelles, error: pError } = await supabase
        .from("parcelles")
        .select("id")
        .eq("lotissement_id", lotissementId);

      if (pError) throw pError;
      const parcelleIds = parcelles.map(p => p.id);
      if (parcelleIds.length === 0) return 0;

      const { count, error } = await supabase
        .from("parcelle_prospects")
        .select("id", { count: "exact", head: true })
        .in("parcelle_id", parcelleIds)
        .is("deleted_at", null)
        .gt("created_at", lastSeen);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isAdmin && !!lotissementId,
    staleTime: 30000,
  });

  const markAsSeen = useCallback(() => {
    setLastSeen(storageKey);
    setLastSeenState(new Date().toISOString());
  }, [storageKey]);

  return { count: isAdmin ? (query.data ?? 0) : 0, markAsSeen };
};

// Global count of all new lotissement prospects (across all lotissements)
export const useNewAllLotissementProspectsCount = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAgencyOwner();
  const [lastSeen, setLastSeenState] = useState(() => getLastSeen(LOTISSEMENT_PROSPECTS_SEEN_KEY));

  const query = useQuery({
    queryKey: ["new-all-lotissement-prospects-count", lastSeen],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("parcelle_prospects")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gt("created_at", lastSeen);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isAdmin,
    staleTime: 30000,
  });

  const markAsSeen = useCallback(() => {
    setLastSeen(LOTISSEMENT_PROSPECTS_SEEN_KEY);
    setLastSeenState(new Date().toISOString());
  }, []);

  return { count: isAdmin ? (query.data ?? 0) : 0, markAsSeen };
};
