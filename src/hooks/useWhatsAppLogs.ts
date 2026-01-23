import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WhatsAppLog {
  id: string;
  user_id: string;
  tenant_id: string;
  payment_id: string | null;
  document_id: string | null;
  message_type: string;
  recipient_phone: string;
  message_preview: string;
  created_at: string;
}

export function useWhatsAppLogs(tenantId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-logs", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WhatsAppLog[];
    },
    enabled: !!user,
  });
}

export function useLogWhatsAppMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      tenantId: string;
      paymentId?: string;
      documentId?: string;
      messageType: "receipt" | "reminder" | "late_reminder" | "document";
      recipientPhone: string;
      messagePreview: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("whatsapp_logs")
        .insert({
          user_id: user.id,
          tenant_id: params.tenantId,
          payment_id: params.paymentId || null,
          document_id: params.documentId || null,
          message_type: params.messageType,
          recipient_phone: params.recipientPhone,
          message_preview: params.messagePreview.substring(0, 500), // Limit preview length
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs", variables.tenantId] });
    },
  });
}
