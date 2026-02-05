import { createClient } from "npm:@supabase/supabase-js@2";

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

    console.log("KKiaPay webhook received:", payload);

    // Verify signature if secret is configured (optional)
    const signature = req.headers.get("x-kkiapay-signature");
    if (KKIAPAY_SECRET && signature) {
      // Use Web Crypto API for HMAC
      const encoder = new TextEncoder();
      const keyData = encoder.encode(KKIAPAY_SECRET);
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      
      if (signature !== computedSignature) {
        console.error("Invalid KKiaPay webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract transaction data from KKiaPay webhook
    // KKiaPay webhook format may vary, handle common formats
    const transactionId = payload.transactionId || payload.transaction_id || payload.data?.transaction_id;
    const status = payload.status || payload.state;
    const kkiapayReference = payload.reference || payload.externalTransactionId;
    const amount = payload.amount || payload.data?.amount;

    // Handle different status values from KKiaPay
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
      case "pending":
      case "processing":
        normalizedStatus = "pending";
        break;
      default:
        normalizedStatus = status || "unknown";
    }

    console.log(`Processing KKiaPay payment: ${transactionId}, status: ${normalizedStatus}`);

    // Try to find the transaction by the custom data or by reference
    let transaction;

    // First try: Look for transaction with matching KKiaPay transaction ID
    if (kkiapayReference) {
      const { data } = await adminClient
        .from("payment_transactions")
        .select("*")
        .eq("fedapay_transaction_id", kkiapayReference)
        .maybeSingle();
      transaction = data;
    }

    // Second try: Look in metadata for matching transaction
    if (!transaction && transactionId) {
      const { data } = await adminClient
        .from("payment_transactions")
        .select("*")
        .eq("id", transactionId)
        .maybeSingle();
      transaction = data;
    }

    // Third try: Use data passed in the webhook payload
    if (!transaction && payload.data?.transaction_id) {
      const { data } = await adminClient
        .from("payment_transactions")
        .select("*")
        .eq("id", payload.data.transaction_id)
        .maybeSingle();
      transaction = data;
    }

    if (!transaction) {
      console.log("Transaction not found, but acknowledging webhook");
      return new Response(
        JSON.stringify({ received: true, message: "Transaction not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction status
    await adminClient
      .from("payment_transactions")
      .update({
        status: normalizedStatus,
        fedapay_transaction_id: kkiapayReference || transaction.fedapay_transaction_id,
        completed_at: normalizedStatus === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // If payment completed, activate subscription
    if (normalizedStatus === "completed") {
      const billingCycle = transaction.billing_cycle;
      const now = new Date();
      const endsAt = new Date(now);
      
      if (billingCycle === "yearly") {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      } else {
        endsAt.setMonth(endsAt.getMonth() + 1);
      }

      // Update or create subscription
      const { data: existingSub } = await adminClient
        .from("agency_subscriptions")
        .select("id")
        .eq("agency_id", transaction.agency_id)
        .maybeSingle();

      if (existingSub) {
        await adminClient
          .from("agency_subscriptions")
          .update({
            plan_id: transaction.plan_id,
            status: "active",
            billing_cycle: billingCycle,
            starts_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        await adminClient
          .from("agency_subscriptions")
          .insert({
            agency_id: transaction.agency_id,
            plan_id: transaction.plan_id,
            status: "active",
            billing_cycle: billingCycle,
            starts_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
          });
      }

      // Update transaction with subscription ID
      const { data: subscription } = await adminClient
        .from("agency_subscriptions")
        .select("id")
        .eq("agency_id", transaction.agency_id)
        .single();

      if (subscription) {
        await adminClient
          .from("payment_transactions")
          .update({ subscription_id: subscription.id })
          .eq("id", transaction.id);
      }

      console.log(`Subscription activated for agency ${transaction.agency_id}`);
    }

    return new Response(
      JSON.stringify({ received: true, status: normalizedStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in kkiapay-webhook:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
