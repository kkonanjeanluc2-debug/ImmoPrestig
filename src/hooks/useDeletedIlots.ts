import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Ilot } from "./useIlots";
import { logActivityDirect } from "@/lib/activityLogger";

export interface DeletedIlot extends Ilot {
  deleted_at: string;
  lotissement?: {
    name: string;
  } | null;
}

export const useDeletedIlots = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deleted-ilots", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ilots")
        .select(`
          *,
          lotissement:lotissements(name)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as DeletedIlot[];
    },
    enabled: !!user,
  });
};

export const useRestoreIlot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { data, error } = await supabase
        .from("ilots")
        .update({ deleted_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "restore",
          "ilot",
          name || data.name,
          id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ilots"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-ilots"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const usePermanentlyDeleteIlot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("ilots")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "permanent_delete",
          "ilot",
          name || "Îlot supprimé définitivement",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-ilots"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
