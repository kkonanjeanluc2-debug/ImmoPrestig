import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export type InterestLevel = "faible" | "moyen" | "eleve";
export type ProspectStatus = "nouveau" | "contacte" | "interesse" | "negociation" | "perdu" | "converti";

export interface VenteProspect {
  id: string;
  user_id: string;
  bien_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  interest_level: InterestLevel;
  status: ProspectStatus;
  notes: string | null;
  first_contact_date: string | null;
  last_contact_date: string | null;
  next_followup_date: string | null;
  source: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenteProspectInsert {
  bien_id?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  interest_level?: InterestLevel;
  status?: ProspectStatus;
  notes?: string | null;
  first_contact_date?: string | null;
  last_contact_date?: string | null;
  next_followup_date?: string | null;
  source?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
}

export interface VenteProspectUpdate extends Partial<VenteProspectInsert> {
  id: string;
}

export const useVenteProspects = (bienId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vente-prospects", bienId],
    queryFn: async () => {
      let query = supabase
        .from("vente_prospects")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (bienId) {
        query = query.eq("bien_id", bienId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VenteProspect[];
    },
    enabled: !!user,
  });
};

export const useAllVenteProspects = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-vente-prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vente_prospects")
        .select(`
          *,
          bien:biens_vente(id, title, address, property_type, price)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateVenteProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prospect: VenteProspectInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("vente_prospects")
        .insert({ ...prospect, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "prospect",
        data.name,
        data.id
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vente-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["all-vente-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateVenteProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: VenteProspectUpdate) => {
      const { data, error } = await supabase
        .from("vente_prospects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "prospect", data.name, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vente-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["all-vente-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteVenteProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      // Soft delete - move to trash
      const { error } = await supabase
        .from("vente_prospects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "prospect", name || "Prospect supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vente-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["all-vente-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
