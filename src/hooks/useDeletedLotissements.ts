import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Lotissement } from "./useLotissements";
import { logActivityDirect } from "@/lib/activityLogger";

export const useDeletedLotissements = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deleted-lotissements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotissements")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as (Lotissement & { deleted_at: string })[];
    },
    enabled: !!user,
  });
};

export const useRestoreLotissement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { data, error } = await supabase
        .from("lotissements")
        .update({ deleted_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "restore",
          "lotissement",
          name || data.name,
          id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const usePermanentlyDeleteLotissement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("lotissements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "permanent_delete",
          "lotissement",
          name || "Lotissement supprimé définitivement",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
