import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MutationAchat {
  id: string;
  user_id: string;
  achat_id: string;
  bien_id: string;
  status: string;
  notaire_name: string | null;
  notaire_phone: string | null;
  notaire_email: string | null;
  notaire_address: string | null;
  titre_propriete: boolean;
  pieces_identite: boolean;
  certificat_localisation: boolean;
  etat_foncier: boolean;
  situation_fiscale: boolean;
  quittances_paiement: boolean;
  droits_enregistrement: number;
  taxe_publicite: number;
  frais_fixes: number;
  frais_notariaux: number;
  date_acte_signe: string | null;
  date_depot_notaire: string | null;
  date_mutation_enregistree: string | null;
  type_mutation: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  biens_achat?: { title: string; address: string; city: string | null; price: number } | null;
  achats_immobiliers?: { sale_price: number; sale_date: string } | null;
}

export function useMutationsAchats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mutations-achats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mutations_achats")
        .select("*, biens_achat(title, address, city, price), achats_immobiliers(sale_price, sale_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MutationAchat[];
    },
    enabled: !!user?.id,
  });
}

export interface MutationAchatInput {
  achat_id: string;
  bien_id: string;
  status?: string;
  notaire_name?: string;
  notaire_phone?: string;
  notaire_email?: string;
  notaire_address?: string;
  titre_propriete?: boolean;
  pieces_identite?: boolean;
  certificat_localisation?: boolean;
  etat_foncier?: boolean;
  situation_fiscale?: boolean;
  quittances_paiement?: boolean;
  droits_enregistrement?: number;
  taxe_publicite?: number;
  frais_fixes?: number;
  frais_notariaux?: number;
  date_acte_signe?: string;
  date_depot_notaire?: string;
  date_mutation_enregistree?: string;
  type_mutation?: string;
  notes?: string;
}

export function useCreateMutationAchat() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: MutationAchatInput) => {
      const { data, error } = await supabase
        .from("mutations_achats")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mutations-achats"] });
      toast.success("Dossier de mutation créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMutationAchat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MutationAchatInput> & { id: string }) => {
      const { error } = await supabase.from("mutations_achats").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mutations-achats"] });
      toast.success("Dossier de mutation mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMutationAchat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mutations_achats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mutations-achats"] });
      toast.success("Dossier de mutation supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
