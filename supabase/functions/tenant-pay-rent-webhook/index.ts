import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload = await req.json();
    console.log("Tenant rent webhook received:", JSON.stringify(payload, null, 2));

    // FedaPay sends data in different structures depending on event
    const entity = payload.entity || payload;
    const transaction = entity.object === "transaction" ? entity : entity.transaction;

    if (!transaction) {
      console.log("No transaction in payload");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = transaction.status;
    const metadata = transaction.metadata || transaction.custom_metadata || {};
    const paymentId = metadata.payment_id;
    const type = metadata.type;

    // Only process tenant rent payments
    if (type !== "tenant_rent_payment") {
      console.log("Not a tenant rent payment, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentId) {
      console.log("No payment_id in metadata");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing payment ${paymentId} with status ${status}`);

    // Handle approved/completed status
    if (status === "approved" || status === "completed" || status === "transferred") {
      const paidDate = new Date().toISOString().split("T")[0];

      // Update payment status
      const { error: updateError } = await supabaseClient
        .from("payments")
        .update({
          status: "paid",
          paid_date: paidDate,
          method: "mobile_money",
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (updateError) {
        console.error("Failed to update payment:", updateError);
        throw new Error("Failed to update payment status");
      }

      console.log(`Payment ${paymentId} marked as paid`);

      // Get tenant info for notification
      const { data: payment } = await supabaseClient
        .from("payments")
        .select("tenant_id, amount, user_id")
        .eq("id", paymentId)
        .single();

      if (payment) {
        // Create notification for agency
        await supabaseClient.from("notifications").insert({
          user_id: payment.user_id,
          type: "payment",
          title: "Paiement de loyer reçu",
          message: `Un locataire a payé son loyer de ${Number(payment.amount).toLocaleString("fr-FR")} F CFA via Mobile Money.`,
          entity_type: "payment",
          entity_id: paymentId,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: "processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
