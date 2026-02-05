import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, pawapay-signature",
};

interface PawapayWebhookPayload {
  depositId: string;
  status: "COMPLETED" | "FAILED" | "DUPLICATE_IGNORED" | "REJECTED" | "SUBMITTED" | "ACCEPTED";
  amount: string;
  currency: string;
  correspondent: string;
  payer: {
    type: string;
    address: {
      value: string;
    };
  };
  customerTimestamp?: string;
  created?: string;
  metadata?: Array<{ fieldName: string; fieldValue: string }>;
  failureReason?: {
    failureCode: string;
    failureMessage: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PawaPay sends webhook signature in header
    const signature = req.headers.get("pawapay-signature");
    const webhookSecret = Deno.env.get("PAWAPAY_WEBHOOK_SECRET");

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      // PawaPay uses HMAC-SHA256 signature verification
      // For now, log the signature - implement full verification if needed
      console.log("PawaPay webhook signature received:", signature);
    }

    const payload: PawapayWebhookPayload = await req.json();

    console.log("PawaPay webhook received:", JSON.stringify(payload));

    const { depositId, status, failureReason, metadata } = payload;

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
      // Still return 200 to acknowledge webhook
      return new Response(
        JSON.stringify({ received: true, error: "Transaction not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map PawaPay status to our status
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
        // Ignore duplicate webhooks
        return new Response(
          JSON.stringify({ received: true, status: "duplicate_ignored" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      default:
        newStatus = transaction.status;
    }

    // Update transaction status
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

    // If payment completed, activate subscription
    if (newStatus === "completed") {
      const startsAt = new Date();
      const endsAt = new Date();

      if (transaction.billing_cycle === "yearly") {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      } else {
        endsAt.setMonth(endsAt.getMonth() + 1);
      }

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

        // Create notification for the user
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
    // Return 200 to prevent retries for malformed requests
    return new Response(
      JSON.stringify({ received: true, error: "Processing error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
