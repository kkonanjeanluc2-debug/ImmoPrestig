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

    // Handle Wave webhook callback
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const paymentId = url.searchParams.get("payment_id");

    // Also try to parse body for Wave webhook data
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty for redirect callbacks
    }

    console.log("Wave rent webhook received:", JSON.stringify({ status, paymentId, body }));

    // Extract payment ID from client_reference if available
    let targetPaymentId = paymentId;
    if (body.client_reference && body.client_reference.startsWith("rent_")) {
      targetPaymentId = body.client_reference.replace("rent_", "");
    }

    if (!targetPaymentId) {
      console.error("No payment ID found in webhook");
      return new Response(
        JSON.stringify({ received: true, warning: "No payment ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Wave payment status
    const waveStatus = body.checkout_status || body.payment_status || status;
    
    if (waveStatus === "succeeded" || waveStatus === "success" || status === "success") {
      // Update payment as paid
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_date: new Date().toISOString().split("T")[0],
          method: "wave",
        })
        .eq("id", targetPaymentId);

      if (updateError) {
        console.error("Failed to update payment:", updateError);
        return new Response(
          JSON.stringify({ received: true, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Payment marked as paid via Wave:", targetPaymentId);

      // Redirect to success page or return JSON
      if (req.headers.get("Accept")?.includes("text/html")) {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            "Location": "/tenant-portal?payment=success",
          },
        });
      }

      return new Response(
        JSON.stringify({ received: true, status: "paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (waveStatus === "failed" || waveStatus === "error" || status === "error") {
      console.log("Wave payment failed for:", targetPaymentId);

      if (req.headers.get("Accept")?.includes("text/html")) {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            "Location": "/tenant-portal?payment=failed",
          },
        });
      }

      return new Response(
        JSON.stringify({ received: true, status: "failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Wave rent webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
