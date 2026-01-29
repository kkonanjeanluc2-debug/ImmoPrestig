import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface Lotissement {
  id: string;
  user_id: string;
  name: string;
  location: string;
  city: string | null;
  total_area: number | null;
  total_plots: number | null;
  description: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotissementInsert {
  name: string;
  location: string;
  city?: string | null;
  total_area?: number | null;
  total_plots?: number | null;
  description?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LotissementUpdate extends Partial<LotissementInsert> {
  id: string;
}

export const useLotissements = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lotissements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotissements")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lotissement[];
    },
    enabled: !!user,
  });
};

export const useLotissement = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lotissements", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotissements")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Lotissement | null;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateLotissement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lotissement: LotissementInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("lotissements")
        .insert({ ...lotissement, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "lotissement",
        data.name,
        data.id,
        { location: data.location }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateLotissement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LotissementUpdate) => {
      const { data, error } = await supabase
        .from("lotissements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "lotissement", data.name, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useSoftDeleteLotissement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("lotissements")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "lotissement", name || "Lotissement supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

// Keep the hard delete for permanent deletion
export const useDeleteLotissement = () => {
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
        await logActivityDirect(user.id, "permanent_delete", "lotissement", name || "Lotissement supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["trash-count"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
