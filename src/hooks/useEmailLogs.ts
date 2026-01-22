import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EmailLog {
  id: string;
  user_id: string;
  tenant_id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  payment_id: string | null;
  created_at: string;
}

export interface EmailLogInsert {
  tenant_id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status?: string;
  payment_id?: string | null;
}

export const useEmailLogs = (tenantId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email_logs", user?.id, tenantId],
    queryFn: async () => {
      let query = supabase
        .from("email_logs" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as EmailLog[];
    },
    enabled: !!user,
  });
};

export const useCreateEmailLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (log: EmailLogInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("email_logs" as any)
        .insert({ ...log, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as EmailLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_logs"] });
    },
  });
};
