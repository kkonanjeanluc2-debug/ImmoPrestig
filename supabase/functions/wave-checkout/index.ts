import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaveCheckoutRequest {
  plan_id: string;
  billing_cycle: "monthly" | "yearly";
  customer_phone: string;
  return_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Get agency for this user
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: "Agence non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: WaveCheckoutRequest = await req.json();
    const { plan_id, billing_cycle, customer_phone, return_url } = body;

    if (!plan_id || !billing_cycle || !customer_phone) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: plan_id, billing_cycle, customer_phone requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get subscription plan
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Forfait non trouvé ou inactif" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate amount based on billing cycle
    const amount = billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly;

    // If free plan, activate directly
    if (amount === 0) {
      const { error: subError } = await supabase
        .from("agency_subscriptions")
        .upsert({
          agency_id: agency.id,
          plan_id: plan.id,
          billing_cycle,
          status: "active",
          starts_at: new Date().toISOString(),
        }, { onConflict: "agency_id" });

      if (subError) {
        throw new Error(`Erreur activation abonnement: ${subError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Forfait gratuit activé",
          subscription_status: "active" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Wave API key
    const waveApiKey = Deno.env.get("WAVE_API_KEY");
    if (!waveApiKey) {
      return new Response(
        JSON.stringify({ error: "Configuration Wave CI manquante. Contactez l'administrateur." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Wave provider config
    const { data: waveConfig } = await supabase
      .from("payment_provider_configs")
      .select("*")
      .eq("provider_name", "wave_ci")
      .single();

    const isSandbox = waveConfig?.is_sandbox ?? true;
    const waveBaseUrl = isSandbox
      ? "https://api.wave.com/v1" // Wave doesn't have separate sandbox URL - use test API key instead
      : "https://api.wave.com/v1";

    // Format phone number for Wave CI (+225)
    const formatWavePhone = (phone: string): string => {
      if (!phone) return "";
      
      let digits = phone.replace(/\D/g, "");
      
      // Remove country code if present
      if (digits.startsWith("225")) {
        digits = digits.slice(3);
      }
      
      // Normalize to 10 digits starting with 0
      if (digits.length === 9 && !digits.startsWith("0")) {
        digits = `0${digits}`;
      }
      
      // Wave expects format: +225XXXXXXXXXX
      return `+225${digits}`;
    };

    const formattedPhone = formatWavePhone(customer_phone);

    // Create transaction record first
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        agency_id: agency.id,
        plan_id: plan.id,
        amount,
        currency: "XOF",
        payment_method: "wave_direct",
        billing_cycle,
        customer_email: agency.email,
        customer_phone: formattedPhone,
        customer_name: agency.name,
        status: "pending",
        metadata: { provider: "wave_ci" }
      })
      .select()
      .single();

    if (txError || !transaction) {
      throw new Error(`Erreur création transaction: ${txError?.message}`);
    }

    // Create Wave checkout session
    // Wave API: https://docs.wave.com/api/checkout
    const wavePayload = {
      amount: Math.round(amount).toString(),
      currency: "XOF",
      error_url: return_url || `${supabaseUrl}/functions/v1/wave-webhook?status=error`,
      success_url: return_url || `${supabaseUrl}/functions/v1/wave-webhook?status=success`,
      client_reference: transaction.id,
      // Optional: restrict to specific phone
      // restrict_payer_mobile: formattedPhone,
    };

    console.log("Wave checkout request:", JSON.stringify({
      ...wavePayload,
      environment: isSandbox ? "sandbox" : "production",
    }));

    const waveResponse = await fetch(`${waveBaseUrl}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${waveApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wavePayload),
    });

    const waveData = await waveResponse.json();

    console.log("Wave response status:", waveResponse.status);
    console.log("Wave response data:", JSON.stringify(waveData));

    if (!waveResponse.ok) {
      const errorMessage = waveData.message || waveData.error || JSON.stringify(waveData);
      console.error("Wave error:", errorMessage);

      // Update transaction as failed
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", transaction.id);

      return new Response(
        JSON.stringify({ error: `Erreur Wave: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with Wave reference
    await supabase
      .from("payment_transactions")
      .update({
        fedapay_transaction_id: waveData.id, // Reusing this field for Wave session ID
        fedapay_reference: waveData.checkout_status || "pending",
      })
      .eq("id", transaction.id);

    // Return the Wave payment URL
    const paymentUrl = waveData.wave_launch_url;

    if (!paymentUrl) {
      return new Response(
        JSON.stringify({ error: "URL de paiement Wave non reçue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        wave_session_id: waveData.id,
        payment_url: paymentUrl,
        provider: "wave_ci",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Wave checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
