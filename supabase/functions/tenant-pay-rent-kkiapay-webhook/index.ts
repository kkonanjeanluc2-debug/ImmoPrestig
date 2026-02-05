import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kkiapay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const KKIAPAY_SECRET = Deno.env.get("KKIAPAY_SECRET");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const payload = JSON.parse(body);

    console.log("KKiaPay rent webhook received:", payload);

    // Verify signature if secret is configured
    const signature = req.headers.get("x-kkiapay-signature");
    if (KKIAPAY_SECRET && signature) {
      const computedSignature = createHmac("sha256", KKIAPAY_SECRET)
        .update(body)
        .digest("hex");
      
      if (signature !== computedSignature) {
        console.error("Invalid KKiaPay webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract data from webhook
    const status = payload.status || payload.state;
    const paymentId = payload.data?.payment_id;
    const transactionReference = payload.transactionId || payload.reference;

    // Normalize status
    let normalizedStatus: string;
    switch (status?.toLowerCase()) {
      case "success":
      case "successful":
      case "completed":
      case "approved":
        normalizedStatus = "completed";
        break;
      case "failed":
      case "declined":
      case "rejected":
        normalizedStatus = "failed";
        break;
      default:
        normalizedStatus = "pending";
    }

    console.log(`Processing rent payment: ${paymentId}, status: ${normalizedStatus}`);

    if (!paymentId) {
      console.log("No payment_id in webhook data");
      return new Response(
        JSON.stringify({ received: true, message: "No payment_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the payment
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.log("Payment not found:", paymentId);
      return new Response(
        JSON.stringify({ received: true, message: "Payment not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only update if payment completed
    if (normalizedStatus === "completed") {
      const now = new Date();

      await adminClient
        .from("payments")
        .update({
          status: "paid",
          paid_date: now.toISOString().split("T")[0],
          method: "kkiapay",
          updated_at: now.toISOString(),
        })
        .eq("id", paymentId);

      console.log(`Rent payment marked as paid: ${paymentId}`);

      // Create notification for agency owner
      await adminClient.from("notifications").insert({
        user_id: payment.user_id,
        type: "payment",
        title: "Paiement reçu",
        message: `Un paiement de loyer a été reçu via KKiaPay`,
        entity_type: "payment",
        entity_id: paymentId,
      });
    }

    return new Response(
      JSON.stringify({ received: true, status: normalizedStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in tenant-pay-rent-kkiapay-webhook:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
