import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Tenant = Tables<"tenants">;
export type TenantInsert = TablesInsert<"tenants">;
export type TenantUpdate = TablesUpdate<"tenants">;

export type TenantWithDetails = Tenant & {
  property?: Tables<"properties"> | null;
  contracts?: Tables<"contracts">[];
  payments?: Tables<"payments">[];
};

export const useTenants = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tenants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(*),
          contracts(*),
          payments(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TenantWithDetails[];
    },
    enabled: !!user,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tenant: Omit<TenantInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("tenants")
        .insert({ ...tenant, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TenantUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First, get the tenant to find their property_id
      const { data: tenant, error: fetchError } = await supabase
        .from("tenants")
        .select("property_id")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const propertyId = tenant?.property_id;

      // Delete the tenant (contracts and payments will need cascade or manual deletion)
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;

      // If tenant had a property, update its status to 'disponible'
      if (propertyId) {
        const { error: updateError } = await supabase
          .from("properties")
          .update({ status: "disponible" })
          .eq("id", propertyId);
        
        if (updateError) {
          console.error("Error updating property status:", updateError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
};
