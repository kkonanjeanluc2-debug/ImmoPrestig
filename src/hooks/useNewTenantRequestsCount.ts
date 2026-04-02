import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { useCallback, useState, useEffect } from "react";

const REQUESTS_SEEN_KEY = "tenant_requests_last_seen";

const getLastSeen = (): string => {
  return localStorage.getItem(REQUESTS_SEEN_KEY) || new Date(0).toISOString();
};

const setLastSeen = () => {
  localStorage.setItem(REQUESTS_SEEN_KEY, new Date().toISOString());
};

export const useNewTenantRequestsCount = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAgencyOwner();
  const [lastSeen, setLastSeenState] = useState(() => getLastSeen());
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["new-tenant-requests-count", lastSeen],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tenant_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "nouveau")
        .gt("created_at", lastSeen);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user && isAdmin,
    staleTime: 30000,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel("tenant-requests-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tenant_requests",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["new-tenant-requests-count"] });
          queryClient.invalidateQueries({ queryKey: ["new-tenant-requests-list"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tenant_requests",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["new-tenant-requests-count"] });
          queryClient.invalidateQueries({ queryKey: ["new-tenant-requests-list"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, queryClient]);

  const markAsSeen = useCallback(() => {
    setLastSeen();
    setLastSeenState(new Date().toISOString());
  }, []);

  return { count: isAdmin ? (query.data ?? 0) : 0, markAsSeen, requests: query };
};

// Fetch the actual new requests for the dialog
export const useNewTenantRequests = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAgencyOwner();

  return useQuery({
    queryKey: ["new-tenant-requests-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .select("*, tenants:tenant_id(name, email, phone)")
        .eq("status", "nouveau")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
    staleTime: 30000,
  });
};
