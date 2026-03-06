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
  resolved: "Résolu",
  loyer_a_jour: "Loyer à jour",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-cases"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-case-actions"] });
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
