import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useLatePaymentNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to payment changes
    const channel = supabase
      .channel('late-payments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newPayment = payload.new as { 
            id: string; 
            status: string; 
            tenant_id: string; 
            amount: number;
          };
          const oldPayment = payload.old as { status: string };

          // Only notify when status changes to 'late'
          if (newPayment.status === 'late' && oldPayment.status !== 'late') {
            // Fetch tenant name for better notification
            const { data: tenant } = await supabase
              .from('tenants')
              .select('name')
              .eq('id', newPayment.tenant_id)
              .single();

            toast({
              title: "⚠️ Paiement en retard",
              description: `Le paiement de ${newPayment.amount.toLocaleString('fr-FR')} FCFA de ${tenant?.name || 'un locataire'} est maintenant en retard.`,
              variant: "destructive",
              duration: 10000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newPayment = payload.new as { 
            id: string; 
            status: string; 
            tenant_id: string; 
            amount: number;
          };

          // Notify for new late payments
          if (newPayment.status === 'late') {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('name')
              .eq('id', newPayment.tenant_id)
              .single();

            toast({
              title: "⚠️ Nouveau paiement en retard",
              description: `Un paiement de ${newPayment.amount.toLocaleString('fr-FR')} FCFA de ${tenant?.name || 'un locataire'} est en retard.`,
              variant: "destructive",
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user?.id, toast]);
}
