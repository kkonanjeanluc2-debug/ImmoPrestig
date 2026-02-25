import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OffreAchat {
  id: string;
  user_id: string;
  bien_id: string;
  offer_amount: number;
  offer_date: string;
  status: string;
  counter_amount: number | null;
  notes: string | null;
  conditions: string | null;
  expiry_date: string | null;
  created_at: string;
  biens_achat?: { title: string; address: string } | null;
}

export function useOffresAchat() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["offres-achat", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offres_achat")
        .select("*, biens_achat(title, address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OffreAchat[];
    },
    enabled: !!user?.id,
  });
}

export interface OffreAchatInput {
  bien_id: string;
  offer_amount: number;
  offer_date?: string;
  status?: string;
  counter_amount?: number;
  notes?: string;
  conditions?: string;
  expiry_date?: string;
}

export function useCreateOffreAchat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: OffreAchatInput) => {
      const { data, error } = await supabase
        .from("offres_achat")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offres-achat"] });
      toast.success("Offre d'achat créée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateOffreAchat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<OffreAchatInput> & { id: string }) => {
      const { error } = await supabase.from("offres_achat").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offres-achat"] });
      toast.success("Offre mise à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
