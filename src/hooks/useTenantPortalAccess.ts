import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreateTenantPortalAccessData {
  tenant_id: string;
  password: string;
}

export function useCreateTenantPortalAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTenantPortalAccessData) => {
      const { data: result, error } = await supabase.functions.invoke("create-tenant-portal-access", {
        body: data,
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-limits"] });
    },
  });
}

export function useRevokeTenantPortalAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenant_id: string) => {
      const { data: result, error } = await supabase.functions.invoke("revoke-tenant-portal-access", {
        body: { tenant_id },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-limits"] });
    },
  });
}
