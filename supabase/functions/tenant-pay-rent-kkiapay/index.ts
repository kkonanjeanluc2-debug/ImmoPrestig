import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface PayRentPayload {
  payment_id: string;
  amount: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
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

    const portalUserId = auth.userId;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify this is a tenant with portal access
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, name, user_id")
      .eq("portal_user_id", portalUserId)
      .eq("has_portal_access", true)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Accès portail non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: PayRentPayload = await req.json();
    const { payment_id, amount, customer_name, customer_phone, customer_email } = payload;

    // Verify the payment belongs to this tenant
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("id, status, user_id, tenant_id")
      .eq("id", payment_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Paiement non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status === "paid") {
      return new Response(JSON.stringify({ error: "Ce paiement a déjà été effectué" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get KKiaPay configuration
    const KKIAPAY_PUBLIC_KEY = Deno.env.get("KKIAPAY_PUBLIC_KEY");
    const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY");

    if (!KKIAPAY_PUBLIC_KEY || !KKIAPAY_PRIVATE_KEY) {
      console.error("KKiaPay API keys not configured");
      return new Response(JSON.stringify({ error: "Configuration KKiaPay manquante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check provider config for sandbox mode
    const { data: providerConfig } = await adminClient
      .from("payment_provider_configs")
      .select("is_sandbox")
      .eq("provider_name", "kkiapay")
      .single();

    const isSandbox = providerConfig?.is_sandbox ?? true;

    // For KKiaPay, we return the widget configuration
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment_id,
        public_key: KKIAPAY_PUBLIC_KEY,
        amount: amount,
        name: customer_name || tenant.name,
        phone: customer_phone,
        email: customer_email || "",
        sandbox: isSandbox,
        reason: `Paiement loyer - ${tenant.name}`,
        callback_url: `${supabaseUrl}/functions/v1/tenant-pay-rent-kkiapay-webhook`,
        data: {
          payment_id: payment_id,
          tenant_id: tenant.id,
          agency_user_id: payment.user_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in tenant-pay-rent-kkiapay:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
