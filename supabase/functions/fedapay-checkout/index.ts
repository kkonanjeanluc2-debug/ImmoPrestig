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
  payment_method: "orange_money" | "mtn_money" | "wave" | "moov" | "card";
  customer_phone?: string;
  return_url?: string;
  proration?: ProrationData | null;
}

const fedapayModeByPaymentMethod: Record<CheckoutRequest["payment_method"], string | null> = {
  // Based on FedaPay CI naming conventions seen in checkout (ex: mtn_open_ci)
  orange_money: "orange_ci",
  mtn_money: "mtn_open_ci",
  wave: "wave_ci",
  moov: "moov_ci",
  card: null,
};

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
    const body: CheckoutRequest = await req.json();
    const { plan_id, billing_cycle, payment_method, customer_phone, return_url, proration } = body;

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
    
    // Determine final amount to charge
    let amount = fullAmount;
    let isProrated = false;
    let creditAmount = 0;

    // Apply proration if changing plan mid-cycle
    if (proration && existingSubscription && existingSubscription.plan_id !== plan_id) {
      isProrated = true;
      
      // If proration results in credit (downgrade), no payment needed
      if (proration.amount_due <= 0) {
        creditAmount = Math.abs(proration.amount_due);
        
        // Record credit and activate subscription immediately
        const startsAt = new Date();
        const endsAt = new Date(existingSubscription.ends_at || startsAt);
        
        // Update subscription to new plan (keep same end date)
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

        // Record the credit as a transaction
        await supabase
          .from("payment_transactions")
          .insert({
            agency_id: agency.id,
            subscription_id: existingSubscription.id,
            plan_id: plan.id,
            amount: 0,
            currency: "XOF",
            payment_method,
            billing_cycle,
            customer_email: agency.email,
            customer_phone: customer_phone || agency.phone,
            customer_name: agency.name,
            status: "completed",
            completed_at: new Date().toISOString(),
            metadata: {
              proration: true,
              credit_amount: creditAmount,
              previous_plan_id: existingSubscription.plan_id,
              remaining_days: proration.remaining_days,
            },
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Forfait changé avec un crédit de ${creditAmount} XOF`,
            subscription_status: "active",
            credit_amount: creditAmount,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Use prorated amount for upgrade
      amount = Math.round(proration.amount_due);
    }

    // If free plan, activate directly
    if (amount === 0) {
      // Upsert subscription
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
      )
    }

    // Get FedaPay credentials
    const fedapaySecretKey = Deno.env.get("FEDAPAY_SECRET_KEY");
    if (!fedapaySecretKey) {
      return new Response(
        JSON.stringify({ error: "Configuration FedaPay manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine FedaPay environment
    const isSandbox = fedapaySecretKey.startsWith("sk_sandbox_");
    const fedapayBaseUrl = isSandbox 
      ? "https://sandbox-api.fedapay.com/v1" 
      : "https://api.fedapay.com/v1";

    // Create transaction record first
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        agency_id: agency.id,
        plan_id: plan.id,
        amount,
        currency: "XOF",
        payment_method,
        billing_cycle,
        customer_email: agency.email,
        customer_phone: customer_phone || agency.phone,
        customer_name: agency.name,
        status: "pending",
        metadata: isProrated ? {
          proration: true,
          original_amount: fullAmount,
          prorated_amount: amount,
          current_plan_credit: proration?.current_plan_credit,
          remaining_days: proration?.remaining_days,
          previous_plan_id: existingSubscription?.plan_id,
        } : {},
      })
      .select()
      .single();

    if (txError || !transaction) {
      throw new Error(`Erreur création transaction: ${txError?.message}`);
    }

    // Format phone number for Ivory Coast (+225)
    // Observation (via logs): FedaPay validates CI numbers with the leading 0 when using the new 10-digit plan.
    // We therefore normalize to either:
    // - 10 digits starting with 0 (new plan)  -> +2250XXXXXXXXX
    // - 8 digits (legacy plan)                -> +225XXXXXXXX
    const formatIvorianPhone = (phone: string | null | undefined): string => {
      if (!phone) return "";

      // Keep digits only
      let digits = phone.replace(/\D/g, "");

      // If user already provided country code 225, remove it (we will re-add it)
      if (digits.startsWith("225")) {
        digits = digits.slice(3);
      }

      // Normalize to 10 digits starting with 0 when possible
      // - If user entered 9 digits without leading 0, prepend it
      // - If user entered 10 digits starting with 0, keep as-is
      if (digits.length === 9 && !digits.startsWith("0")) {
        digits = `0${digits}`;
      }

      // Accept new format (10 digits starting with 0) or legacy (8 digits)
      const isNewFormat = digits.length === 10 && digits.startsWith("0");
      const isLegacyFormat = digits.length === 8;

      if (!isNewFormat && !isLegacyFormat) {
        console.error(
          `Invalid CI phone number: digits=${digits} length=${digits.length} (expected 10 digits starting with 0, or 8 digits)`
        );
        return "";
      }

      return `+225${digits}`;
    };

    const formattedPhone = formatIvorianPhone(customer_phone || agency.phone);

    const fedapayMode = fedapayModeByPaymentMethod[payment_method] ?? null;

    // Create FedaPay transaction
    const description = isProrated 
      ? `Changement forfait vers ${plan.name} (prorata ${proration?.remaining_days} jours)`
      : `Abonnement ${plan.name} - ${billing_cycle === "yearly" ? "Annuel" : "Mensuel"}`;

    const fedapayPayload = {
      description,
      amount: Math.round(amount),
      currency: { iso: "XOF" },
      callback_url: return_url || `${supabaseUrl}/functions/v1/fedapay-webhook`,
      ...(fedapayMode ? { mode: fedapayMode } : {}),
      customer: {
        firstname: agency.name.split(" ")[0] || agency.name,
        lastname: agency.name.split(" ").slice(1).join(" ") || "",
        email: agency.email,
        phone_number: {
          number: formattedPhone,
          country: "CI",
        },
      },
      metadata: {
        transaction_id: transaction.id,
        agency_id: agency.id,
        plan_id: plan.id,
        billing_cycle,
        is_prorated: isProrated,
        previous_plan_id: existingSubscription?.plan_id || null,
      },
    };

    console.log(
      "FedaPay request:",
      JSON.stringify({
        ...fedapayPayload,
        environment: isSandbox ? "sandbox" : "production",
        selected_payment_method: payment_method,
      }),
    );

    const fedapayResponse = await fetch(`${fedapayBaseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${fedapaySecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fedapayPayload),
    });

    const fedapayData = await fedapayResponse.json();
    
    console.log("FedaPay response status:", fedapayResponse.status);
    console.log("FedaPay response data:", JSON.stringify(fedapayData));

    if (!fedapayResponse.ok) {
      const errorMessage = fedapayData.message || fedapayData.error?.message || JSON.stringify(fedapayData);
      console.error("FedaPay error:", errorMessage);
      
      // Update transaction as failed
      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
          error_message: errorMessage,
        })
        .eq("id", transaction.id);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FedaPay returns the transaction under "v1/transaction" key (with slash)
    const fedapayTransaction = fedapayData["v1/transaction"];
    
    if (!fedapayTransaction) {
      console.error("Unexpected FedaPay response structure:", JSON.stringify(fedapayData));
      return new Response(
        JSON.stringify({ error: "Réponse FedaPay inattendue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction with FedaPay reference
    await supabase
      .from("payment_transactions")
      .update({
        fedapay_transaction_id: String(fedapayTransaction.id),
        fedapay_reference: fedapayTransaction.reference,
      })
      .eq("id", transaction.id);

    // FedaPay already returns payment_url in the transaction response
    const paymentUrl = fedapayTransaction.payment_url;
    
    if (!paymentUrl) {
      // Fallback: Generate payment token/URL if not provided
      const tokenResponse = await fetch(`${fedapayBaseUrl}/transactions/${fedapayTransaction.id}/token`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${fedapaySecretKey}`,
          "Content-Type": "application/json",
        },
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Erreur génération lien de paiement" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transaction.id,
          fedapay_transaction_id: fedapayTransaction.id,
          payment_url: tokenData.url,
          token: tokenData.token,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        fedapay_transaction_id: fedapayTransaction.id,
        payment_url: paymentUrl,
        token: fedapayTransaction.payment_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Checkout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
