import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";
import type { BienVente } from "./useBiensVente";

export const useDeletedBiensVente = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["biens-vente", "deleted"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens_vente")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as BienVente[];
    },
    enabled: !!user,
  });
};

export const useRestoreBienVente = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      const { error } = await supabase
        .from("biens_vente")
        .update({ deleted_at: null })
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "restore", "bien_vente", title || "Bien restauré", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const usePermanentlyDeleteBienVente = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      const { error } = await supabase
        .from("biens_vente")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "permanent_delete", "bien_vente", title || "Bien supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
