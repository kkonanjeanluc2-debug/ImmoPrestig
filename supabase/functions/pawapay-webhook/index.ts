import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, pawapay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("PAWAPAY_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("PAWAPAY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();

    // Verify webhook signature - mandatory
    const signature = req.headers.get("pawapay-signature");
    if (!signature) {
      console.error("Missing PawaPay webhook signature");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PawaPay uses HMAC-SHA256 signature verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const key = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== expectedSignature) {
      console.error("Invalid PawaPay webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.parse(rawBody);
    console.log("PawaPay webhook received:", JSON.stringify(payload));

    const { depositId, status, failureReason } = payload;

    if (!depositId) {
      return new Response(
        JSON.stringify({ error: "depositId manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find transaction by PawaPay deposit ID
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("fedapay_transaction_id", depositId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found for depositId:", depositId);
      return new Response(
        JSON.stringify({ received: true, error: "Transaction not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let newStatus: string;
    let errorMessage: string | null = null;

    switch (status) {
      case "COMPLETED":
        newStatus = "completed";
        break;
      case "FAILED":
      case "REJECTED":
        newStatus = "failed";
        errorMessage = failureReason
          ? `${failureReason.failureCode}: ${failureReason.failureMessage}`
          : "Paiement échoué";
        break;
      case "SUBMITTED":
      case "ACCEPTED":
        newStatus = "pending";
        break;
      case "DUPLICATE_IGNORED":
        return new Response(
          JSON.stringify({ received: true, status: "duplicate_ignored" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      default:
        newStatus = transaction.status;
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      fedapay_reference: status,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await supabase
      .from("payment_transactions")
      .update(updateData)
      .eq("id", transaction.id);

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
        console.error("Error activating subscription:", subError);
      } else {
        console.log(`Subscription activated for agency ${transaction.agency_id}`);

        const { data: agency } = await supabase
          .from("agencies")
          .select("user_id, name")
          .eq("id", transaction.agency_id)
          .single();

        if (agency) {
          await supabase.from("notifications").insert({
            user_id: agency.user_id,
            type: "subscription",
            title: "Abonnement activé",
            message: `Votre abonnement a été activé avec succès via PawaPay.`,
          });
        }
      }
    }

    console.log(`Transaction ${transaction.id} updated to status: ${newStatus}`);

    return new Response(
      JSON.stringify({ received: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("PawaPay webhook error:", error);
    return new Response(
      JSON.stringify({ received: true, error: "Processing error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
