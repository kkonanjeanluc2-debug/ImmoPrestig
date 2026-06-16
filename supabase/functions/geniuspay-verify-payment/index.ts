import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { reference, payment_id, type, user_id, plan_id, billing_cycle } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: "reference requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve GeniusPay keys
    let secretKey: string | null = null;
    let publicKey: string | null = null;
    let isSandbox = false;

    if (payment_id) {
      const { data: payment } = await adminClient
        .from("payments")
        .select("amount, paid_amount, user_id, tenant_id, status")
        .eq("id", payment_id)
        .maybeSingle();

      if (payment?.status === "paid") {
        return new Response(
          JSON.stringify({ verified: true, status: "paid" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (payment?.user_id) {
        const { data: agency } = await adminClient
          .from("agencies")
          .select("user_id, geniuspay_public_key, geniuspay_sandbox")
          .eq("user_id", payment.user_id)
          .maybeSingle();
        if (agency) {
          const { data: vault } = await adminClient.rpc("get_agency_payment_secret_by_owner", {
            _owner_user_id: agency.user_id, _field: "geniuspay_secret_key"
          });
          secretKey = (vault as string | null) || null;
          publicKey = agency.geniuspay_public_key || null;
          isSandbox = agency.geniuspay_sandbox ?? false;
        }
      }
    }

    secretKey = secretKey || Deno.env.get("GENIUSPAY_SECRET_KEY") || null;
    publicKey = publicKey || Deno.env.get("GENIUSPAY_PUBLIC_KEY") || null;

    if (!secretKey || !publicKey) {
      return new Response(
        JSON.stringify({ verified: false, error: "GeniusPay non configuré" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try multiple URL formats (the correct one depends on GeniusPay's API)
    const candidateUrls = isSandbox
      ? [`https://sandbox.pay.genius.ci/api/v1/merchant/payments/${reference}`]
      : [
          `https://pay.genius.ci/api/v1/merchant/payments/${reference}`,
          `https://geniuspay.ci/api/v1/merchant/payments/${reference}`,
        ];

    let gpResp: Response | null = null;
    let raw = "";
    for (const url of candidateUrls) {
      console.log(`Vérification GeniusPay: ${reference} → GET ${url}`);
      try {
        const r = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "X-API-Key": publicKey!,
            "X-API-Secret": secretKey!,
          },
        });
        raw = await r.text();
        console.log(`GeniusPay status (${r.status}) from ${url}:`, raw.substring(0, 600));
        if (r.ok) { gpResp = r; break; }
      } catch (fetchErr) {
        console.error(`Fetch error for ${url}:`, fetchErr);
      }
    }

    if (!gpResp || !gpResp.ok) {
      return new Response(
        JSON.stringify({ verified: false, status: "unknown", debug: raw.substring(0, 300) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let gpData: any;
    try { gpData = JSON.parse(raw); } catch {
      return new Response(
        JSON.stringify({ verified: false, status: "unknown" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payData = gpData.data || gpData;
    const gpStatus = (payData.status || "").toLowerCase();
    const gpAmount = Number(payData.amount || 0);
    const isSuccess = gpStatus.includes("success") || gpStatus.includes("completed") ||
      gpStatus.includes("paid") || gpStatus.includes("approved");

    console.log(`GeniusPay payment ${reference}: status="${gpStatus}" amount=${gpAmount} isSuccess=${isSuccess}`);

    if (!isSuccess) {
      return new Response(
        JSON.stringify({ verified: false, status: gpStatus || "pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RENT PAYMENT ──────────────────────────────────────────────────────────
    if ((type === "rent" || !type) && payment_id) {
      const { data: payment } = await adminClient
        .from("payments")
        .select("amount, paid_amount, user_id, tenant_id")
        .eq("id", payment_id)
        .maybeSingle();

      if (payment) {
        const currentPaid = Number(payment.paid_amount || 0);
        const addAmt = gpAmount > 0 ? gpAmount : Number(payment.amount);
        const newPaid = Math.min(currentPaid + addAmt, Number(payment.amount));
        const isFullyPaid = newPaid >= Number(payment.amount);

        // "partial" is not a valid status in the payments table CHECK constraint
        const verifyUpdatePayload: Record<string, unknown> = {
          paid_amount: newPaid,
          method: "geniuspay",
        };
        if (isFullyPaid) {
          verifyUpdatePayload.status = "paid";
          verifyUpdatePayload.paid_date = new Date().toISOString().split("T")[0];
        }
        await adminClient.from("payments").update(verifyUpdatePayload).eq("id", payment_id);

        await adminClient.from("online_rent_payments").insert({
          user_id: payment.user_id,
          payment_id,
          tenant_id: payment.tenant_id,
          amount: addAmt,
          kkiapay_transaction_id: reference,
          payment_method: "geniuspay",
          status: "received",
          paid_at: new Date().toISOString(),
        }).catch(e => console.error("online_rent_payments error:", e));

        console.log(`Loyer ${payment_id} mis à jour: ${isFullyPaid ? "paid" : "partial"} (${newPaid}/${payment.amount})`);

        return new Response(
          JSON.stringify({ verified: true, status: isFullyPaid ? "paid" : "partial" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── SUBSCRIPTION PAYMENT ──────────────────────────────────────────────────
    if (type === "subscription" && user_id && plan_id) {
      const { data: agency } = await adminClient
        .from("agencies")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (agency) {
        const now = new Date();
        const endsAt = new Date(now);
        const cycleMonths: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, yearly: 12 };
        endsAt.setMonth(endsAt.getMonth() + (cycleMonths[billing_cycle || "monthly"] || 1));

        await adminClient.from("agency_subscriptions").upsert({
          agency_id: agency.id,
          plan_id,
          status: "active",
          billing_cycle: billing_cycle || "monthly",
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          updated_at: now.toISOString(),
        }, { onConflict: "agency_id" });

        await adminClient.from("notifications").insert({
          user_id,
          type: "payment",
          title: "Abonnement activé",
          message: "Votre abonnement a été activé via GeniusPay.",
          entity_type: "subscription",
        }).catch(() => {});

        console.log(`Abonnement activé pour agence ${agency.id}`);
      }

      return new Response(
        JSON.stringify({ verified: true, status: "paid" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ verified: true, status: "paid" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erreur geniuspay-verify-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
