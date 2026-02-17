import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-geniuspay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GENIUSPAY_WEBHOOK_SECRET = Deno.env.get("GENIUSPAY_WEBHOOK_SECRET");

    if (!GENIUSPAY_WEBHOOK_SECRET) {
      console.error("GENIUSPAY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const payload = JSON.parse(body);

    console.log("GeniusPay rent webhook received:", payload);

    // Verify HMAC signature
    const signature = req.headers.get("x-geniuspay-signature");
    if (!signature) {
      console.error("Missing GeniusPay webhook signature");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(GENIUSPAY_WEBHOOK_SECRET);
    const key = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== computedSignature) {
      console.error("Invalid GeniusPay webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract payment info from webhook
    const event = payload.event || payload.type;
    const status = payload.status || payload.data?.status;
    const paymentId = payload.metadata?.payment_id || payload.data?.metadata?.payment_id;
    const transactionReference = payload.reference || payload.id || payload.data?.reference;
    const paidAmount = payload.amount || payload.data?.amount;

    let normalizedStatus: string;
    const eventLower = (event || status || "").toLowerCase();

    if (eventLower.includes("success") || eventLower.includes("completed") || eventLower.includes("paid")) {
      normalizedStatus = "completed";
    } else if (eventLower.includes("failed") || eventLower.includes("declined") || eventLower.includes("rejected")) {
      normalizedStatus = "failed";
    } else if (eventLower.includes("cancelled")) {
      normalizedStatus = "cancelled";
    } else {
      normalizedStatus = "pending";
    }

    console.log(`Processing rent payment: ${paymentId}, status: ${normalizedStatus}`);

    if (!paymentId) {
      console.log("No payment_id in webhook metadata");
      return new Response(
        JSON.stringify({ received: true, message: "No payment_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the payment record
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

    if (normalizedStatus === "completed") {
      const now = new Date();
      const currentPaidAmount = Number(payment.paid_amount || 0);
      const additionalAmount = Number(paidAmount || payment.amount);
      const newPaidAmount = currentPaidAmount + additionalAmount;
      const totalAmount = Number(payment.amount);

      const newStatus = newPaidAmount >= totalAmount ? "paid" : "partial";

      await adminClient
        .from("payments")
        .update({
          status: newStatus,
          paid_amount: Math.min(newPaidAmount, totalAmount),
          paid_date: now.toISOString().split("T")[0],
          method: "geniuspay",
          updated_at: now.toISOString(),
        })
        .eq("id", paymentId);

      console.log(`Rent payment updated: ${paymentId}, status: ${newStatus}, paid: ${newPaidAmount}`);

      // Record online payment for accounting
      const paymentMethod = payload.gateway || payload.payment_method || "geniuspay";
      await adminClient.from("online_rent_payments").insert({
        user_id: payment.user_id,
        payment_id: paymentId,
        tenant_id: payment.tenant_id,
        amount: additionalAmount,
        kkiapay_transaction_id: transactionReference,
        payment_method: paymentMethod,
        status: "received",
        paid_at: now.toISOString(),
      });

      console.log("Online rent payment recorded for accounting");

      // Notify agency
      await adminClient.from("notifications").insert({
        user_id: payment.user_id,
        type: "payment",
        title: "Paiement reçu",
        message: `Un paiement de loyer de ${additionalAmount.toLocaleString("fr-FR")} F CFA a été reçu via GeniusPay`,
        entity_type: "payment",
        entity_id: paymentId,
      });
    }

    return new Response(
      JSON.stringify({ received: true, status: normalizedStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in tenant-pay-rent-geniuspay-webhook:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
