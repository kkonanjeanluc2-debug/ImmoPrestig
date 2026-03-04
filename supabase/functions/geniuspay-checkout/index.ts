import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GENIUSPAY_SECRET_KEY = Deno.env.get("GENIUSPAY_SECRET_KEY");
    const GENIUSPAY_PUBLIC_KEY = Deno.env.get("GENIUSPAY_PUBLIC_KEY");

    if (!GENIUSPAY_SECRET_KEY || !GENIUSPAY_PUBLIC_KEY) {
      return new Response(
        JSON.stringify({ error: "GeniusPay not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;

    const { amount, description, plan_id, billing_cycle } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Determine sandbox or production mode
    const isSandbox = Deno.env.get("GENIUSPAY_SANDBOX") === "true";
    const baseUrl = isSandbox
      ? "https://sandbox.pay.genius.ci/api/v1/merchant/payments"
      : "https://pay.genius.ci/api/v1/merchant/payments";

    // Create GeniusPay checkout session via API
    console.log(`GeniusPay checkout: sandbox=${isSandbox}, url=${baseUrl}, amount=${Math.round(amount)}`);

    const geniusPayResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": GENIUSPAY_PUBLIC_KEY,
        "X-API-Secret": GENIUSPAY_SECRET_KEY,
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        description: description || "Abonnement ImmoPrestige",
        customer: {
          email: profile?.email || "",
          name: profile?.full_name || "",
        },
        metadata: {
          user_id: userId,
          plan_id: plan_id || "",
          billing_cycle: billing_cycle || "monthly",
          type: "subscription",
        },
        success_url: `https://immoprestigeci.com/settings?payment=success`,
        cancel_url: `https://immoprestigeci.com/settings?payment=cancelled`,
      }),
    });

    const responseText = await geniusPayResponse.text();
    let geniusPayData: any;
    try {
      geniusPayData = JSON.parse(responseText);
    } catch {
      console.error("GeniusPay returned non-JSON:", responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Réponse invalide du service de paiement. Vérifiez les clés API." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GeniusPay may wrap response in data
    const paymentData = geniusPayData.data || geniusPayData;
    const checkoutUrl = paymentData.checkout_url;

    if (!geniusPayResponse.ok || !checkoutUrl) {
      console.error("GeniusPay checkout error:", geniusPayData);
      return new Response(
        JSON.stringify({ error: geniusPayData.message || "Erreur lors de la création du paiement" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record pending transaction
    await adminClient.from("transactions").insert({
      user_id: userId,
      amount,
      type: "subscription",
      status: "pending",
      payment_method: "geniuspay",
      reference: paymentData.reference || paymentData.id || "",
      details: {
        plan_id,
        billing_cycle,
        geniuspay_reference: paymentData.reference || paymentData.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        reference: paymentData.reference || paymentData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in geniuspay-checkout:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
