import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  recipient_phone: string;
  recipient_name: string | null;
  payment_method: string;
  status: string;
  notes: string | null;
  processed_at: string | null;
  kkiapay_payout_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useWithdrawalRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["withdrawal-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!user,
  });
}

export function useCreateWithdrawalRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      amount: number;
      recipient_phone: string;
      recipient_name?: string;
      payment_method: string;
      notes?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");

      const { data: result, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user.id,
          amount: data.amount,
          recipient_phone: data.recipient_phone,
          recipient_name: data.recipient_name || null,
          payment_method: data.payment_method,
          notes: data.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      toast.success("Demande de reversement créée");
    },
    onError: (error) => {
      console.error("Error creating withdrawal request:", error);
      toast.error("Erreur lors de la création de la demande");
    },
  });
}

export function useCancelWithdrawalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("withdrawal_requests")
        .delete()
        .eq("id", id)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      toast.success("Demande annulée");
    },
    onError: (error) => {
      console.error("Error cancelling withdrawal request:", error);
      toast.error("Erreur lors de l'annulation");
    },
  });
}

export function useWithdrawalStats() {
  const { data: requests = [] } = useWithdrawalRequests();

  const pendingTotal = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const completedTotal = requests
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return {
    pendingTotal,
    completedTotal,
    pendingCount,
    totalRequests: requests.length,
  };
}
