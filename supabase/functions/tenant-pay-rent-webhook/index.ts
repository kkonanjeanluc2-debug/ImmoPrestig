import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Tenant rent webhook received:", JSON.stringify(body));

    // FedaPay sends event in 'entity' field
    const event = body.entity || body;
    const status = event.status;
    const metadata = event.custom_metadata || event.metadata || {};

    // Only process if this is a rent payment
    if (metadata.type !== "rent_payment") {
      console.log("Not a rent payment, skipping");
      return new Response(
        JSON.stringify({ received: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = metadata.payment_id;

    if (!paymentId) {
      console.error("Missing payment_id in metadata");
      return new Response(
        JSON.stringify({ error: "Missing payment_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing rent payment: ${paymentId}, status: ${status}`);

    // Check if payment is approved/completed
    if (status === "approved" || status === "completed" || status === "transferred") {
      const { data: payment, error: fetchError } = await supabase
        .from("payments")
        .select("id, status")
        .eq("id", paymentId)
        .single();

      if (fetchError || !payment) {
        console.error("Payment not found:", paymentId);
        return new Response(
          JSON.stringify({ error: "Payment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only update if not already paid
      if (payment.status !== "paid") {
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_date: new Date().toISOString().split("T")[0],
            method: "mobile_money",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentId);

        if (updateError) {
          console.error("Error updating payment:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update payment" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Payment ${paymentId} marked as paid`);
      } else {
        console.log(`Payment ${paymentId} already paid, skipping`);
      }
    } else if (status === "declined" || status === "canceled" || status === "failed") {
      console.log(`Payment ${paymentId} failed with status: ${status}`);
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
