import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface DemarcheAdministrative {
  id: string;
  user_id: string;
  lotissement_id: string;
  parcelle_id: string | null;
  type: string;
  title: string;
  description: string | null;
  authority: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  result: string | null;
  cost: number | null;
  documents_required: string[] | null;
  documents_submitted: string[] | null;
  next_steps: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemarcheAdministrativeInsert {
  lotissement_id: string;
  parcelle_id?: string | null;
  type: string;
  title: string;
  description?: string | null;
  authority?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  status?: string;
  start_date?: string;
  end_date?: string | null;
  result?: string | null;
  cost?: number | null;
  documents_required?: string[] | null;
  documents_submitted?: string[] | null;
  next_steps?: string | null;
}

export const useDemarchesAdministratives = (lotissementId?: string, parcelleId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["demarches-administratives", lotissementId, parcelleId],
    queryFn: async () => {
      let query = supabase
        .from("demarches_administratives")
        .select("*")
        .order("start_date", { ascending: false });

      if (lotissementId) {
        query = query.eq("lotissement_id", lotissementId);
      }

      if (parcelleId) {
        query = query.eq("parcelle_id", parcelleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DemarcheAdministrative[];
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useCreateDemarcheAdministrative = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (demarche: DemarcheAdministrativeInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("demarches_administratives")
        .insert({ ...demarche, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "demarche_administrative",
        data.title,
        data.id,
        { type: data.type, authority: data.authority }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demarches-administratives"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateDemarcheAdministrative = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DemarcheAdministrative> & { id: string }) => {
      const { data, error } = await supabase
        .from("demarches_administratives")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "demarche_administrative", data.title, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demarches-administratives"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteDemarcheAdministrative = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      const { error } = await supabase
        .from("demarches_administratives")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "demarche_administrative", title || "Démarche supprimée", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demarches-administratives"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
