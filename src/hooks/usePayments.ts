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
      const currentDay = now.getDate();

      // Fetch active contracts with tenant info
      const { data: activeContracts, error: contractsError } = await supabase
        .from("contracts")
        .select(`
          id, user_id, rent_amount, tenant_id, property_id, unit_id,
          tenant:tenants(*, property:properties(*))
        `)
        .eq("status", "active")
        .is("deleted_at", null);

      if (contractsError) throw contractsError;

      // Always generate virtual payments for the CURRENT month
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentMonthLabel = `${FRENCH_MONTHS[currentMonth]} ${currentYear}`;
      const currentMonthIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const currentMonthDueDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(rentDueDay).padStart(2, '0')}`;

      // Check which tenants already have a real payment for current month
      const existingCurrentMonthTenantIds = new Set(
        (data || [])
          .filter((payment) => {
            if (!payment.tenant_id) return false;
            if (payment.payment_months && Array.isArray(payment.payment_months)) {
              return (
                payment.payment_months.includes(currentMonthLabel) ||
                payment.payment_months.includes(currentMonthIso)
              );
            }
            return typeof payment.due_date === "string" && payment.due_date.startsWith(currentMonthIso);
          })
          .map((payment) => payment.tenant_id)
      );

      // Virtual payments for current month
      const virtualCurrentMonth = (activeContracts || [])
        .filter(c => !existingCurrentMonthTenantIds.has(c.tenant_id))
        .map(contract => {
          const agencyUserId = (contract as any).user_id || (contract as any).tenant?.user_id || user!.id;
          return {
            id: `auto-${contract.tenant_id}-${currentMonthLabel}`,
            user_id: agencyUserId,
            tenant_id: contract.tenant_id,
            amount: contract.rent_amount,
            due_date: currentMonthDueDate,
            status: "pending",
            method: null,
            paid_date: null,
            paid_amount: null,
            payment_months: [currentMonthLabel],
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            tenant: contract.tenant,
            _isVirtual: true,
          };
        });

      // From the 15th, also generate virtual payments for NEXT month
      let virtualNextMonth: any[] = [];
      if (currentDay >= 15) {
        const nextMonth = currentMonth + 1 > 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth + 1 > 11 ? currentYear + 1 : currentYear;
        const nextMonthLabel = `${FRENCH_MONTHS[nextMonth]} ${nextYear}`;
        const nextMonthIso = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;
        const nextMonthDueDate = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(rentDueDay).padStart(2, '0')}`;

        const existingNextMonthTenantIds = new Set(
          (data || [])
            .filter((payment) => {
              if (!payment.tenant_id) return false;
              if (payment.payment_months && Array.isArray(payment.payment_months)) {
                return (
                  payment.payment_months.includes(nextMonthLabel) ||
                  payment.payment_months.includes(nextMonthIso)
                );
              }
              return typeof payment.due_date === "string" && payment.due_date.startsWith(nextMonthIso);
            })
            .map((payment) => payment.tenant_id)
        );

        virtualNextMonth = (activeContracts || [])
          .filter(c => !existingNextMonthTenantIds.has(c.tenant_id))
          .map(contract => {
            const agencyUserId = (contract as any).user_id || (contract as any).tenant?.user_id || user!.id;
            return {
              id: `auto-${contract.tenant_id}-${nextMonthLabel}`,
              user_id: agencyUserId,
              tenant_id: contract.tenant_id,
              amount: contract.rent_amount,
              due_date: nextMonthDueDate,
              status: "pending",
              method: null,
              paid_date: null,
              paid_amount: null,
              payment_months: [nextMonthLabel],
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
              tenant: contract.tenant,
              _isVirtual: true,
            };
          });
      }

      return [...(data || []), ...virtualCurrentMonth, ...virtualNextMonth] as any;
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
