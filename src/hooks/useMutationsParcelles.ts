import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface MutationParcelle {
  id: string;
  user_id: string;
  vente_id: string;
  parcelle_id: string;
  ancien_acquereur_id: string;
  nouvel_acquereur_id: string;
  mutation_date: string;
  mutation_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MutationWithDetails extends MutationParcelle {
  ancien_acquereur?: {
    name: string;
    phone: string | null;
    cni_number: string | null;
    email: string | null;
    address: string | null;
    birth_date: string | null;
    birth_place: string | null;
    profession: string | null;
  };
  nouvel_acquereur?: {
    name: string;
    phone: string | null;
    cni_number: string | null;
    email: string | null;
    address: string | null;
    birth_date: string | null;
    birth_place: string | null;
    profession: string | null;
  };
}

export const useMutationsParcelles = (venteId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mutations-parcelles", venteId],
    queryFn: async () => {
      let query = supabase
        .from("mutations_parcelles")
        .select(`
          *,
          ancien_acquereur:acquereurs!mutations_parcelles_ancien_acquereur_id_fkey(name, phone, cni_number, email, address, birth_date, birth_place, profession),
          nouvel_acquereur:acquereurs!mutations_parcelles_nouvel_acquereur_id_fkey(name, phone, cni_number, email, address, birth_date, birth_place, profession)
        `)
        .order("mutation_date", { ascending: true });

      if (venteId) {
        query = query.eq("vente_id", venteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MutationWithDetails[];
    },
    enabled: !!user,
  });
};

export const useMutationsParcellesByLotissement = (lotissementId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["mutations-parcelles", "lotissement", lotissementId],
    queryFn: async () => {
      // Get all mutations for parcelles in this lotissement
      const { data, error } = await supabase
        .from("mutations_parcelles")
        .select(`
          *,
          ancien_acquereur:acquereurs!mutations_parcelles_ancien_acquereur_id_fkey(name, phone, cni_number, email, address, birth_date, birth_place, profession),
          nouvel_acquereur:acquereurs!mutations_parcelles_nouvel_acquereur_id_fkey(name, phone, cni_number, email, address, birth_date, birth_place, profession)
        `)
        .order("mutation_date", { ascending: true });

      if (error) throw error;
      return data as unknown as MutationWithDetails[];
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useCreateMutationParcelle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mutation: {
      vente_id: string;
      parcelle_id: string;
      ancien_acquereur_id: string;
      nouvel_acquereur_id: string;
      mutation_date?: string;
      mutation_price?: number | null;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Update the vente to point to the new acquirer
      const { error: updateError } = await supabase
        .from("ventes_parcelles")
        .update({ acquereur_id: mutation.nouvel_acquereur_id })
        .eq("id", mutation.vente_id);

      if (updateError) throw updateError;

      // Create the mutation record
      const { data, error } = await supabase
        .from("mutations_parcelles")
        .insert({
          user_id: user.id,
          vente_id: mutation.vente_id,
          parcelle_id: mutation.parcelle_id,
          ancien_acquereur_id: mutation.ancien_acquereur_id,
          nouvel_acquereur_id: mutation.nouvel_acquereur_id,
          mutation_date: mutation.mutation_date || new Date().toISOString().split("T")[0],
          mutation_price: mutation.mutation_price,
          notes: mutation.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await logActivityDirect(
        user.id,
        "create",
        "mutation_parcelle",
        "Mutation de lot enregistrée",
        data.id
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mutations-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["ventes-parcelles"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
