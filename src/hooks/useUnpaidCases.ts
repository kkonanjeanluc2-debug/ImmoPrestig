import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UnpaidCase {
  id: string;
  user_id: string;
  tenant_id: string;
  property_id: string | null;
  payment_id: string | null;
  status: string;
  amount_due: number;
  due_date: string;
  days_late: number;
  formal_notice_date: string | null;
  legal_transmission_date: string | null;
  lawyer_name: string | null;
  lawyer_email: string | null;
  lawyer_phone: string | null;
  court_reference: string | null;
  judgment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant?: any;
  property?: any;
}

export interface UnpaidCaseAction {
  id: string;
  case_id: string;
  user_id: string;
  action_type: string;
  description: string;
  metadata: any;
  document_url: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  detected: "Détecté",
  reminded: "Relancé",
  formal_notice: "Mise en demeure",
  legal_proceedings: "Procédure judiciaire",
  awaiting_judgment: "En attente de jugement",
  eviction_validated: "Expulsion validée",
  eviction_executed: "Expulsion exécutée",
  eviction_cancelled: "Expulsion annulée",
  resolved: "Loyer à jour",
};

const ACTION_LABELS: Record<string, string> = {
  detection: "Détection",
  email_reminder: "Relance par e-mail",
  whatsapp_reminder: "Relance WhatsApp",
  sms_reminder: "Relance SMS",
  formal_notice: "Mise en demeure",
  legal_transmission: "Transmission juridique",
  status_update: "Mise à jour du statut",
  note: "Note",
};

export { STATUS_LABELS, ACTION_LABELS };

export const useUnpaidCases = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unpaid-cases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unpaid_cases" as any)
        .select(`
          *,
          tenant:tenants(id, name, email, phone, property:properties(id, title, address)),
          property:properties(id, title, address)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UnpaidCase[];
    },
    enabled: !!user,
  });
};

export const useUnpaidCaseActions = (caseId: string | null) => {
  return useQuery({
    queryKey: ["unpaid-case-actions", caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data, error } = await supabase
        .from("unpaid_case_actions" as any)
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UnpaidCaseAction[];
    },
    enabled: !!caseId,
  });
};

export const useCreateUnpaidCase = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (caseData: Partial<UnpaidCase>) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("unpaid_cases" as any)
        .insert({ ...caseData, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;

      // Add detection action
      await supabase.from("unpaid_case_actions" as any).insert({
        case_id: (data as any).id,
        user_id: user.id,
        action_type: "detection",
        description: `Dossier d'impayé créé - Montant : ${Number(caseData.amount_due).toLocaleString("fr-FR")} F CFA`,
      } as any);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-cases"] });
    },
  });
};

export const useUpdateUnpaidCase = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UnpaidCase> & { id: string }) => {
      const { data, error } = await supabase
        .from("unpaid_cases" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Log status change
      if (updates.status && user) {
        await supabase.from("unpaid_case_actions" as any).insert({
          case_id: id,
          user_id: user.id,
          action_type: "status_update",
          description: `Statut modifié : ${STATUS_LABELS[updates.status] || updates.status}`,
        } as any);
      }

      return data;
    },
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-cases"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-case-actions"] });

      // When eviction is executed, expire contract and free property
      if (variables.status === "eviction_executed" && data?.tenant_id) {
        (async () => {
          try {
            // Expire all active contracts for this tenant
            const { data: contracts } = await supabase
              .from("contracts")
              .select("id, property_id, unit_id")
              .eq("tenant_id", data.tenant_id)
              .eq("status", "active");

            if (contracts && contracts.length > 0) {
              const propertyIds = new Set<string>();
              for (const contract of contracts) {
                await supabase
                  .from("contracts")
                  .update({ status: "expired", end_date: new Date().toISOString().split("T")[0] })
                  .eq("id", contract.id);

                if (contract.property_id) {
                  propertyIds.add(contract.property_id);
                }

                // If contract had a unit, mark it as available
                if (contract.unit_id) {
                  await supabase
                    .from("property_units")
                    .update({ status: "disponible" })
                    .eq("id", contract.unit_id);
                }
              }

              // Update properties to disponible
              for (const propId of propertyIds) {
                // Check if there are still occupied units
                const { data: occupiedUnits } = await supabase
                  .from("property_units")
                  .select("id")
                  .eq("property_id", propId)
                  .eq("status", "loué");

                if (!occupiedUnits || occupiedUnits.length === 0) {
                  await supabase
                    .from("properties")
                    .update({ status: "disponible" })
                    .eq("id", propId);
                }
              }
            }

            // Update tenant status to inactive
            await supabase
              .from("tenants")
              .update({ status: "inactive" })
              .eq("id", data.tenant_id);

            queryClient.invalidateQueries({ queryKey: ["contracts"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["property-units"] });
          } catch (err) {
            console.error("Erreur lors de la mise à jour post-expulsion:", err);
          }
        })();
      }
    },
  });
};

export const useAddUnpaidCaseAction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (action: Omit<UnpaidCaseAction, "id" | "created_at" | "user_id">) => {
      if (!user) throw new Error("Non authentifié");
      const { data, error } = await supabase
        .from("unpaid_case_actions" as any)
        .insert({ ...action, user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-case-actions"] });
    },
  });
};

export const useDeleteUnpaidCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("unpaid_cases" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-cases"] });
    },
  });
};
