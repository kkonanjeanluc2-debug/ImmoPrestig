import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProrationData {
  remaining_days: number;
  total_days: number;
  current_plan_credit: number;
  new_plan_prorata_cost: number;
  amount_due: number;
}

interface CheckoutRequest {
  plan_id: string;
  billing_cycle: "monthly" | "yearly";
  payment_method: "mtn_money" | "orange_money" | "moov" | "airtel";
  customer_phone?: string;
  country_code?: string;
  return_url?: string;
  proration?: ProrationData | null;
}

// PawaPay correspondent codes by country and provider
// See: https://docs.pawapay.io/countries_and_correspondents
const PAWAPAY_CORRESPONDENTS: Record<string, Record<string, string>> = {
  CI: { // Côte d'Ivoire
    mtn_money: "MTN_MOMO_CIV",
    orange_money: "ORANGE_CIV",
    moov: "MOOV_CIV",
  },
  SN: { // Sénégal
    orange_money: "ORANGE_SEN",
    mtn_money: "MTN_MOMO_SEN",
  },
  BF: { // Burkina Faso
    orange_money: "ORANGE_BFA",
    moov: "MOOV_BFA",
  },
  BJ: { // Bénin
    mtn_money: "MTN_MOMO_BEN",
    moov: "MOOV_BEN",
  },
  CM: { // Cameroun
    mtn_money: "MTN_MOMO_CMR",
    orange_money: "ORANGE_CMR",
  },
  GH: { // Ghana
    mtn_money: "MTN_MOMO_GHA",
    airtel: "AIRTELTIGO_GHA",
  },
  UG: { // Uganda
    mtn_money: "MTN_MOMO_UGA",
    airtel: "AIRTEL_UGA",
  },
  TZ: { // Tanzania
    airtel: "AIRTEL_TZA",
  },
  ZM: { // Zambia
    mtn_money: "MTN_MOMO_ZMB",
    airtel: "AIRTEL_ZMB",
  },
  KE: { // Kenya
    mtn_money: "MPESA_KEN",
  },
};

// Currency by country
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  CI: "XOF",
  SN: "XOF",
  BF: "XOF",
  BJ: "XOF",
  CM: "XAF",
  GH: "GHS",
  UG: "UGX",
  TZ: "TZS",
  ZM: "ZMW",
  KE: "KES",
};

Deno.serve(async (req) => {
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
    const body: CheckoutRequest = await req.json();
    const { plan_id, billing_cycle, payment_method, customer_phone, country_code = "CI", return_url, proration } = body;

    if (!plan_id || !billing_cycle || !payment_method) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: plan_id, billing_cycle, payment_method requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing subscription to validate proration
    const { data: existingSubscription } = await supabase
      .from("agency_subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("agency_id", agency.id)
      .eq("status", "active")
      .single();

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

    // Calculate amount based on billing cycle and proration
    const fullAmount = billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    
    let amount = fullAmount;
    let isProrated = false;

    // Apply proration if changing plan mid-cycle
    if (proration && existingSubscription && existingSubscription.plan_id !== plan_id) {
      isProrated = true;
      
      if (proration.amount_due <= 0) {
        // Credit scenario - no payment needed
        const { error: subError } = await supabase
          .from("agency_subscriptions")
          .update({
            plan_id: plan.id,
            billing_cycle,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSubscription.id);

        if (subError) {
          throw new Error(`Erreur changement abonnement: ${subError.message}`);
        }

        await supabase.from("payment_transactions").insert({
          agency_id: agency.id,
          subscription_id: existingSubscription.id,
          plan_id: plan.id,
          amount: 0,
          currency: CURRENCY_BY_COUNTRY[country_code] || "XOF",
          payment_method: `pawapay_${payment_method}`,
          billing_cycle,
          customer_email: agency.email,
          customer_phone: customer_phone || agency.phone,
          customer_name: agency.name,
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            provider: "pawapay",
            proration: true,
            credit_amount: Math.abs(proration.amount_due),
            previous_plan_id: existingSubscription.plan_id,
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Forfait changé avec un crédit de ${Math.abs(proration.amount_due)} ${CURRENCY_BY_COUNTRY[country_code] || "XOF"}`,
            subscription_status: "active",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      amount = Math.round(proration.amount_due);
    }

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

    // Get PawaPay API token
    const pawapayApiToken = Deno.env.get("PAWAPAY_API_TOKEN");
    if (!pawapayApiToken) {
      return new Response(
        JSON.stringify({ error: "Configuration PawaPay manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check PawaPay provider config for sandbox mode
    const { data: pawapayConfig } = await supabase
      .from("payment_provider_configs")
      .select("*")
      .eq("provider_name", "pawapay")
      .single();

    const isSandbox = pawapayConfig?.is_sandbox ?? true;
    const pawapayBaseUrl = isSandbox
      ? "https://api.sandbox.pawapay.io"
      : "https://api.pawapay.io";

    // Get correspondent code
    const countryCorrespondents = PAWAPAY_CORRESPONDENTS[country_code];
    if (!countryCorrespondents) {
      return new Response(
        JSON.stringify({ error: `Pays non supporté: ${country_code}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const correspondent = countryCorrespondents[payment_method];
    if (!correspondent) {
      return new Response(
        JSON.stringify({ error: `Méthode de paiement ${payment_method} non disponible pour ${country_code}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number (PawaPay expects MSISDN format without +)
    const formatPhoneForPawaPay = (phone: string | null | undefined): string => {
      if (!phone) return "";
      // Remove all non-digits and leading +
      return phone.replace(/\D/g, "");
    };

    const formattedPhone = formatPhoneForPawaPay(customer_phone || agency.phone);
    const currency = CURRENCY_BY_COUNTRY[country_code] || "XOF";

    // Generate unique deposit ID (UUID v4)
    const depositId = crypto.randomUUID();

    // Create transaction record first
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        agency_id: agency.id,
        plan_id: plan.id,
        amount,
        currency,
        payment_method: `pawapay_${payment_method}`,
        billing_cycle,
        customer_email: agency.email,
        customer_phone: formattedPhone,
        customer_name: agency.name,
        status: "pending",
        metadata: {
          provider: "pawapay",
          deposit_id: depositId,
          correspondent,
          country_code,
          is_prorated: isProrated,
        },
      })
      .select()
      .single();

    if (txError || !transaction) {
      throw new Error(`Erreur création transaction: ${txError?.message}`);
    }

    // Create PawaPay deposit using Payment Page API
    const pawapayPayload = {
      depositId,
      amount: amount.toString(),
      currency,
      country: country_code,
      correspondent,
      payer: {
        type: "MSISDN",
        address: {
          value: formattedPhone,
        },
      },
      statementDescription: `${plan.name} - ${billing_cycle === "yearly" ? "Annuel" : "Mensuel"}`.substring(0, 22),
      metadata: [
        { fieldName: "transaction_id", fieldValue: transaction.id },
        { fieldName: "agency_id", fieldValue: agency.id },
        { fieldName: "plan_id", fieldValue: plan.id },
      ],
    };

    console.log("PawaPay deposit request:", JSON.stringify({
      ...pawapayPayload,
      environment: isSandbox ? "sandbox" : "production",
    }));

    const pawapayResponse = await fetch(`${pawapayBaseUrl}/deposits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pawapayApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pawapayPayload),
    });

    const pawapayData = await pawapayResponse.json();

    console.log("PawaPay response status:", pawapayResponse.status);
    console.log("PawaPay response data:", JSON.stringify(pawapayData));

    if (!pawapayResponse.ok) {
      const errorMessage = pawapayData.message || pawapayData.error || JSON.stringify(pawapayData);
      console.error("PawaPay error:", errorMessage);

      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", transaction.id);

      return new Response(
        JSON.stringify({ error: `Erreur PawaPay: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with PawaPay reference
    await supabase
      .from("payment_transactions")
      .update({
        fedapay_transaction_id: depositId, // Reusing field for PawaPay deposit ID
        fedapay_reference: pawapayData.status || "SUBMITTED",
      })
      .eq("id", transaction.id);

    // PawaPay sends USSD push to user's phone - no redirect URL
    // The user will receive a prompt on their phone to confirm payment
    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        pawapay_deposit_id: depositId,
        status: pawapayData.status,
        message: "Une notification de paiement a été envoyée sur votre téléphone. Veuillez confirmer le paiement.",
        provider: "pawapay",
        // For Payment Page integration (if using that instead):
        payment_url: pawapayData.redirectUrl || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("PawaPay checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
