import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export type PropertySaleStatus = "disponible" | "reserve" | "vendu";

export interface BienVente {
  id: string;
  user_id: string;
  title: string;
  address: string;
  city: string | null;
  property_type: string;
  description: string | null;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: PropertySaleStatus;
  features: string[] | null;
  assigned_to: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BienVenteInsert {
  title: string;
  address: string;
  city?: string | null;
  property_type: string;
  description?: string | null;
  price: number;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  features?: string[] | null;
  assigned_to?: string | null;
}

export interface BienVenteUpdate extends Partial<BienVenteInsert> {
  id: string;
  status?: PropertySaleStatus;
}

export const useBiensVente = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["biens-vente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens_vente")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BienVente[];
    },
    enabled: !!user,
  });
};

export const useBienVente = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["biens-vente", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens_vente")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as BienVente | null;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateBienVente = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bien: BienVenteInsert) => {
      if (!user) throw new Error("User not authenticated");

      // Auto-assign to the creator if not explicitly set
      const insertData = {
        ...bien,
        user_id: user.id,
        assigned_to: bien.assigned_to ?? user.id,
      };

      const { data, error } = await supabase
        .from("biens_vente")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "bien_vente",
        data.title,
        data.id,
        { price: data.price, type: data.property_type }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdateBienVente = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BienVenteUpdate) => {
      const { data, error } = await supabase
        .from("biens_vente")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "update", "bien_vente", data.title, data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeleteBienVente = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      // Soft delete
      const { error } = await supabase
        .from("biens_vente")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      if (user) {
        await logActivityDirect(user.id, "delete", "bien_vente", title || "Bien supprimé", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-vente"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
