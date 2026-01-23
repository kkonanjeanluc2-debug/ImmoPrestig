import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AutomationSchedule {
  id: string;
  user_id: string;
  // Rappels de paiement
  payment_reminder_enabled: boolean;
  payment_reminder_time: string;
  payment_reminder_days_before: number;
  // Relances retards
  late_payment_enabled: boolean;
  late_payment_time: string;
  late_payment_days_after: number;
  // SMS automatiques
  sms_reminder_enabled: boolean;
  sms_reminder_time: string;
  sms_reminder_weekdays: number[];
  // Quittances mensuelles
  monthly_receipt_enabled: boolean;
  monthly_receipt_day: number;
  monthly_receipt_time: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SCHEDULE: Omit<AutomationSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  payment_reminder_enabled: true,
  payment_reminder_time: '08:00:00',
  payment_reminder_days_before: 3,
  late_payment_enabled: true,
  late_payment_time: '09:00:00',
  late_payment_days_after: 1,
  sms_reminder_enabled: true,
  sms_reminder_time: '09:00:00',
  sms_reminder_weekdays: [1, 2, 3, 4, 5],
  monthly_receipt_enabled: true,
  monthly_receipt_day: 2,
  monthly_receipt_time: '08:00:00',
};

export function useAutomationSchedules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["automation-schedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("automation_schedules")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AutomationSchedule | null;
    },
    enabled: !!user?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (schedule: Partial<Omit<AutomationSchedule, 'id' | 'created_at' | 'updated_at'>>) => {
      if (!user?.id) throw new Error("Non authentifié");

      const payload = {
        user_id: user.id,
        ...schedule,
      };

      // Check if schedule exists
      const { data: existing } = await supabase
        .from("automation_schedules")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("automation_schedules")
          .update(schedule)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("automation_schedules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-schedules"] });
    },
  });

  return {
    schedule: query.data,
    isLoading: query.isLoading,
    error: query.error,
    upsertSchedule: upsertMutation.mutate,
    isUpdating: upsertMutation.isPending,
  };
}
