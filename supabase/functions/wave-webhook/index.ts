import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, wave-signature",
};

interface WaveWebhookPayload {
  id: string;
  type: string;
  data: {
    id: string;
    amount: string;
    currency: string;
    checkout_status: "complete" | "cancelled" | "expired";
    client_reference: string; // Our transaction_id
    last_payment_error?: string;
    payment_status?: string;
    when_completed?: string;
    when_created?: string;
    when_expires?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle GET request (redirect from Wave success/error URLs)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const status = url.searchParams.get("status");
      const redirectUrl = url.searchParams.get("redirect") || "/settings?tab=subscription";

      // Simply redirect to the app
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": redirectUrl,
        },
      });
    }

    // Handle POST webhook from Wave
    const waveWebhookSecret = Deno.env.get("WAVE_WEBHOOK_SECRET");
    const rawBody = await req.text();
    
    // Verify webhook signature if secret is configured
    if (waveWebhookSecret) {
      const signature = req.headers.get("wave-signature");
      if (signature) {
        const expectedSignature = createHmac("sha256", waveWebhookSecret)
          .update(rawBody)
          .digest("hex");
        
        if (signature !== expectedSignature) {
          console.error("Invalid Wave webhook signature");
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const payload: WaveWebhookPayload = JSON.parse(rawBody);

    console.log("Wave webhook received:", JSON.stringify(payload));

    // Only process checkout.session.completed events
    if (payload.type !== "checkout.session.completed") {
      console.log(`Ignoring Wave event type: ${payload.type}`);
      return new Response(
        JSON.stringify({ received: true, ignored: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data } = payload;
    const transactionId = data.client_reference;

    if (!transactionId) {
      console.error("No client_reference in Wave webhook");
      return new Response(
        JSON.stringify({ error: "Missing client_reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get our transaction
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", transactionId);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine status based on checkout_status
    let newStatus: string;
    let errorMessage: string | null = null;

    switch (data.checkout_status) {
      case "complete":
        newStatus = "completed";
        break;
      case "cancelled":
        newStatus = "cancelled";
        errorMessage = "Paiement annulé par l'utilisateur";
        break;
      case "expired":
        newStatus = "expired";
        errorMessage = "Session de paiement expirée";
        break;
      default:
        newStatus = "failed";
        errorMessage = data.last_payment_error || "Erreur inconnue";
    }

    // Update transaction
    await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        error_message: errorMessage,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        fedapay_reference: data.checkout_status,
      })
      .eq("id", transactionId);

    // If payment completed, activate subscription
    if (newStatus === "completed") {
      const { error: subError } = await supabase
        .from("agency_subscriptions")
        .upsert({
          agency_id: transaction.agency_id,
          plan_id: transaction.plan_id,
          billing_cycle: transaction.billing_cycle,
          status: "active",
          starts_at: new Date().toISOString(),
          ends_at: calculateEndDate(transaction.billing_cycle),
        }, { onConflict: "agency_id" });

      if (subError) {
        console.error("Error activating subscription:", subError);
      } else {
        console.log(`Subscription activated for agency ${transaction.agency_id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        transaction_id: transactionId,
        status: newStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Wave webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateEndDate(billingCycle: string): string {
  const now = new Date();
  if (billingCycle === "yearly") {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}
