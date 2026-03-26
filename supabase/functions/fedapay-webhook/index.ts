import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fedapay-signature",
};

async function verifyFedaPaySignature(
  payload: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const cleanSignature = signature.replace(/^sha256=/, "").toLowerCase();
    return expectedSignature.toLowerCase() === cleanSignature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fedapaySecretKey = Deno.env.get("FEDAPAY_SECRET_KEY");

    if (!fedapaySecretKey) {
      console.error("FEDAPAY_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();

    // Verify signature - mandatory
    const signature = req.headers.get("X-FedaPay-Signature") || req.headers.get("x-fedapay-signature");
    if (!signature) {
      console.error("Missing FedaPay webhook signature");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifyFedaPaySignature(rawBody, signature, fedapaySecretKey);
    if (!isValid) {
      console.error("Invalid FedaPay webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("FedaPay webhook signature verified successfully");

    const body = JSON.parse(rawBody);
    console.log("FedaPay webhook received:", JSON.stringify(body));

    const { event, entity } = body;

    // Handle transaction events
    if (entity?.name === "transaction") {
      const fedapayTransactionId = String(entity.id);
      const status = entity.status;

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

      if (newStatus === "completed") {
        const startsAt = new Date();
        const endsAt = new Date();

        const cycleMonths: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
        endsAt.setMonth(endsAt.getMonth() + (cycleMonths[transaction.billing_cycle] || 1));

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
