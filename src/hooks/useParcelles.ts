import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export type PlotStatus = "disponible" | "reserve" | "vendu";

export interface Parcelle {
  id: string;
  user_id: string;
  lotissement_id: string;
  plot_number: string;
  area: number;
  price: number;
  status: PlotStatus;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelleInsert {
  lotissement_id: string;
  plot_number: string;
  area: number;
  price: number;
  status?: PlotStatus;
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  notes?: string | null;
  assigned_to?: string | null;
}

export interface ParcelleUpdate extends Partial<ParcelleInsert> {
  id: string;
}

export const useParcelles = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["parcelles", lotissementId],
    queryFn: async () => {
      let query = supabase.from("parcelles").select("*");
      
      if (lotissementId) {
        query = query.eq("lotissement_id", lotissementId);
      }
      
      const { data, error } = await query.order("plot_number", { ascending: true });

      if (error) throw error;
      return data as Parcelle[];
    },
    enabled: !!user,
  });
};

export const useParcelle = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["parcelles", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Parcelle | null;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (parcelle: ParcelleInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("parcelles")
        .insert({ ...parcelle, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "parcelle",
        `Lot ${data.plot_number}`,
        data.id,
        { area: data.area, price: data.price }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ParcelleUpdate) => {
      const { data, error } = await supabase
        .from("parcelles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "parcelle", `Lot ${data.plot_number}`, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteParcelle = () => {
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
        await logActivityDirect(user.id, "delete", "parcelle", `Lot ${plotNumber || "supprimé"}`, id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useCreateBulkParcelles = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (parcelles: ParcelleInsert[]) => {
      if (!user) throw new Error("User not authenticated");

      const parcellesWithUserId = parcelles.map(p => ({ ...p, user_id: user.id }));

      const { data, error } = await supabase
        .from("parcelles")
        .insert(parcellesWithUserId)
        .select();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "parcelle",
        `${data.length} parcelles créées`,
        data[0]?.id || "",
        { count: data.length }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["lotissements"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
