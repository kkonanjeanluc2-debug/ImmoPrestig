import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type SuperAdminActionType = 
  | 'role_updated'
  | 'account_activated'
  | 'account_deactivated'
  | 'account_deleted';

export interface SuperAdminAuditLog {
  id: string;
  admin_user_id: string;
  action_type: SuperAdminActionType;
  target_user_id: string | null;
  target_agency_id: string | null;
  details: Json | null;
  created_at: string;
}

export function useSuperAdminAuditLogs(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["super-admin-audit-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("super_admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SuperAdminAuditLog[];
    },
    enabled: !!user?.id,
  });
}

export function useLogSuperAdminAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionType,
      targetUserId,
      targetAgencyId,
      details,
    }: {
      actionType: SuperAdminActionType;
      targetUserId?: string;
      targetAgencyId?: string;
      details?: Json;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("super_admin_audit_logs")
        .insert([{
          admin_user_id: user.id,
          action_type: actionType,
          target_user_id: targetUserId || null,
          target_agency_id: targetAgencyId || null,
          details: details || null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-audit-logs"] });
    },
  });
}
