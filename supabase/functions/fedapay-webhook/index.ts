import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const body = await req.json();
    console.log("FedaPay webhook received:", JSON.stringify(body));

    const { event, entity } = body;

    // Handle transaction events
    if (entity?.name === "transaction") {
      const fedapayTransactionId = String(entity.id);
      const status = entity.status;
      const metadata = entity.metadata || {};

      // Find our transaction
      const { data: transaction, error: txError } = await supabase
        .from("payment_transactions")
        .select("*, agencies(*)")
        .eq("fedapay_transaction_id", fedapayTransactionId)
        .single();

      if (txError || !transaction) {
        console.error("Transaction not found:", fedapayTransactionId);
        return new Response(
          JSON.stringify({ received: true, warning: "Transaction not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map FedaPay status to our status
      let newStatus = transaction.status;
      let completedAt = null;

      switch (status) {
        case "approved":
        case "transferred":
          newStatus = "completed";
          completedAt = new Date().toISOString();
          break;
        case "declined":
        case "cancelled":
          newStatus = "failed";
          break;
        case "refunded":
          newStatus = "refunded";
          break;
        case "pending":
          newStatus = "pending";
          break;
      }

      // Update transaction status
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          status: newStatus,
          completed_at: completedAt,
          metadata: { ...transaction.metadata, fedapay_event: event, fedapay_status: status },
        })
        .eq("id", transaction.id);

      if (updateError) {
        console.error("Failed to update transaction:", updateError);
      }

      // If payment completed, activate subscription
      if (newStatus === "completed") {
        // Calculate end date based on billing cycle
        const startsAt = new Date();
        const endsAt = new Date();
        
        if (transaction.billing_cycle === "yearly") {
          endsAt.setFullYear(endsAt.getFullYear() + 1);
        } else {
          endsAt.setMonth(endsAt.getMonth() + 1);
        }

        // Upsert subscription
        const { error: subError } = await supabase
          .from("agency_subscriptions")
          .upsert({
            agency_id: transaction.agency_id,
            plan_id: transaction.plan_id,
            billing_cycle: transaction.billing_cycle,
            status: "active",
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
          }, { onConflict: "agency_id" });

        if (subError) {
          console.error("Failed to activate subscription:", subError);
        } else {
          console.log("Subscription activated for agency:", transaction.agency_id);

          // Update transaction with subscription reference
          const { data: sub } = await supabase
            .from("agency_subscriptions")
            .select("id")
            .eq("agency_id", transaction.agency_id)
            .single();

          if (sub) {
            await supabase
              .from("payment_transactions")
              .update({ subscription_id: sub.id })
              .eq("id", transaction.id);
          }
        }
      }

      return new Response(
        JSON.stringify({ received: true, status: newStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
