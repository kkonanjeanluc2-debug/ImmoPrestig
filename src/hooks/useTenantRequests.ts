import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TenantRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  property_id: string | null;
  category: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useTenantRequests = (tenantId?: string) => {
  return useQuery({
    queryKey: ["tenant-requests", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("tenant_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TenantRequest[];
    },
    enabled: !!tenantId,
  });
};

// For owner details: fetch requests for all tenants of an owner's properties
export const useOwnerTenantRequests = (tenantIds: string[]) => {
  return useQuery({
    queryKey: ["owner-tenant-requests", tenantIds],
    queryFn: async () => {
      if (tenantIds.length === 0) return [];
      const { data, error } = await supabase
        .from("tenant_requests")
        .select("*")
        .in("tenant_id", tenantIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenantRequest[];
    },
    enabled: tenantIds.length > 0,
  });
};

export const useCreateTenantRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: {
      tenant_id: string;
      user_id: string;
      property_id?: string | null;
      category: string;
      title: string;
      description?: string;
      priority?: string;
    }) => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .insert(request)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-requests"] });
      queryClient.invalidateQueries({ queryKey: ["owner-tenant-requests"] });
    },
  });
};

export const useUpdateTenantRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; admin_response?: string; responded_at?: string }) => {
      const { data, error } = await supabase
        .from("tenant_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-requests"] });
      queryClient.invalidateQueries({ queryKey: ["owner-tenant-requests"] });
    },
  });
};
