import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePaidApportCommissions(fromDate: string, toDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["paid-apport-commissions", user?.id, fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apports")
        .select("id, commission_amount, paid_at, status, apporteur:apporteurs_affaires(name), tenant:tenants(name), property:properties(title)")
        .eq("status", "payee")
        .gte("paid_at", fromDate)
        .lte("paid_at", toDate + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}
