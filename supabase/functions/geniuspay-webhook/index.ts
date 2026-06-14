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

    const body = await req.text();
    const payload = JSON.parse(body);

    console.log("GeniusPay webhook received:", JSON.stringify(payload).substring(0, 800));

    // Signature verification — optional, GeniusPay may not send the header
    const signature = req.headers.get("x-geniuspay-signature");
    if (signature && GENIUSPAY_WEBHOOK_SECRET) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(GENIUSPAY_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const computed = Array.from(new Uint8Array(sigBuf))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      if (signature !== computed) {
        console.error("Invalid GeniusPay webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Signature verified");
    } else {
      console.log("No signature header — processing without verification");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Extract info from the GeniusPay payload
    const event = payload.event || payload.type || "";
    const status = payload.status || payload.data?.status || "";
    const reference = payload.reference || payload.data?.reference || payload.id || "";
    const paidAmount = Number(payload.amount || payload.data?.amount || 0);

    // Metadata sent when creating the checkout
    const meta = payload.metadata || payload.data?.metadata || {};
    const metaPaymentId = meta.payment_id as string | undefined;
    const metaType = meta.type as string | undefined;
    const metaUserId = meta.user_id as string | undefined;
    const metaPlanId = meta.plan_id as string | undefined;
    const metaBillingCycle = (meta.billing_cycle as string | undefined) || "monthly";

    const eventLower = (event + " " + status).toLowerCase();
    const isSuccess = eventLower.includes("success") || eventLower.includes("completed") || eventLower.includes("paid");
    const isFailed = eventLower.includes("failed") || eventLower.includes("declined") || eventLower.includes("rejected") || eventLower.includes("cancelled");

    console.log(`event="${event}" status="${status}" type="${metaType}" paymentId="${metaPaymentId}" reference="${reference}" success=${isSuccess}`);

    if (!isSuccess) {
      console.log("Non-success event, nothing to update");
      return new Response(
        JSON.stringify({ received: true, status: isFailed ? "failed" : "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RENT PAYMENT ──────────────────────────────────────────────────────────
    if (metaType === "rent" && metaPaymentId) {
      const { data: payment } = await adminClient
        .from("payments")
        .select("amount, paid_amount, user_id, tenant_id")
        .eq("id", metaPaymentId)
        .maybeSingle();

      if (!payment) {
        console.error("Rent payment not found:", metaPaymentId);
        return new Response(
          JSON.stringify({ received: true, message: "Payment not found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentPaid = Number(payment.paid_amount || 0);
      const addAmt = paidAmount > 0 ? paidAmount : Number(payment.amount);
      const newPaid = Math.min(currentPaid + addAmt, Number(payment.amount));
      const isFullyPaid = newPaid >= Number(payment.amount);

      const { error: updateError } = await adminClient
        .from("payments")
        .update({
          status: isFullyPaid ? "paid" : "partial",
          paid_amount: newPaid,
          paid_date: new Date().toISOString().split("T")[0],
          method: "geniuspay",
        })
        .eq("id", metaPaymentId);

      if (updateError) {
        console.error("Failed to update rent payment:", updateError);
      } else {
        console.log(`Rent payment ${metaPaymentId} → ${isFullyPaid ? "paid" : "partial"} (${newPaid}/${payment.amount})`);
      }

      // Notify agency owner
      const agencyUserId = metaUserId || (payment.user_id as string);
      if (agencyUserId) {
        await adminClient.from("notifications").insert({
          user_id: agencyUserId,
          type: "payment",
          title: "Paiement de loyer reçu",
          message: `Un loyer de ${addAmt.toLocaleString("fr-FR")} F CFA a été confirmé via GeniusPay.`,
          entity_type: "payment",
          entity_id: metaPaymentId,
        }).catch(e => console.error("Notification error:", e));
      }

      // Record for accounting
      await adminClient.from("online_rent_payments").insert({
        user_id: agencyUserId,
        payment_id: metaPaymentId,
        tenant_id: payment.tenant_id,
        amount: addAmt,
        kkiapay_transaction_id: reference,
        payment_method: "geniuspay",
        status: "received",
        paid_at: new Date().toISOString(),
      }).catch(e => console.error("Online rent payment record error:", e));

      return new Response(
        JSON.stringify({ received: true, status: "completed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SUBSCRIPTION PAYMENT ──────────────────────────────────────────────────
    if (metaType === "subscription" && metaUserId && metaPlanId) {
      const { data: agency } = await adminClient
        .from("agencies")
        .select("id")
        .eq("user_id", metaUserId)
        .maybeSingle();

      if (agency) {
        const now = new Date();
        const endsAt = new Date(now);
        const cycleMonths: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
        endsAt.setMonth(endsAt.getMonth() + (cycleMonths[metaBillingCycle] || 1));

        await adminClient.from("agency_subscriptions").upsert({
          agency_id: agency.id,
          plan_id: metaPlanId,
          status: "active",
          billing_cycle: metaBillingCycle,
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          updated_at: now.toISOString(),
        }, { onConflict: "agency_id" });

        console.log(`Subscription activated for agency ${agency.id}`);
      }

      await adminClient.from("notifications").insert({
        user_id: metaUserId,
        type: "payment",
        title: "Paiement confirmé",
        message: "Votre paiement d'abonnement via GeniusPay a été confirmé.",
        entity_type: "subscription",
      }).catch(e => console.error("Notification error:", e));

      return new Response(
        JSON.stringify({ received: true, status: "completed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Unhandled webhook: type="${metaType}", metaPaymentId="${metaPaymentId}", metaUserId="${metaUserId}"`);
    return new Response(
      JSON.stringify({ received: true }),
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
