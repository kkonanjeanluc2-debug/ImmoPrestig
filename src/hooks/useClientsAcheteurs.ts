import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TypeClient = "particulier" | "entreprise" | "diaspora";

export interface ClientAcheteur {
  id: string;
  user_id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  telephone_2: string | null;
  email: string | null;
  adresse: string | null;
  commune: string | null;
  ville: string;
  nationalite: string;
  numero_cni: string | null;
  date_expiration_cni: string | null;
  profession: string | null;
  employeur: string | null;
  type_client: TypeClient;
  nom_entreprise: string | null;
  numero_rccm: string | null;
  created_at: string;
  updated_at: string;
}

export const useClientsAcheteurs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clients-acheteurs", user?.id],
    queryFn: async (): Promise<ClientAcheteur[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients_acheteurs")
        .select("*")
        .eq("user_id", user.id)
        .order("nom");
      if (error) throw error;
      return (data || []) as ClientAcheteur[];
    },
    enabled: !!user,
  });
};

export const useCreateClientAcheteur = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<ClientAcheteur, "id" | "user_id" | "created_at" | "updated_at">
    ) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("clients_acheteurs")
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as ClientAcheteur;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-acheteurs"] });
    },
  });
};

export const useUpdateClientAcheteur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClientAcheteur> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients_acheteurs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ClientAcheteur;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-acheteurs"] });
    },
  });
};
