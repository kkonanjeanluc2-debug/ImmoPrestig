import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Agency } from "./useAgency";

/**
 * Hook to fetch the agency that owns the tenant's data.
 * Used when a tenant is logged in via their portal to get the agency's payment info.
 */
export function useTenantAgency(agencyOwnerId: string | undefined | null) {
  return useQuery({
    queryKey: ["tenant-agency", agencyOwnerId],
    queryFn: async () => {
      if (!agencyOwnerId) return null;

      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("user_id", agencyOwnerId)
        .maybeSingle();

      if (error) throw error;
      return data as Agency | null;
    },
    enabled: !!agencyOwnerId,
  });
}
