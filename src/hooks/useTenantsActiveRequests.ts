import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantActiveRequest {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
}

export const useTenantsActiveRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenants-active-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .select("id, tenant_id, title, category, status, priority, created_at")
        .not("status", "eq", "resolu")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TenantActiveRequest[];
    },
    enabled: !!user,
  });
};

// Group requests by tenant_id
export const useTenantsActiveRequestsMap = () => {
  const { data: requests = [], ...rest } = useTenantsActiveRequests();

  const requestsByTenant = requests.reduce<Record<string, TenantActiveRequest[]>>((acc, req) => {
    if (!acc[req.tenant_id]) acc[req.tenant_id] = [];
    acc[req.tenant_id].push(req);
    return acc;
  }, {});

  return { requestsByTenant, ...rest };
};
