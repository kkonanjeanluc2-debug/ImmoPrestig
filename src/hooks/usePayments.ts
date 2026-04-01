import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logActivityDirect } from "@/lib/activityLogger";
import { useAgency } from "@/hooks/useAgency";

export type Payment = Tables<"payments">;
export type PaymentInsert = TablesInsert<"payments">;
export type PaymentUpdate = TablesUpdate<"payments">;

export type PaymentWithDetails = Payment & {
  tenant?: Tables<"tenants"> | null;
  contract?: Tables<"contracts"> | null;
};

// French month names for payment_months format
const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const PAYMENTS_QUERY_VERSION = "current-month-virtual-v2";

export const usePayments = () => {
  const { user } = useAuth();
  const { data: agency } = useAgency();
  const rentDueDay = agency?.rent_due_day ?? 10;
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const billingWindowKey = today.getDate() >= 15 ? "after-15" : "before-15";

  return useQuery({
    queryKey: ["payments", PAYMENTS_QUERY_VERSION, user?.id, rentDueDay, currentMonthKey, billingWindowKey],
    queryFn: async () => {
      // Fetch real payments
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          tenant:tenants(*, property:properties(*), unit:property_units(unit_number))
        `)
        .order("due_date", { ascending: false });

      if (error) throw error;

      const now = new Date();

      // Fetch active contracts with tenant info (including start_date for lookback)
      const { data: activeContracts, error: contractsError } = await supabase
        .from("contracts")
        .select(`
          id, user_id, rent_amount, tenant_id, property_id, unit_id, start_date,
          tenant:tenants(*, property:properties(*))
        `)
        .eq("status", "active")
        .is("deleted_at", null);

      if (contractsError) throw contractsError;

      // Helper: normalize a month string to "YYYY-MM" for reliable comparison
      const toYearMonth = (month: string): string | null => {
        if (/^\d{4}-\d{2}$/.test(month)) return month;
        const parts = month.split(' ');
        if (parts.length === 2) {
          const idx = FRENCH_MONTHS.indexOf(parts[0]);
          if (idx >= 0) return `${parts[1]}-${String(idx + 1).padStart(2, '0')}`;
        }
        return month.length >= 7 ? month.substring(0, 7) : null;
      };

      // Helper: check if a payment covers a given "YYYY-MM" target
      const paymentCoversMonth = (payment: any, targetYM: string, targetLabel: string): boolean => {
        if (!payment.tenant_id) return false;
        if (payment.payment_months && Array.isArray(payment.payment_months)) {
          for (const m of payment.payment_months) {
            if (m === targetLabel || m === targetYM) return true;
            const normalized = toYearMonth(m);
            if (normalized === targetYM) return true;
          }
        }
        if (typeof payment.due_date === "string" && payment.due_date.startsWith(targetYM)) {
          return true;
        }
        return false;
      };

      // Generate virtual payments for ALL months from contract start to current (+ next from 15th)
      // This ensures unpaid past months still appear with appropriate status
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentDay = now.getDate();

      // Determine the end month for virtual generation
      const includeNextMonth = currentDay >= 15;
      let endMonth = currentMonth;
      let endYear = currentYear;
      if (includeNextMonth) {
        endMonth = currentMonth + 1;
        if (endMonth > 11) { endMonth = 0; endYear = currentYear + 1; }
      }

      // Build a set of covered months per tenant from real payments
      const tenantCoveredMonths = new Map<string, Set<string>>();
      for (const payment of (data || [])) {
        if (!payment.tenant_id) continue;
        if (!tenantCoveredMonths.has(payment.tenant_id)) {
          tenantCoveredMonths.set(payment.tenant_id, new Set());
        }
        const covered = tenantCoveredMonths.get(payment.tenant_id)!;
        // Add months from payment_months array
        if (payment.payment_months && Array.isArray(payment.payment_months)) {
          for (const m of payment.payment_months) {
            const ym = toYearMonth(m);
            if (ym) covered.add(ym);
          }
        }
        // Add month from due_date
        if (typeof payment.due_date === "string" && payment.due_date.length >= 7) {
          covered.add(payment.due_date.substring(0, 7));
        }
      }

      // Generate virtual payments for each contract
      const allVirtuals: any[] = [];
      for (const contract of (activeContracts || [])) {
        const tenantId = contract.tenant_id;
        const covered = tenantCoveredMonths.get(tenantId) || new Set();
        const agencyUserId = (contract as any).user_id || (contract as any).tenant?.user_id || user!.id;

        // Determine start month: contract start_date or max 12 months back
        const contractStart = new Date((contract as any).start_date || now.toISOString());
        const twelveMonthsAgo = new Date(currentYear, currentMonth - 12, 1);
        const lookbackStart = contractStart > twelveMonthsAgo ? contractStart : twelveMonthsAgo;
        let iterMonth = lookbackStart.getMonth();
        let iterYear = lookbackStart.getFullYear();

        // Iterate month by month until endMonth/endYear
        while (iterYear < endYear || (iterYear === endYear && iterMonth <= endMonth)) {
          const ym = `${iterYear}-${String(iterMonth + 1).padStart(2, '0')}`;
          const monthLabel = `${FRENCH_MONTHS[iterMonth]} ${iterYear}`;
          const dueDate = `${ym}-${String(rentDueDay).padStart(2, '0')}`;

          if (!covered.has(ym)) {
            // Determine status based on how overdue
            const dueDateObj = new Date(dueDate);
            const daysLate = Math.floor((now.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
            let status = "pending";
            if (daysLate > 0) {
              status = "late";
            }

            allVirtuals.push({
              id: `auto-${tenantId}-${monthLabel}`,
              user_id: agencyUserId,
              tenant_id: tenantId,
              amount: contract.rent_amount,
              due_date: dueDate,
              status,
              method: null,
              paid_date: null,
              paid_amount: null,
              payment_months: [monthLabel],
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
              tenant: contract.tenant,
              _isVirtual: true,
            });
          }

          // Advance to next month
          iterMonth++;
          if (iterMonth > 11) { iterMonth = 0; iterYear++; }
        }
      }

      return [...(data || []), ...allVirtuals] as any;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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
      queryClient.invalidateQueries({ queryKey: ["comptabilite-payments"] });
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, tenantName, ...updates }: PaymentUpdate & { id: string; tenantName?: string }) => {
      // Remove undefined status to avoid overwriting
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      const { data, error } = await supabase
        .from("payments")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Auto-resolve unpaid cases when payment is fully paid
      if (updates.status === "paid" && data.tenant_id) {
        try {
          // Find active unpaid cases for this tenant
          const { data: activeCases, error: activeCasesError } = await supabase
            .from("unpaid_cases" as any)
            .select("id")
            .eq("tenant_id", data.tenant_id)
            .not("status", "in", '("resolved","eviction_cancelled")');

          if (activeCasesError) throw activeCasesError;

          if (activeCases && activeCases.length > 0) {
            for (const activeCase of activeCases) {
              // Update case status to resolved (displayed as "Loyer à jour")
              const { error: caseUpdateError } = await supabase
                .from("unpaid_cases" as any)
                .update({ status: "resolved" } as any)
                .eq("id", (activeCase as any).id);

              if (caseUpdateError) throw caseUpdateError;

              // Log the action
              if (user) {
                await supabase.from("unpaid_case_actions" as any).insert({
                  case_id: (activeCase as any).id,
                  user_id: user.id,
                  action_type: "status_update",
                  description: "Loyer à jour — Dossier clôturé automatiquement suite au paiement intégral du loyer",
                } as any);
              }
            }
          }
        } catch (e) {
          console.error("Error auto-resolving unpaid case:", e);
        }
      }

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
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-cases"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-case-actions"] });
      queryClient.invalidateQueries({ queryKey: ["comptabilite-payments"] });
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
      queryClient.invalidateQueries({ queryKey: ["comptabilite-payments"] });
    },
  });
};
