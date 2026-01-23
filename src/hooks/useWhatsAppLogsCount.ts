import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWhatsAppLogsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-logs-count"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from("whatsapp_logs")
        .select("*", { count: "exact", head: true });

      if (totalError) throw totalError;

      // Get this month's count
      const { count: monthCount, error: monthError } = await supabase
        .from("whatsapp_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth);

      if (monthError) throw monthError;

      return {
        total: totalCount || 0,
        thisMonth: monthCount || 0,
      };
    },
    enabled: !!user,
  });
}
