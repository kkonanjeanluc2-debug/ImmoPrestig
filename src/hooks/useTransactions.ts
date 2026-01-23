import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "./useSuperAdmin";

export interface TransactionWithDetails {
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
  agency?: {
    id: string;
    name: string;
    email: string;
  };
  plan?: {
    id: string;
    name: string;
  };
}

export interface TransactionStats {
  totalRevenue: number;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  growthRate: number;
  byPaymentMethod: Record<string, { count: number; amount: number }>;
  byPlan: Record<string, { count: number; amount: number }>;
}

// Get all transactions (super admin only)
export function useAllTransactions() {
  const { isSuperAdmin } = useIsSuperAdmin();

  return useQuery({
    queryKey: ["all-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select(`
          *,
          agency:agencies!payment_transactions_agency_id_fkey(id, name, email),
          plan:subscription_plans!payment_transactions_plan_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TransactionWithDetails[];
    },
    enabled: isSuperAdmin,
  });
}

// Calculate transaction statistics
export function useTransactionStats() {
  const { data: transactions } = useAllTransactions();

  const stats: TransactionStats = {
    totalRevenue: 0,
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    growthRate: 0,
    byPaymentMethod: {},
    byPlan: {},
  };

  if (!transactions) return stats;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  transactions.forEach((tx) => {
    stats.totalTransactions++;

    // Count by status
    if (tx.status === "completed") {
      stats.completedTransactions++;
      stats.totalRevenue += tx.amount;

      // Revenue by period
      const txDate = new Date(tx.created_at);
      if (txDate >= thisMonthStart) {
        stats.revenueThisMonth += tx.amount;
      } else if (txDate >= lastMonthStart && txDate <= lastMonthEnd) {
        stats.revenueLastMonth += tx.amount;
      }

      // By payment method
      if (!stats.byPaymentMethod[tx.payment_method]) {
        stats.byPaymentMethod[tx.payment_method] = { count: 0, amount: 0 };
      }
      stats.byPaymentMethod[tx.payment_method].count++;
      stats.byPaymentMethod[tx.payment_method].amount += tx.amount;

      // By plan
      const planName = tx.plan?.name || "Inconnu";
      if (!stats.byPlan[planName]) {
        stats.byPlan[planName] = { count: 0, amount: 0 };
      }
      stats.byPlan[planName].count++;
      stats.byPlan[planName].amount += tx.amount;
    } else if (tx.status === "pending") {
      stats.pendingTransactions++;
    } else if (tx.status === "failed") {
      stats.failedTransactions++;
    }
  });

  // Calculate growth rate
  if (stats.revenueLastMonth > 0) {
    stats.growthRate = ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100;
  } else if (stats.revenueThisMonth > 0) {
    stats.growthRate = 100;
  }

  return stats;
}
