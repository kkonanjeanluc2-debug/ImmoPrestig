import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ApporteurAffaires {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cni_number: string | null;
  commission_percentage: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Apport {
  id: string;
  user_id: string;
  apporteur_id: string;
  tenant_id: string | null;
  property_id: string | null;
  commission_percentage: number;
  commission_amount: number | null;
  description: string | null;
  apport_date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  tenant?: { name: string } | null;
  property?: { title: string } | null;
}

export function useApporteursAffaires() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["apporteurs-affaires", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apporteurs_affaires")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApporteurAffaires[];
    },
    enabled: !!user?.id,
  });
}

export function useApporteurDetails(id: string | undefined) {
  return useQuery({
    queryKey: ["apporteur-affaires", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("apporteurs_affaires")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as ApporteurAffaires;
    },
    enabled: !!id,
  });
}

export function useApports(apporteurId: string | undefined) {
  return useQuery({
    queryKey: ["apports", apporteurId],
    queryFn: async () => {
      if (!apporteurId) return [];
      const { data, error } = await supabase
        .from("apports")
        .select("*, tenant:tenants(name), property:properties(title)")
        .eq("apporteur_id", apporteurId)
        .order("apport_date", { ascending: false });
      if (error) throw error;
      return data as Apport[];
    },
    enabled: !!apporteurId,
  });
}

export interface ApporteurInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  cni_number?: string;
  commission_percentage?: number;
  notes?: string;
  status?: string;
}

export function useCreateApporteur() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ApporteurInput) => {
      const { data, error } = await supabase
        .from("apporteurs_affaires")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apporteurs-affaires"] });
      toast.success("Apporteur ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateApporteur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ApporteurInput & { id: string }) => {
      const { error } = await supabase
        .from("apporteurs_affaires")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apporteurs-affaires"] });
      queryClient.invalidateQueries({ queryKey: ["apporteur-affaires"] });
      toast.success("Apporteur mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteApporteur() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("apporteurs_affaires")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apporteurs-affaires"] });
      toast.success("Apporteur supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface ApportInput {
  apporteur_id: string;
  tenant_id?: string;
  property_id?: string;
  commission_type?: string;
  commission_percentage: number;
  commission_amount?: number;
  description?: string;
  apport_date?: string;
  status?: string;
}

export function useCreateApport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: ApportInput) => {
      const { data, error } = await supabase
        .from("apports")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apports"] });
      toast.success("Apport enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateApport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ApportInput> & { id: string }) => {
      const { error } = await supabase
        .from("apports")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apports"] });
      toast.success("Apport mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteApport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("apports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apports"] });
      toast.success("Apport supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
