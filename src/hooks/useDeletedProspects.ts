import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ParcelleProspect } from "./useParcelleProspects";
import { logActivityDirect } from "@/lib/activityLogger";

export interface DeletedProspect extends ParcelleProspect {
  deleted_at: string;
  parcelle?: {
    plot_number: string;
    lotissement?: {
      name: string;
    } | null;
  } | null;
}

export const useDeletedProspects = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deleted-prospects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelle_prospects")
        .select(`
          *,
          parcelle:parcelles(
            plot_number,
            lotissement:lotissements(name)
          )
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as DeletedProspect[];
    },
    enabled: !!user,
  });
};

export const useRestoreProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { data, error } = await supabase
        .from("parcelle_prospects")
        .update({ deleted_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "restore",
          "prospect",
          name || data.name,
          id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelle-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["lotissement-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const usePermanentlyDeleteProspect = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("parcelle_prospects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "permanent_delete",
          "prospect",
          name || "Prospect supprimé définitivement",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
