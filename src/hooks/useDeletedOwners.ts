import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OwnerWithManagementType } from "./useOwners";
import { logActivityDirect } from "@/lib/activityLogger";

export const useDeletedOwners = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deleted-owners", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owners")
        .select(`
          *,
          management_type:management_types(id, name, percentage, type)
        `)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      return data as OwnerWithManagementType[];
    },
    enabled: !!user,
  });
};

export const useRestoreOwner = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { data, error } = await supabase
        .from("owners")
        .update({ deleted_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "restore",
          "owner",
          name || data.name,
          id
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-owners"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const usePermanentlyDeleteOwner = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("owners")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(
          user.id,
          "permanent_delete",
          "owner",
          name || "Propriétaire supprimé définitivement",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted-owners"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
