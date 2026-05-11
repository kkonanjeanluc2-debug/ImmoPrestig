import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logActivityDirect } from "@/lib/activityLogger";

export interface Prefinanceur {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  cni_number: string | null;
  rccm: string | null;
  representant: string | null;
  type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrefinanceurInsert {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  cni_number?: string | null;
  rccm?: string | null;
  representant?: string | null;
  type?: string;
  notes?: string | null;
}

export const usePrefinanceurs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["prefinanceurs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prefinanceurs" as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Prefinanceur[];
    },
    enabled: !!user,
  });
};

export const useCreatePrefinanceur = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: PrefinanceurInsert) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("prefinanceurs" as any)
        .insert({ ...payload, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      const row = data as unknown as Prefinanceur;
      await logActivityDirect(user.id, "create", "prefinanceur", row.name, row.id, {
        phone: row.phone,
      });
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prefinanceurs"] });
    },
  });
};
