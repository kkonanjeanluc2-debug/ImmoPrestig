import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TaskType = 
  | "payment_reminder" 
  | "late_payment" 
  | "sms_reminder" 
  | "monthly_receipt" 
  | "expire_contracts" 
  | "check_expiring_contracts";

export type ExecutionStatus = "running" | "success" | "partial" | "failed";

export interface AutomationLog {
  id: string;
  user_id: string;
  task_type: TaskType;
  started_at: string;
  completed_at: string | null;
  status: ExecutionStatus;
  items_processed: number;
  items_success: number;
  items_failed: number;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  payment_reminder: "Rappels de paiement",
  late_payment: "Relances de retard",
  sms_reminder: "SMS automatiques",
  monthly_receipt: "Quittances mensuelles",
  expire_contracts: "Expiration contrats",
  check_expiring_contracts: "Alertes contrats",
};

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  payment_reminder: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  late_payment: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  sms_reminder: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  monthly_receipt: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  expire_contracts: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  check_expiring_contracts: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

export function useAutomationLogs(limit: number = 50, taskType?: TaskType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["automation-logs", user?.id, limit, taskType],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("automation_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (taskType) {
        query = query.eq("task_type", taskType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!user?.id,
  });
}
