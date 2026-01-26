import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Contract = Tables<"contracts">;
export type ContractInsert = TablesInsert<"contracts">;
export type ContractUpdate = TablesUpdate<"contracts">;

export const useContracts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contracts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          property:properties(*),
          tenant:tenants(*),
          unit:property_units(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contract: Omit<ContractInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("contracts")
        .insert({ ...contract, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContractUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("contracts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

export const useExpireContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      contractId, 
      propertyId, 
      unitId 
    }: { 
      contractId: string; 
      propertyId: string; 
      unitId?: string | null;
    }) => {
      // Update contract status to expired
      const { error: contractError } = await supabase
        .from("contracts")
        .update({ status: "expired" })
        .eq("id", contractId);

      if (contractError) throw contractError;

      // If contract has a unit, update unit status to disponible
      if (unitId) {
        const { error: unitError } = await supabase
          .from("property_units")
          .update({ status: "disponible" })
          .eq("id", unitId);

        if (unitError) throw unitError;

        // Check if there are other occupied units for this property
        const { data: occupiedUnits, error: checkError } = await supabase
          .from("property_units")
          .select("id")
          .eq("property_id", propertyId)
          .eq("status", "loué");

        if (checkError) throw checkError;

        // Only update property to disponible if no more occupied units
        if (!occupiedUnits || occupiedUnits.length === 0) {
          const { error: propertyError } = await supabase
            .from("properties")
            .update({ status: "disponible" })
            .eq("id", propertyId);

          if (propertyError) throw propertyError;
        }
      } else {
        // No unit - just update property status to disponible
        const { error: propertyError } = await supabase
          .from("properties")
          .update({ status: "disponible" })
          .eq("id", propertyId);

        if (propertyError) throw propertyError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["property-units"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
};
