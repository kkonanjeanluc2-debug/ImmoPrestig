import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface Ilot {
  id: string;
  user_id: string;
  lotissement_id: string;
  name: string;
  description: string | null;
  total_area: number | null;
  created_at: string;
  updated_at: string;
}

export interface IlotInsert {
  lotissement_id: string;
  name: string;
  description?: string | null;
  total_area?: number | null;
}

export interface IlotUpdate extends Partial<IlotInsert> {
  id: string;
}

export interface IlotWithStats extends Ilot {
  parcelles_count: number;
  parcelles_vendues: number;
  parcelles_disponibles: number;
}

export const useIlots = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ilots", lotissementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ilots")
        .select("*")
        .eq("lotissement_id", lotissementId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Ilot[];
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useIlotsWithStats = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ilots", "with-stats", lotissementId],
    queryFn: async () => {
      // First get ilots
      const { data: ilots, error: ilotsError } = await supabase
        .from("ilots")
        .select("*")
        .eq("lotissement_id", lotissementId)
        .order("name", { ascending: true });

      if (ilotsError) throw ilotsError;

      // Then get parcelles for stats
      const { data: parcelles, error: parcellesError } = await supabase
        .from("parcelles")
        .select("id, ilot_id, status")
        .eq("lotissement_id", lotissementId);

      if (parcellesError) throw parcellesError;

      // Calculate stats for each ilot
      const ilotsWithStats: IlotWithStats[] = (ilots || []).map(ilot => {
        const ilotParcelles = parcelles?.filter(p => p.ilot_id === ilot.id) || [];
        return {
          ...ilot,
          parcelles_count: ilotParcelles.length,
          parcelles_vendues: ilotParcelles.filter(p => p.status === "vendu").length,
          parcelles_disponibles: ilotParcelles.filter(p => p.status === "disponible").length,
        };
      });

      return ilotsWithStats;
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useCreateIlot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ilot: IlotInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("ilots")
        .insert({ ...ilot, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "ilot",
        data.name,
        data.id,
        { lotissement_id: data.lotissement_id }
      );

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ilots", variables.lotissement_id] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateIlot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IlotUpdate) => {
      const { data, error } = await supabase
        .from("ilots")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "ilot", data.name, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ilots"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteIlot = () => {
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
        await logActivityDirect(user.id, "delete", "ilot", name || "Îlot supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ilots"] });
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useAssignParcelleToIlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parcelleId, ilotId }: { parcelleId: string; ilotId: string | null }) => {
      const { data, error } = await supabase
        .from("parcelles")
        .update({ ilot_id: ilotId })
        .eq("id", parcelleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["ilots"] });
    },
  });
};
