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

export const usePayments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payments", user?.id],
    queryFn: async () => {
      // Fetch real payments
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          tenant:tenants(*, property:properties(*))
        `)
        .order("due_date", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const currentDay = now.getDate();

      // Only generate virtual payments from the 15th of the month
      if (currentDay < 15) return data;

      // Determine next month
      const nextMonth = now.getMonth() + 1 > 11 ? 0 : now.getMonth() + 1;
      const nextYear = now.getMonth() + 1 > 11 ? now.getFullYear() + 1 : now.getFullYear();
      const nextMonthLabel = `${FRENCH_MONTHS[nextMonth]} ${nextYear}`;
      const nextMonthDueDate = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-10`;

      // Fetch active contracts with tenant info
      const { data: activeContracts, error: contractsError } = await supabase
        .from("contracts")
        .select(`
          id, rent_amount, tenant_id, property_id, unit_id,
          tenant:tenants(*, property:properties(*))
        `)
        .eq("status", "active")
        .is("deleted_at", null);

      if (contractsError) throw contractsError;

      // Check which tenants already have a payment for next month
      const existingTenantIds = new Set(
        (data || [])
          .filter(p => {
            // Check if payment covers next month via payment_months
            if (p.payment_months && Array.isArray(p.payment_months)) {
              return p.payment_months.includes(nextMonthLabel);
            }
            // Or check by due_date month
            const dueDate = new Date(p.due_date);
            return dueDate.getMonth() === nextMonth && dueDate.getFullYear() === nextYear;
          })
          .map(p => p.tenant_id)
      );

      // Generate virtual pending payments for tenants without one
      const virtualPayments = (activeContracts || [])
        .filter(c => !existingTenantIds.has(c.tenant_id))
        .map(contract => ({
          id: `auto-${contract.tenant_id}-${nextMonthLabel}`,
          user_id: user!.id,
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
        }));

      return [...(data || []), ...virtualPayments] as any;
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
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-cases"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-case-actions"] });
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
