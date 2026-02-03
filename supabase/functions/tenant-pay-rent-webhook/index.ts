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
    console.log("Tenant rent payment webhook received:", JSON.stringify(body));

    const { event, entity } = body;

    if (entity?.name === "transaction") {
      const status = entity.status;
      const metadata = entity.metadata || {};
      const paymentId = metadata.payment_id;

      if (!paymentId) {
        console.log("No payment_id in metadata");
        return new Response(
          JSON.stringify({ received: true, warning: "No payment_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the payment
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (paymentError || !payment) {
        console.error("Payment not found:", paymentId);
        return new Response(
          JSON.stringify({ received: true, warning: "Payment not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map status
      if (status === "approved" || status === "transferred") {
        // Mark payment as paid
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "paid",
            paid_date: new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentId);

        if (updateError) {
          console.error("Failed to update payment:", updateError);
        } else {
          console.log("Payment marked as paid:", paymentId);
        }
      }

      return new Response(
        JSON.stringify({ received: true, status }),
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
