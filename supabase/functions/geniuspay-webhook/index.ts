import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-geniuspay-signature",
};

const ok200 = (body: object) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Always return 200 to GeniusPay — they disable webhooks that return errors
  let body = "";
  try {
    body = await req.text();
  } catch (e) {
    console.error("Cannot read request body:", e);
    return ok200({ received: true, error: "body_read_failed" });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    console.error("Cannot parse JSON body:", e, "raw:", body.substring(0, 300));
    return ok200({ received: true, error: "json_parse_failed" });
  }

  console.log("GeniusPay webhook body:", JSON.stringify(payload).substring(0, 1200));

  // Extract fields — support both flat and nested payload shapes
  const event = String(payload.event || payload.type || "");
  const status = String(payload.status || payload.data?.status || "");
  const reference = String(payload.reference || payload.data?.reference || payload.id || payload.data?.id || "");
  const paidAmount = Number(payload.amount || payload.data?.amount || 0);

  const meta = payload.metadata || payload.data?.metadata || {};
  const metaPaymentId = meta.payment_id ? String(meta.payment_id) : undefined;
  const metaType = meta.type ? String(meta.type) : undefined;
  const metaUserId = meta.user_id ? String(meta.user_id) : undefined;
  const metaPlanId = meta.plan_id ? String(meta.plan_id) : undefined;
  const metaBillingCycle = meta.billing_cycle ? String(meta.billing_cycle) : "monthly";

  const combined = (event + " " + status).toLowerCase();
  const isSuccess =
    combined.includes("success") ||
    combined.includes("completed") ||
    combined.includes("paid") ||
    combined.includes("approved") ||
    combined.includes("confirmed");

  console.log(`type="${metaType}" paymentId="${metaPaymentId}" userId="${metaUserId}" ref="${reference}" success=${isSuccess}`);
  console.log(`meta keys: [${Object.keys(meta).join(", ")}]`);

  if (!isSuccess) {
    console.log("Non-success event — no update needed");
    return ok200({ received: true, status: "pending" });
  }

  let supabaseUrl = "";
  let adminClient: ReturnType<typeof createClient>;
  try {
    supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
  } catch (e) {
    console.error("Cannot init Supabase client:", e);
    return ok200({ received: true, error: "client_init_failed" });
  }

  // ── RENT PAYMENT ─────────────────────────────────────────────────────────────
  if (metaType === "rent" && metaPaymentId) {
    console.log("Processing rent payment:", metaPaymentId);

    let payment: any = null;
    try {
      const { data, error } = await adminClient
        .from("payments")
        .select("amount, paid_amount, user_id, tenant_id")
        .eq("id", metaPaymentId)
        .maybeSingle();
      if (error) console.error("payments select error:", error);
      payment = data;
    } catch (e) {
      console.error("payments select threw:", e);
      return ok200({ received: true, error: "payment_fetch_failed" });
    }

    if (!payment) {
      console.error("Rent payment not found:", metaPaymentId);
      return ok200({ received: true, message: "payment_not_found" });
    }

    const currentPaid = Number(payment.paid_amount || 0);
    const addAmt = paidAmount > 0 ? paidAmount : Number(payment.amount);
    const newPaid = Math.min(currentPaid + addAmt, Number(payment.amount));
    const isFullyPaid = newPaid >= Number(payment.amount);

    console.log(`Updating payment: currentPaid=${currentPaid} addAmt=${addAmt} newPaid=${newPaid} full=${isFullyPaid}`);

    try {
      // "partial" is not a valid status in the payments table CHECK constraint
      // Only set status="paid" when fully paid; otherwise just update paid_amount
      const updatePayload: Record<string, unknown> = {
        paid_amount: newPaid,
        method: "geniuspay",
      };
      if (isFullyPaid) {
        updatePayload.status = "paid";
        updatePayload.paid_date = new Date().toISOString().split("T")[0];
      }

      const { error } = await adminClient
        .from("payments")
        .update(updatePayload)
        .eq("id", metaPaymentId);
      if (error) console.error("payments update error:", error);
      else console.log(`Payment ${metaPaymentId} updated to ${isFullyPaid ? "paid" : "partial"}`);
    } catch (e) {
      console.error("payments update threw:", e);
    }

    // Notification (non-fatal)
    try {
      const agencyUserId = metaUserId || (payment.user_id as string);
      if (agencyUserId) {
        const { error } = await adminClient.from("notifications").insert({
          user_id: agencyUserId,
          type: "payment",
          title: "Paiement de loyer reçu",
          message: `Un loyer de ${addAmt} F CFA a été confirmé via GeniusPay.`,
          entity_type: "payment",
          entity_id: metaPaymentId,
        });
        if (error) console.error("notifications insert error:", error);
      }
    } catch (e) {
      console.error("notifications insert threw:", e);
    }

    // Accounting record (non-fatal)
    try {
      const agencyUserId2 = metaUserId || (payment.user_id as string);
      const { error } = await adminClient.from("online_rent_payments").insert({
        user_id: agencyUserId2,
        payment_id: metaPaymentId,
        tenant_id: payment.tenant_id,
        amount: addAmt,
        kkiapay_transaction_id: reference || null,
        payment_method: "geniuspay",
        status: "received",
        paid_at: new Date().toISOString(),
      });
      if (error) console.error("online_rent_payments insert error:", error);
      else console.log("online_rent_payments recorded");
    } catch (e) {
      console.error("online_rent_payments insert threw:", e);
    }

    return ok200({ received: true, status: "completed" });
  }

  // ── SUBSCRIPTION PAYMENT ──────────────────────────────────────────────────────
  if (metaType === "subscription" && metaUserId && metaPlanId) {
    console.log("Processing subscription for user:", metaUserId, "plan:", metaPlanId);

    try {
      const { data: agency, error: agErr } = await adminClient
        .from("agencies")
        .select("id")
        .eq("user_id", metaUserId)
        .maybeSingle();
      if (agErr) console.error("agencies select error:", agErr);

      if (agency) {
        const now = new Date();
        const endsAt = new Date(now);
        const months: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
        endsAt.setMonth(endsAt.getMonth() + (months[metaBillingCycle] || 1));

        const { error: upsertErr } = await adminClient.from("agency_subscriptions").upsert(
          {
            agency_id: agency.id,
            plan_id: metaPlanId,
            status: "active",
            billing_cycle: metaBillingCycle,
            starts_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "agency_id" }
        );
        if (upsertErr) console.error("agency_subscriptions upsert error:", upsertErr);
        else console.log(`Subscription activated for agency ${agency.id}`);
      }
    } catch (e) {
      console.error("subscription processing threw:", e);
    }

    try {
      const { error } = await adminClient.from("notifications").insert({
        user_id: metaUserId,
        type: "payment",
        title: "Abonnement activé",
        message: "Votre abonnement a été activé via GeniusPay.",
        entity_type: "subscription",
      });
      if (error) console.error("subscription notification error:", error);
    } catch (e) {
      console.error("subscription notification threw:", e);
    }

    return ok200({ received: true, status: "completed" });
  }

  console.log(`Unhandled: type="${metaType}" paymentId="${metaPaymentId}" userId="${metaUserId}"`);
  return ok200({ received: true, status: "unhandled" });
});
