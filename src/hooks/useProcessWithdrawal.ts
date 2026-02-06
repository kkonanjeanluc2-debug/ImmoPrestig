import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProcessWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { withdrawal_id: withdrawalId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["online-rent-payments"] });
      
      if (data.status === "processing") {
        toast.info("Reversement en cours de traitement par KKiaPay");
      } else {
        toast.success("Reversement effectué avec succès!");
      }
    },
    onError: (error: Error) => {
      console.error("Error processing withdrawal:", error);
      toast.error(error.message || "Erreur lors du reversement");
    },
  });
}
