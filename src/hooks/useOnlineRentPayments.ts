import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OnlineRentPayment {
  id: string;
  user_id: string;
  payment_id: string | null;
  tenant_id: string;
  amount: number;
  kkiapay_transaction_id: string | null;
  payment_method: string | null;
  status: string;
  paid_at: string;
  created_at: string;
  updated_at: string;
  tenant?: {
    name: string;
    phone: string | null;
    property?: {
      title: string;
    };
  };
}

export function useOnlineRentPayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["online-rent-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_rent_payments")
        .select(`
          *,
          tenant:tenants(
            name,
            phone,
            property:properties(title)
          )
        `)
        .order("paid_at", { ascending: false });

      if (error) throw error;
      return data as OnlineRentPayment[];
    },
    enabled: !!user,
  });
}

export function useOnlineRentPaymentStats() {
  const { data: payments = [] } = useOnlineRentPayments();

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const thisMonthPayments = payments.filter((p) => {
    const paidDate = new Date(p.paid_at);
    return paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear;
  });

  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    totalReceived,
    thisMonthTotal,
    totalCount: payments.length,
    thisMonthCount: thisMonthPayments.length,
  };
}
