import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EcheanceAchat {
  id: string;
  user_id: string;
  achat_id: string;
  amount: number;
  due_date: string;
  status: string;
  paid_amount: number | null;
  paid_date: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  achats_immobiliers?: { 
    sale_price: number; 
    biens_achat: { title: string; address: string } | null;
    vendeurs: { name: string; phone: string | null; address: string | null; cni_number: string | null } | null;
    acquereurs: { name: string; phone: string | null; address: string | null; cni_number: string | null } | null;
  } | null;
}

export function useEcheancesAchats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["echeances-achats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("echeances_achats")
        .select("*, achats_immobiliers(sale_price, biens_achat(title, address), vendeurs(name, phone, address, cni_number), acquereurs(name, phone, address, cni_number))")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as EcheanceAchat[];
    },
    enabled: !!user?.id,
  });
}

export function usePayEcheanceAchat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid_amount, payment_method }: { id: string; paid_amount: number; payment_method: string }) => {
      const { error } = await supabase
        .from("echeances_achats")
        .update({ 
          status: "paye", 
          paid_amount, 
          paid_date: new Date().toISOString().split("T")[0],
          payment_method 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["echeances-achats"] });
      toast.success("Échéance payée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
