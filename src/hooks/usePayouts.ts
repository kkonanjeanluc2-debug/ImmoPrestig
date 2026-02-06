import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Payout {
  id: string;
  user_id: string;
  agency_id: string | null;
  amount: number;
  phone_number: string;
  reason: string;
  status: string;
  kkiapay_transaction_id: string | null;
  kkiapay_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface PayoutRequest {
  amount: number;
  phoneNumber: string;
  reason: string;
}

interface PayoutResponse {
  success: boolean;
  data?: {
    payoutId: string;
    amount: number;
    phoneNumber: string;
    reason: string;
    status: string;
    transactionId?: string;
  };
  error?: string;
  details?: unknown;
}

export function usePayouts() {
  return useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Payout[];
    },
  });
}

export function useCreatePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: PayoutRequest): Promise<PayoutResponse> => {
      const { data, error } = await supabase.functions.invoke("payout", {
        body: request,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erreur lors du reversement");

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["online-rent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      toast.success(
        `Demande de reversement enregistrée`,
        { description: `${data.data?.amount?.toLocaleString("fr-FR")} F CFA vers ${data.data?.phoneNumber}. Traitement via KKiaPay Dashboard.` }
      );
    },
    onError: (error: Error) => {
      console.error("Payout error:", error);
      toast.error(error.message || "Erreur lors du reversement");
    },
  });
}
