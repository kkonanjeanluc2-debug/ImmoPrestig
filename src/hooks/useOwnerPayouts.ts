import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OwnerPayout {
  id: string;
  user_id: string;
  owner_id: string;
  amount: number;
  payout_date: string;
  payout_month: number;
  payout_year: number;
  payment_method: string;
  recipient_phone: string | null;
  notes: string | null;
  payment_proof_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  owner?: { name: string } | null;
}

export function useOwnerPayouts(fromDate?: string, toDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-payouts", user?.id, fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from("owner_payouts")
        .select("*, owner:owners!owner_payouts_owner_id_fkey(name, email)")
        .order("payout_date", { ascending: false });

      if (fromDate) query = query.gte("payout_date", fromDate);
      if (toDate) query = query.lte("payout_date", toDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as OwnerPayout[];
    },
    enabled: !!user,
  });
}

export function useOwnerPayoutStats(fromDate?: string, toDate?: string) {
  const { data: payouts = [] } = useOwnerPayouts(fromDate, toDate);

  const totalCompleted = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return { totalCompleted, totalPending, count: payouts.length };
}

export function useCreateOwnerPayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payout: {
      owner_id: string;
      amount: number;
      payout_date: string;
      payment_method: string;
      payout_month: number;
      payout_year: number;
      recipient_phone?: string;
      notes?: string;
      payment_proof_url?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");

      // Check for duplicate
      const { data: existing } = await supabase
        .from("owner_payouts")
        .select("id")
        .eq("owner_id", payout.owner_id)
        .eq("payout_month", payout.payout_month)
        .eq("payout_year", payout.payout_year)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Un reversement existe déjà pour ce propriétaire en ${payout.payout_month}/${payout.payout_year}`);
      }

      const { data, error } = await supabase
        .from("owner_payouts")
        .insert({ ...payout, user_id: user.id, status: "completed" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-payouts"] });
      toast.success("Reversement enregistré avec succès");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });
}

export function useDeleteOwnerPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("owner_payouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-payouts"] });
      toast.success("Reversement supprimé");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
}
