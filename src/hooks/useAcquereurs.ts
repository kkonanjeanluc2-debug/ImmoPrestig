import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface Acquereur {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  cni_number: string | null;
  birth_date: string | null;
  birth_place: string | null;
  profession: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcquereurInsert {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cni_number?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  profession?: string | null;
}

export interface AcquereurUpdate extends Partial<AcquereurInsert> {
  id: string;
}

export const useAcquereurs = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["acquereurs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquereurs")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Acquereur[];
    },
    enabled: !!user,
  });
};

export const useAcquereur = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["acquereurs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acquereurs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Acquereur | null;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateAcquereur = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (acquereur: AcquereurInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("acquereurs")
        .insert({ ...acquereur, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "acquereur",
        data.name,
        data.id,
        { phone: data.phone }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquereurs"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateAcquereur = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AcquereurUpdate) => {
      const { data, error } = await supabase
        .from("acquereurs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "acquereur", data.name, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquereurs"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteAcquereur = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from("acquereurs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "acquereur", name || "Acquéreur supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acquereurs"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
