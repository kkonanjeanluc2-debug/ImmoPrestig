import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "./useAgency";

export interface PaymentTransaction {
  id: string;
  agency_id: string;
  subscription_id: string | null;
  plan_id: string;
  fedapay_transaction_id: string | null;
  fedapay_reference: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  billing_cycle: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  plan?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface AgencySubscriptionWithPlan {
  id: string;
  agency_id: string;
  plan_id: string;
  billing_cycle: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
  plan: {
    id: string;
    name: string;
    description: string | null;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    max_properties: number | null;
    max_tenants: number | null;
    max_users: number | null;
    features: string[];
    is_popular: boolean;
  };
}

// Get current agency's subscription
export function useAgencySubscription() {
  const { data: agency } = useAgency();

  return useQuery({
    queryKey: ["agency-subscription", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return null;

      const { data, error } = await supabase
        .from("agency_subscriptions")
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq("agency_id", agency.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No subscription found
          return null;
        }
        throw error;
      }

      return data as AgencySubscriptionWithPlan;
    },
    enabled: !!agency?.id,
  });
}

// Get agency's payment history
export function useAgencyPaymentHistory() {
  const { data: agency } = useAgency();

  return useQuery({
    queryKey: ["agency-payment-history", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return [];

      const { data, error } = await supabase
        .from("payment_transactions")
        .select(`
          *,
          plan:subscription_plans(id, name, description)
        `)
        .eq("agency_id", agency.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PaymentTransaction[];
    },
    enabled: !!agency?.id,
  });
}
