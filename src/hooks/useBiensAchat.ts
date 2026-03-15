import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BienAchat {
  id: string;
  user_id: string;
  title: string;
  property_type: string;
  address: string;
  city: string | null;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  description: string | null;
  image_url: string | null;
  status: string;
  vendeur_id: string | null;
  assigned_to: string | null;
  deleted_at: string | null;
  latitude: number | null;
  longitude: number | null;
  features: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  vendeurs?: { name: string; phone: string | null } | null;
}

export function useBiensAchat() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["biens-achat", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens_achat")
        .select("*, vendeurs(name, phone)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BienAchat[];
    },
    enabled: !!user?.id,
  });
}

export interface BienAchatInput {
  title: string;
  property_type: string;
  address: string;
  city?: string;
  price: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  description?: string;
  vendeur_id?: string;
  assigned_to?: string | null;
  status?: string;
  latitude?: number;
  longitude?: number;
  features?: Record<string, unknown>;
  image_url?: string;
}

export function useCreateBienAchat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ features, ...input }: BienAchatInput) => {
      const { data, error } = await supabase
        .from("biens_achat")
        .insert({ ...input, features: features as any, user_id: user!.id, assigned_to: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-achat"] });
      toast.success("Bien à acheter ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateBienAchat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<BienAchatInput> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...input };
      // Allow explicitly setting vendeur_id to null
      if ("vendeur_id" in input && input.vendeur_id === undefined) {
        updateData.vendeur_id = null;
      }
      // Allow explicitly setting assigned_to to null
      if ("assigned_to" in input && input.assigned_to === null) {
        updateData.assigned_to = null;
      }
      const { error } = await supabase.from("biens_achat").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-achat"] });
      toast.success("Bien mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBienAchat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("biens_achat").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biens-achat"] });
      toast.success("Bien supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
