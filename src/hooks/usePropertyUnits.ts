import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PropertyUnit {
  id: string;
  property_id: string;
  user_id: string;
  unit_number: string;
  rooms_count: number;
  rent_amount: number;
  area: number | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyUnitInsert {
  property_id: string;
  unit_number: string;
  rooms_count: number;
  rent_amount: number;
  area?: number | null;
  description?: string | null;
  status?: string;
}

export interface PropertyUnitUpdate {
  id: string;
  unit_number?: string;
  rooms_count?: number;
  rent_amount?: number;
  area?: number | null;
  description?: string | null;
  status?: string;
}

export const usePropertyUnits = (propertyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-units", propertyId],
    queryFn: async () => {
      let query = supabase
        .from("property_units")
        .select("*")
        .order("unit_number", { ascending: true });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PropertyUnit[];
    },
    enabled: !!user && !!propertyId,
  });
};

export const useAllPropertyUnits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-units-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_units")
        .select("*, property:properties(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (PropertyUnit & { property: any })[];
    },
    enabled: !!user,
  });
};

export const useCreatePropertyUnit = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (unit: PropertyUnitInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("property_units")
        .insert({ ...unit, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as PropertyUnit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-units", data.property_id] });
      queryClient.invalidateQueries({ queryKey: ["property-units-all"] });
      queryClient.invalidateQueries({ queryKey: ["property-units-summary"] });
    },
  });
};

export const useUpdatePropertyUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyUnitUpdate) => {
      const { data, error } = await supabase
        .from("property_units")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // If the rent changed, propagate it to the active contract(s) of this unit
      // so that future receipts/payments use the new amount immediately.
      if (updates.rent_amount !== undefined && updates.rent_amount !== null) {
        try {
          const { data: activeContracts } = await supabase
            .from("contracts")
            .select("id, tenant_id")
            .eq("unit_id", id)
            .eq("status", "active")
            .is("deleted_at", null);

          if (activeContracts && activeContracts.length > 0) {
            const contractIds = activeContracts.map((c: any) => c.id);
            await supabase
              .from("contracts")
              .update({ rent_amount: updates.rent_amount })
              .in("id", contractIds);
          }
        } catch (e) {
          console.error("Failed to propagate rent change to contracts:", e);
        }
      }

      return data as PropertyUnit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-units", data.property_id] });
      queryClient.invalidateQueries({ queryKey: ["property-units-all"] });
      queryClient.invalidateQueries({ queryKey: ["property-units-summary"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["property-tenants"] });
    },
  });
};

export const useDeletePropertyUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase
        .from("property_units")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, propertyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-units", data.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property-units-all"] });
      queryClient.invalidateQueries({ queryKey: ["property-units-summary"] });
    },
  });
};
