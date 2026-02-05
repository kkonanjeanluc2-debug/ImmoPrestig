import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckoutPayload {
  plan_id: string;
  billing_cycle: "monthly" | "yearly";
  payment_method: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get agency for the user
    const { data: agency, error: agencyError } = await adminClient
      .from("agencies")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: "Agence non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: CheckoutPayload = await req.json();
    const { plan_id, billing_cycle, payment_method, customer_name, customer_email, customer_phone } = payload;

    // Get plan details
    const { data: plan, error: planError } = await adminClient
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Plan non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate amount
    let amount = plan.price_monthly;
    if (billing_cycle === "yearly") {
      const { data: settings } = await adminClient
        .from("platform_settings")
        .select("value")
        .eq("key", "yearly_discount_percentage")
        .single();
      const discount = settings?.value ? parseInt(settings.value) : 20;
      amount = Math.round(plan.price_monthly * 12 * (1 - discount / 100));
    }

    // Get KKiaPay configuration
    const KKIAPAY_PUBLIC_KEY = Deno.env.get("KKIAPAY_PUBLIC_KEY");
    const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY");
    const KKIAPAY_SECRET = Deno.env.get("KKIAPAY_SECRET");

    if (!KKIAPAY_PUBLIC_KEY || !KKIAPAY_PRIVATE_KEY) {
      console.error("KKiaPay API keys not configured");
      return new Response(
        JSON.stringify({ error: "Configuration KKiaPay manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check provider config for sandbox mode
    const { data: providerConfig } = await adminClient
      .from("payment_provider_configs")
      .select("is_sandbox")
      .eq("provider_name", "kkiapay")
      .single();

    const isSandbox = providerConfig?.is_sandbox ?? true;
    const kkiapayUrl = isSandbox 
      ? "https://api-sandbox.kkiapay.me/api/v1/payments/request" 
      : "https://api.kkiapay.me/api/v1/payments/request";

    // Create transaction record
    const { data: transaction, error: txError } = await adminClient
      .from("payment_transactions")
      .insert({
        agency_id: agency.id,
        plan_id: plan_id,
        amount: amount,
        currency: "XOF",
        payment_method: payment_method,
        billing_cycle: billing_cycle,
        customer_email: customer_email,
        customer_phone: customer_phone,
        customer_name: customer_name,
        status: "pending",
        metadata: { provider: "kkiapay" },
      })
      .select()
      .single();

    if (txError) {
      console.error("Error creating transaction:", txError);
      return new Response(
        JSON.stringify({ error: "Erreur création transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/kkiapay-webhook`;

    // Create KKiaPay payment request
    const kkiapayPayload = {
      amount: amount,
      reason: `Abonnement ${plan.name} - ${billing_cycle === "yearly" ? "Annuel" : "Mensuel"}`,
      data: {
        transaction_id: transaction.id,
        agency_id: agency.id,
        plan_id: plan_id,
        billing_cycle: billing_cycle,
      },
      callback: callbackUrl,
      name: customer_name,
      email: customer_email,
      phone: customer_phone,
      sandbox: isSandbox,
    };

    const response = await fetch(kkiapayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": KKIAPAY_PRIVATE_KEY,
      },
      body: JSON.stringify(kkiapayPayload),
    });

    const responseText = await response.text();
    console.log("KKiaPay response:", responseText);

    if (!response.ok) {
      console.error("KKiaPay API error:", responseText);
      await adminClient
        .from("payment_transactions")
        .update({ status: "failed", error_message: responseText })
        .eq("id", transaction.id);

      return new Response(
        JSON.stringify({ error: "Erreur KKiaPay", details: responseText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let kkiapayResponse;
    try {
      kkiapayResponse = JSON.parse(responseText);
    } catch {
      // KKiaPay might return a payment URL directly or different format
      // For widget integration, we return the public key and transaction info
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transaction.id,
          public_key: KKIAPAY_PUBLIC_KEY,
          amount: amount,
          name: customer_name,
          email: customer_email,
          phone: customer_phone,
          sandbox: isSandbox,
          reason: `Abonnement ${plan.name}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with KKiaPay reference
    if (kkiapayResponse.transactionId || kkiapayResponse.transaction_id) {
      await adminClient
        .from("payment_transactions")
        .update({
          fedapay_transaction_id: kkiapayResponse.transactionId || kkiapayResponse.transaction_id,
          fedapay_reference: kkiapayResponse.reference,
        })
        .eq("id", transaction.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        public_key: KKIAPAY_PUBLIC_KEY,
        amount: amount,
        name: customer_name,
        email: customer_email,
        phone: customer_phone,
        sandbox: isSandbox,
        reason: `Abonnement ${plan.name}`,
        kkiapay_response: kkiapayResponse,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in kkiapay-checkout:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
