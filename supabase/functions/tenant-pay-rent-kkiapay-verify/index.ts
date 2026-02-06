import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kkiapay } from "npm:@kkiapay-org/nodejs-sdk";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface VerifyPayload {
  payment_id: string;
  transaction_id: string;
}

function isPaidStatus(raw: unknown): boolean {
  const s = String(raw ?? "").toLowerCase();
  return ["success", "successful", "completed", "approved", "paid"].includes(s);
}

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

    const KKIAPAY_PUBLIC_KEY = Deno.env.get("KKIAPAY_PUBLIC_KEY");
    const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY");
    const KKIAPAY_SECRET = Deno.env.get("KKIAPAY_SECRET");

    if (!KKIAPAY_PUBLIC_KEY || !KKIAPAY_PRIVATE_KEY || !KKIAPAY_SECRET) {
      return new Response(JSON.stringify({ success: false, error: "Configuration KKiaPay manquante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: VerifyPayload = await req.json();
    if (!body?.payment_id || !body?.transaction_id) {
      return new Response(JSON.stringify({ success: false, error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure the caller is the tenant linked to this payment
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, name")
      .eq("portal_user_id", auth.userId)
      .eq("has_portal_access", true)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ success: false, error: "Accès portail non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("id, status, tenant_id, user_id")
      .eq("id", body.payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ success: false, error: "Paiement non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.tenant_id !== tenant.id) {
      return new Response(JSON.stringify({ success: false, error: "Paiement non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "paid") {
      return new Response(JSON.stringify({ success: true, verified: true, payment_updated: false, already_paid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sandbox flag from provider config
    const { data: providerConfig } = await adminClient
      .from("payment_provider_configs")
      .select("is_sandbox")
      .eq("provider_name", "kkiapay")
      .single();

    const isSandbox = providerConfig?.is_sandbox ?? true;

    const k = kkiapay({
      privatekey: KKIAPAY_PRIVATE_KEY,
      publickey: KKIAPAY_PUBLIC_KEY,
      secretkey: KKIAPAY_SECRET,
      sandbox: isSandbox,
    });

    let verification: unknown = null;
    try {
      verification = await k.verify(body.transaction_id);
    } catch (e) {
      // Transaction not found / not finalized yet → treat as not verified (do not 500)
      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          payment_updated: false,
          error: String((e as Error)?.message || e),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const verified = isPaidStatus((verification as any)?.status) || isPaidStatus((verification as any)?.state);
    if (!verified) {
      return new Response(JSON.stringify({
        success: true,
        verified: false,
        payment_updated: false,
        verification,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();

    await adminClient
      .from("payments")
      .update({
        status: "paid",
        paid_date: now.toISOString().split("T")[0],
        method: "kkiapay",
        updated_at: now.toISOString(),
      })
      .eq("id", payment.id);

    return new Response(JSON.stringify({ success: true, verified: true, payment_updated: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in tenant-pay-rent-kkiapay-verify:", error);
    return new Response(JSON.stringify({ success: false, error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
