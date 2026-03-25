import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BeneficiaireLot {
  id: string;
  lotissement_id: string;
  user_id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  lien_role: string | null;
  cni_number: string | null;
  partie: "proprietaire" | "lotisseur";
  member_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaireLotInsert {
  lotissement_id: string;
  nom: string;
  telephone?: string | null;
  email?: string | null;
  lien_role?: string | null;
  cni_number?: string | null;
  partie: "proprietaire" | "lotisseur";
  member_user_id?: string | null;
}

export const useBeneficiairesLots = (lotissementId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["beneficiaires-lots", lotissementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaires_lots")
        .select("*")
        .eq("lotissement_id", lotissementId)
        .order("nom");

      if (error) throw error;
      return data as BeneficiaireLot[];
    },
    enabled: !!user && !!lotissementId,
  });
};

export const useCreateBeneficiaireLot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: BeneficiaireLotInsert) => {
      if (!user) throw new Error("Not authenticated");
      const { data: result, error } = await supabase
        .from("beneficiaires_lots")
        .insert({ ...data, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaires-lots", vars.lotissement_id] });
    },
  });
};

export const useDeleteBeneficiaireLot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, lotissementId }: { id: string; lotissementId: string }) => {
      const { error } = await supabase
        .from("beneficiaires_lots")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return lotissementId;
    },
    onSuccess: (lotissementId) => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaires-lots", lotissementId] });
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
    },
  });
};
