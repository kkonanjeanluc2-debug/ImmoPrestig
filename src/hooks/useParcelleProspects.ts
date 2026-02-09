import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";
import { useCurrentUserRole } from "@/hooks/useUserRoles";

export type InterestLevel = "faible" | "moyen" | "eleve";
export type ProspectStatus = "nouveau" | "contacte" | "interesse" | "negociation" | "perdu" | "converti";

export interface ParcelleProspect {
  id: string;
  user_id: string;
  parcelle_id: string;
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
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelleProspectInsert {
  parcelle_id: string;
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

export interface ParcelleProspectUpdate extends Partial<ParcelleProspectInsert> {
  id: string;
}

export const useParcelleProspects = (parcelleId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["parcelle-prospects", parcelleId],
    queryFn: async () => {
      let query = supabase
        .from("parcelle_prospects")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (parcelleId) {
        query = query.eq("parcelle_id", parcelleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ParcelleProspect[];
    },
    enabled: !!user,
  });
};

export const useLotissementProspects = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lotissement-prospects", lotissementId],
    queryFn: async () => {
      // First get all parcelles for this lotissement
      const { data: parcelles, error: parcellesError } = await supabase
        .from("parcelles")
        .select("id")
        .eq("lotissement_id", lotissementId!);

      if (parcellesError) throw parcellesError;

      const parcelleIds = parcelles.map(p => p.id);

      if (parcelleIds.length === 0) return [];

      const { data, error } = await supabase
        .from("parcelle_prospects")
        .select("*")
        .in("parcelle_id", parcelleIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ParcelleProspect[];
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useCreateParcelleProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prospect: ParcelleProspectInsert) => {
      if (!user) throw new Error("User not authenticated");

      // The prospect is ALWAYS assigned to the creator
      const assignedTo = user.id;

      const { data, error } = await supabase
        .from("parcelle_prospects")
        .insert({ ...prospect, user_id: user.id, assigned_to: assignedTo })
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parcelle-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateParcelleProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ParcelleProspectUpdate) => {
      const { data, error } = await supabase
        .from("parcelle_prospects")
        .update(updates as any)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (user && data) {
        await logActivityDirect(user.id, "update", "prospect", data.name, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelle-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteParcelleProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      // Soft delete - move to trash
      const { error } = await supabase
        .from("parcelle_prospects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "prospect", name || "Prospect supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelle-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useConvertProspectToSale = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prospectId: string) => {
      const { data, error } = await supabase
        .from("parcelle_prospects")
        .update({ status: "converti" as ProspectStatus })
        .eq("id", prospectId)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "prospect", `${data.name} converti en vente`, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelle-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
