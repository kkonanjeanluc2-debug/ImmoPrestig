import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AchatImmobilier {
  id: string;
  user_id: string;
  bien_id: string;
  vendeur_id: string | null;
  sale_price: number;
  sale_date: string;
  payment_type: string;
  total_installments: number | null;
  down_payment: number | null;
  notary_fees: number | null;
  agency_fees: number | null;
  notes: string | null;
  created_at: string;
  biens_achat?: { title: string; address: string } | null;
  vendeurs?: { name: string; phone: string | null } | null;
}

export function useAchatsImmobiliers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["achats-immobiliers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achats_immobiliers")
        .select("*, biens_achat(title, address), vendeurs(name, phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AchatImmobilier[];
    },
    enabled: !!user?.id,
  });
}

export interface AchatImmobilierInput {
  bien_id: string;
  vendeur_id?: string;
  sale_price: number;
  sale_date?: string;
  payment_type: string;
  total_installments?: number;
  down_payment?: number;
  notary_fees?: number;
  agency_fees?: number;
  notes?: string;
}

export function useCreateAchatImmobilier() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: AchatImmobilierInput) => {
      const { data, error } = await supabase
        .from("achats_immobiliers")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achats-immobiliers"] });
      queryClient.invalidateQueries({ queryKey: ["biens-achat"] });
      toast.success("Achat enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
