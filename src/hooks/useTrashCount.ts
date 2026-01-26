import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TrashCount {
  tenants: number;
  properties: number;
  owners: number;
  total: number;
}

export const useTrashCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trash-count", user?.id],
    queryFn: async (): Promise<TrashCount> => {
      const [tenantsResult, propertiesResult, ownersResult] = await Promise.all([
        supabase
          .from("tenants")
          .select("id", { count: "exact", head: true })
          .not("deleted_at", "is", null),
        supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .not("deleted_at", "is", null),
        supabase
          .from("owners")
          .select("id", { count: "exact", head: true })
          .not("deleted_at", "is", null),
      ]);

      const tenants = tenantsResult.count ?? 0;
      const properties = propertiesResult.count ?? 0;
      const owners = ownersResult.count ?? 0;

      return {
        tenants,
        properties,
        owners,
        total: tenants + properties + owners,
      };
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
};
