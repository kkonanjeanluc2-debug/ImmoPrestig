import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface PropertyIntervention {
  id: string;
  user_id: string;
  property_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  cost: number | null;
  start_date: string;
  end_date: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyInterventionInsert {
  property_id: string;
  title: string;
  description?: string | null;
  type?: string;
  status?: string;
  priority?: string;
  cost?: number | null;
  start_date?: string;
  end_date?: string | null;
  provider_name?: string | null;
  provider_phone?: string | null;
  notes?: string | null;
}

export interface PropertyInterventionUpdate extends Partial<PropertyInterventionInsert> {
  id: string;
}

export const usePropertyInterventions = (propertyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-interventions", propertyId],
    queryFn: async () => {
      let query = supabase
        .from("property_interventions")
        .select("*")
        .order("created_at", { ascending: false });

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PropertyIntervention[];
    },
    enabled: !!user,
  });
};

export const useOwnerInterventions = (ownerId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-interventions", ownerId],
    queryFn: async () => {
      // First get all properties for this owner
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("id, title")
        .eq("owner_id", ownerId)
        .is("deleted_at", null);

      if (propError) throw propError;
      if (!properties || properties.length === 0) return [];

      const propertyIds = properties.map(p => p.id);

      // Then get all interventions for these properties
      const { data, error } = await supabase
        .from("property_interventions")
        .select("*")
        .in("property_id", propertyIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Attach property title to each intervention
      return (data as PropertyIntervention[]).map(intervention => ({
        ...intervention,
        property_title: properties.find(p => p.id === intervention.property_id)?.title || "Bien inconnu"
      }));
    },
    enabled: !!user && !!ownerId,
  });
};

export const useCreatePropertyIntervention = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (intervention: PropertyInterventionInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("property_interventions")
        .insert({ ...intervention, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "intervention",
        data.title,
        data.id,
        { type: data.type, property_id: data.property_id }
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["owner-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdatePropertyIntervention = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyInterventionUpdate) => {
      const { data, error } = await supabase
        .from("property_interventions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "update",
          "intervention",
          data.title,
          data.id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["owner-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeletePropertyIntervention = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      const { error } = await supabase
        .from("property_interventions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "delete",
          "intervention",
          title || "Intervention supprimée",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["owner-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
