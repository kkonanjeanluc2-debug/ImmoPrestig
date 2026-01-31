import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logActivityDirect } from "@/lib/activityLogger";

export type Payment = Tables<"payments">;
export type PaymentInsert = TablesInsert<"payments">;
export type PaymentUpdate = TablesUpdate<"payments">;

export type PaymentWithDetails = Payment & {
  tenant?: Tables<"tenants"> | null;
  contract?: Tables<"contracts"> | null;
};

export const usePayments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          tenant:tenants(*, property:properties(*))
        `)
        .order("due_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payment: Omit<PaymentInsert, "user_id"> & { tenantName?: string; payment_months?: string[] }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { tenantName, payment_months, ...paymentData } = payment;
      
      const { data, error } = await supabase
        .from("payments")
        .insert({ 
          ...paymentData, 
          user_id: user.id,
          payment_months: payment_months || null,
        })
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate month error
        if (error.message?.includes("déjà été payé")) {
          throw new Error(error.message);
        }
        throw error;
      }

      // Log activity
      const monthsLabel = payment_months && payment_months.length > 0 
        ? ` (${payment_months.join(", ")})` 
        : "";
      await logActivityDirect(
        user.id,
        "create",
        "payment",
        tenantName ? `Paiement de ${tenantName}${monthsLabel}` : `Paiement de ${data.amount} FCFA`,
        data.id,
        { amount: data.amount, due_date: data.due_date, status: data.status, payment_months }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, tenantName, ...updates }: PaymentUpdate & { id: string; tenantName?: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log activity - check if this is a payment collection
      if (user) {
        const actionType = updates.status === 'paid' ? 'payment_collected' : 'update';
        await logActivityDirect(
          user.id,
          actionType,
          "payment",
          tenantName ? `Paiement de ${tenantName}` : `Paiement de ${data.amount} FCFA`,
          data.id,
          { amount: data.amount, status: data.status, method: data.method }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, tenantName, amount }: { id: string; tenantName?: string; amount?: number }) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;

      // Log activity
      if (user) {
        await logActivityDirect(
          user.id,
          "delete",
          "payment",
          tenantName ? `Paiement de ${tenantName}` : amount ? `Paiement de ${amount} FCFA` : "Paiement supprimé",
          id
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};
