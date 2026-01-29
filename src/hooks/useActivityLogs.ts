import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export type ActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'restore'
  | 'permanent_delete'
  | 'login' 
  | 'logout'
  | 'payment_collected' 
  | 'reminder_sent'
  | 'document_uploaded';

export type EntityType = 
  | 'property' 
  | 'tenant' 
  | 'owner' 
  | 'payment' 
  | 'document' 
  | 'contract'
  | 'user'
  | 'lotissement'
  | 'parcelle'
  | 'acquereur'
  | 'vente_parcelle'
  | 'echeance_parcelle'
  | 'lotissement_document'
  | 'demarche_administrative'
  | 'parcelle_admin_status'
  | 'prospect'
  | 'ilot'
  | 'bien_vente'
  | 'vente_immobiliere'
  | 'echeance_vente';

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: string | null;
  entity_name: string | null;
  details: Json | null;
  created_at: string;
}

export interface CreateActivityLog {
  action_type: ActionType;
  entity_type: EntityType;
  entity_id?: string;
  entity_name?: string;
  details?: Json;
}

export function useActivityLogs(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateActivityLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: CreateActivityLog) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("activity_logs")
        .insert([{
          user_id: user.id,
          action_type: log.action_type,
          entity_type: log.entity_type,
          entity_id: log.entity_id || null,
          entity_name: log.entity_name || null,
          details: log.details || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

// Helper hook to log activity easily
export function useLogActivity() {
  const createLog = useCreateActivityLog();

  const logActivity = async (
    action_type: ActionType,
    entity_type: EntityType,
    entity_name?: string,
    entity_id?: string,
    details?: Json
  ) => {
    try {
      await createLog.mutateAsync({
        action_type,
        entity_type,
        entity_id,
        entity_name,
        details,
      });
    } catch (error) {
      // Silent fail - activity logging should not block main operations
      console.error("Failed to log activity:", error);
    }
  };

  return { logActivity };
}
