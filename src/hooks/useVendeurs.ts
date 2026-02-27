import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Vendeur {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cni_number: string | null;
  birth_date: string | null;
  birth_place: string | null;
  profession: string | null;
  created_at: string;
}

export function useVendeurs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vendeurs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendeurs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Vendeur[];
    },
    enabled: !!user?.id,
  });
}

export interface VendeurInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  cni_number?: string;
  birth_date?: string;
  birth_place?: string;
  profession?: string;
}

export function useCreateVendeur() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: VendeurInput) => {
      const { data, error } = await supabase
        .from("vendeurs")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
      toast.success("Vendeur ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateVendeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: VendeurInput & { id: string }) => {
      const { error } = await supabase
        .from("vendeurs")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
      toast.success("Vendeur mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVendeur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendeurs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendeurs"] });
      toast.success("Vendeur supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
