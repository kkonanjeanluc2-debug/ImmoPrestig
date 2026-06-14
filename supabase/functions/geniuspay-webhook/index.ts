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

    const body = await req.text();
    const payload = JSON.parse(body);

    console.log("GeniusPay webhook received:", JSON.stringify(payload).substring(0, 500));

    // Signature verification is optional — GeniusPay may not send the header
    const signature = req.headers.get("x-geniuspay-signature");
    if (signature && GENIUSPAY_WEBHOOK_SECRET) {
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
      console.log("GeniusPay webhook signature verified");
    } else {
      console.log("No signature header — processing without signature verification");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const event = payload.event || payload.type;
    const reference = payload.reference || payload.data?.reference || payload.id;
    const status = payload.status || payload.data?.status;

    console.log(`GeniusPay webhook event: ${event}, reference: ${reference}, status: ${status}`);

    // Try to find the transaction by reference first
    let transaction: any = null;
    if (reference) {
      const { data: txByRef } = await adminClient
        .from("transactions")
        .select("*")
        .eq("payment_method", "geniuspay")
        .eq("reference", reference)
        .maybeSingle();
      transaction = txByRef;
    }

    // Fallback: if rent payment, get payment_id directly from metadata
    const metaPaymentId = payload.metadata?.payment_id || payload.data?.metadata?.payment_id;
    if (!transaction && metaPaymentId) {
      console.log("Transaction not found by reference, trying direct rent payment via metadata:", metaPaymentId);
      const paidAmt = Number(payload.amount || payload.data?.amount || 0);
      const normalizedStatus2 = (event || status || "").toLowerCase();
      if (normalizedStatus2.includes("success") || normalizedStatus2.includes("completed") || normalizedStatus2.includes("paid")) {
        const { data: rentPayment } = await adminClient
          .from("payments")
          .select("amount, paid_amount")
          .eq("id", metaPaymentId)
          .maybeSingle();
        if (rentPayment) {
          const newPaid = Number(rentPayment.paid_amount || 0) + (paidAmt || Number(rentPayment.amount));
          const isFullyPaid = newPaid >= Number(rentPayment.amount);
          await adminClient.from("payments").update({
            status: isFullyPaid ? "paid" : "partial",
            paid_amount: Math.min(newPaid, Number(rentPayment.amount)),
            paid_date: new Date().toISOString().split("T")[0],
            method: "geniuspay",
          }).eq("id", metaPaymentId);
          console.log(`Rent payment ${metaPaymentId} updated via metadata fallback`);
        }
      }
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!transaction) {
      console.log("Transaction not found for reference:", reference, "and no metadata payment_id");
      return new Response(
        JSON.stringify({ received: true, message: "Transaction not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Update transaction status
    await adminClient
      .from("transactions")
      .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
      .eq("id", transaction.id);

    if (normalizedStatus === "completed") {
      const details = transaction.details as Record<string, unknown> || {};
      const transactionType = details.type as string;

      if (transactionType === "rent") {
        // Handle rent payment: mark the corresponding payment record as paid
        const rentPaymentId = details.payment_id as string;
        if (rentPaymentId) {
          const { data: existingPayment } = await adminClient
            .from("payments")
            .select("amount, paid_amount")
            .eq("id", rentPaymentId)
            .maybeSingle();

          if (existingPayment) {
            const newPaidAmount = Number(existingPayment.paid_amount || 0) + Number(transaction.amount || 0);
            const isFullyPaid = newPaidAmount >= Number(existingPayment.amount);

            await adminClient
              .from("payments")
              .update({
                status: isFullyPaid ? "paid" : "partial",
                paid_amount: newPaidAmount,
                paid_date: new Date().toISOString().split("T")[0],
                method: "geniuspay",
              })
              .eq("id", rentPaymentId);

            await adminClient.from("notifications").insert({
              user_id: transaction.user_id,
              type: "payment",
              title: "Paiement de loyer reçu",
              message: `Un loyer de ${Number(transaction.amount).toLocaleString("fr-FR")} F CFA a été confirmé via GeniusPay.`,
              entity_type: "payment",
              entity_id: rentPaymentId,
            });

            console.log(`Rent payment ${rentPaymentId} marked as ${isFullyPaid ? "paid" : "partial"}`);
          }
        }
      } else {
        // Handle subscription payment
        const planId = details.plan_id as string;
        const billingCycle = details.billing_cycle as string || "monthly";

        if (planId && transaction.user_id) {
          const { data: agency } = await adminClient
            .from("agencies")
            .select("id")
            .eq("user_id", transaction.user_id)
            .maybeSingle();

          if (agency) {
            const now = new Date();
            const endsAt = new Date(now);
            const cycleMonths: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
            endsAt.setMonth(endsAt.getMonth() + (cycleMonths[billingCycle] || 1));

            await adminClient
              .from("agency_subscriptions")
              .upsert({
                agency_id: agency.id,
                plan_id: planId,
                status: "active",
                billing_cycle: billingCycle,
                starts_at: now.toISOString(),
                ends_at: endsAt.toISOString(),
                updated_at: now.toISOString(),
              }, { onConflict: "agency_id" });

            console.log(`Subscription activated for agency ${agency.id}`);
          }
        }

        await adminClient.from("notifications").insert({
          user_id: transaction.user_id,
          type: "payment",
          title: "Paiement confirmé",
          message: "Votre paiement d'abonnement via GeniusPay a été confirmé.",
          entity_type: "subscription",
        });
      }
    }

    return new Response(
      JSON.stringify({ received: true, status: normalizedStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in geniuspay-webhook:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
