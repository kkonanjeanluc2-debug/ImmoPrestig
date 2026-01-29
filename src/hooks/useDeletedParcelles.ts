import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Parcelle } from "./useParcelles";
import { logActivityDirect } from "@/lib/activityLogger";

export interface DeletedParcelle extends Parcelle {
  deleted_at: string;
  lotissement?: {
    name: string;
  } | null;
}

export const useDeletedParcelles = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deleted-parcelles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelles")
        .select(`
          *,
          lotissement:lotissements(name)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as DeletedParcelle[];
    },
    enabled: !!user,
  });
};

export const useRestoreParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, plotNumber }: { id: string; plotNumber?: string }) => {
      const { data, error } = await supabase
        .from("parcelles")
        .update({ deleted_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "restore",
          "parcelle",
          `Lot ${plotNumber || data.plot_number}`,
          id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const usePermanentlyDeleteParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, plotNumber }: { id: string; plotNumber?: string }) => {
      const { error } = await supabase
        .from("parcelles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "permanent_delete",
          "parcelle",
          `Lot ${plotNumber || "supprimé définitivement"}`,
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
