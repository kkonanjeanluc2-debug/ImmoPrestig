import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ColocationTenant {
  id: string;
  contract_id: string;
  tenant_id: string;
  is_principal: boolean;
  start_date: string;
  end_date: string | null;
  status: string;
  rent_share: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    profession: string | null;
  };
}

export const useColocationTenants = (contractId?: string) => {
  return useQuery({
    queryKey: ["colocation-tenants", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colocation_tenants")
        .select(`
          *,
          tenant:tenants(id, name, email, phone, profession)
        `)
        .eq("contract_id", contractId!)
        .order("is_principal", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ColocationTenant[];
    },
    enabled: !!contractId,
  });
};

export const useAddColocationTenant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      contract_id: string;
      tenant_id: string;
      is_principal?: boolean;
      start_date: string;
      end_date?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: result, error } = await supabase
        .from("colocation_tenants")
        .insert({
          ...data,
          user_id: user.id,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["colocation-tenants", variables.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

export const useRemoveColocationTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contractId }: { id: string; contractId: string }) => {
      const { error } = await supabase
        .from("colocation_tenants")
        .update({ status: "departed", end_date: new Date().toISOString().split("T")[0] })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["colocation-tenants", variables.contractId] });
    },
  });
};
