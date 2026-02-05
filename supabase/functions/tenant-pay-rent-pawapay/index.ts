import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PawaPay correspondent codes
const PAWAPAY_CORRESPONDENTS: Record<string, Record<string, string>> = {
  CI: {
    mtn_money: "MTN_MOMO_CIV",
    orange_money: "ORANGE_CIV",
    moov: "MOOV_CIV",
  },
  SN: {
    orange_money: "ORANGE_SEN",
    mtn_money: "MTN_MOMO_SEN",
  },
  BF: {
    orange_money: "ORANGE_BFA",
    moov: "MOOV_BFA",
  },
  BJ: {
    mtn_money: "MTN_MOMO_BEN",
    moov: "MOOV_BEN",
  },
  CM: {
    mtn_money: "MTN_MOMO_CMR",
    orange_money: "ORANGE_CMR",
  },
  GH: {
    mtn_money: "MTN_MOMO_GHA",
  },
};

interface PayRentPawapayRequest {
  payment_id: string;
  customer_phone: string;
  payment_method: "mtn_money" | "orange_money" | "moov";
  country_code?: string;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Verify user is a tenant with portal access
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, email, phone, user_id")
      .eq("portal_user_id", userId)
      .eq("has_portal_access", true)
      .is("deleted_at", null)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Locataire non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PayRentPawapayRequest = await req.json();
    const { payment_id, customer_phone, payment_method, country_code = "CI" } = body;

    if (!payment_id || !customer_phone || !payment_method) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the payment and verify it belongs to this tenant
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id, 
        amount, 
        due_date, 
        status,
        tenant_id,
        tenant:tenants(
          name,
          property:properties(title, address)
        )
      `)
      .eq("id", payment_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: "Paiement non trouvé ou non autorisé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment.status === "paid") {
      return new Response(
        JSON.stringify({ error: "Ce paiement a déjà été effectué" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Check PawaPay provider config
    const { data: pawapayConfig } = await supabase
      .from("payment_provider_configs")
      .select("*")
      .eq("provider_name", "pawapay")
      .single();

    const isSandbox = pawapayConfig?.is_sandbox ?? true;
    const pawapayBaseUrl = isSandbox
      ? "https://api.sandbox.pawapay.io"
      : "https://api.pawapay.io";

    // Get correspondent
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
        JSON.stringify({ error: `Méthode ${payment_method} non disponible pour ${country_code}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    const formattedPhone = customer_phone.replace(/\D/g, "");
    const depositId = crypto.randomUUID();

    const tenantData = payment.tenant as any;
    const propertyTitle = tenantData?.property?.title || "Bien";
    const dueDate = new Date(payment.due_date);
    const month = dueDate.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });

    // Create PawaPay deposit
    const pawapayPayload = {
      depositId,
      amount: Math.round(Number(payment.amount)).toString(),
      currency: "XOF",
      country: country_code,
      correspondent,
      payer: {
        type: "MSISDN",
        address: {
          value: formattedPhone,
        },
      },
      statementDescription: `Loyer ${month}`.substring(0, 22),
      metadata: [
        { fieldName: "payment_id", fieldValue: payment.id },
        { fieldName: "tenant_id", fieldValue: tenant.id },
        { fieldName: "type", fieldValue: "rent" },
      ],
    };

    console.log("PawaPay rent payment request:", JSON.stringify(pawapayPayload));

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
      return new Response(
        JSON.stringify({ error: `Erreur PawaPay: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        pawapay_deposit_id: depositId,
        status: pawapayData.status,
        message: "Une notification de paiement a été envoyée sur votre téléphone.",
        provider: "pawapay",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Tenant pay rent PawaPay error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
