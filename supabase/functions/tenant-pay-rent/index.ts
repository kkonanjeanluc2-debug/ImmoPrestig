import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayRentRequest {
  payment_id: string;
  payment_method: "orange_money" | "mtn_money" | "wave" | "moov";
  customer_phone: string;
  return_url?: string;
}

const fedapayModeByPaymentMethod: Record<PayRentRequest["payment_method"], string> = {
  orange_money: "orange_ci",
  mtn_money: "mtn_open_ci",
  wave: "wave_ci",
  moov: "moov_ci",
};

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

    // Verify user is a tenant
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

    const body: PayRentRequest = await req.json();
    const { payment_id, payment_method, customer_phone, return_url } = body;

    if (!payment_id || !payment_method || !customer_phone) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: payment_id, payment_method, customer_phone requis" }),
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

    // Get agency info for the payment owner (including mobile money details)
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id, name, email, phone, mobile_money_number, mobile_money_provider")
      .eq("user_id", tenant.user_id)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: "Agence non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify agency has configured mobile money
    if (!agency.mobile_money_number || !agency.mobile_money_provider) {
      return new Response(
        JSON.stringify({ error: "L'agence n'a pas configuré de numéro Mobile Money pour recevoir les paiements" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get FedaPay credentials
    const fedapaySecretKey = Deno.env.get("FEDAPAY_SECRET_KEY");
    if (!fedapaySecretKey) {
      return new Response(
        JSON.stringify({ error: "Configuration FedaPay manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSandbox = fedapaySecretKey.startsWith("sk_sandbox_");
    const fedapayBaseUrl = isSandbox 
      ? "https://sandbox-api.fedapay.com/v1" 
      : "https://api.fedapay.com/v1";

    // Format phone number
    const formatIvorianPhone = (phone: string): string => {
      let digits = phone.replace(/\D/g, "");
      if (digits.startsWith("225")) {
        digits = digits.slice(3);
      }
      if (digits.length === 9 && !digits.startsWith("0")) {
        digits = `0${digits}`;
      }
      const isNewFormat = digits.length === 10 && digits.startsWith("0");
      const isLegacyFormat = digits.length === 8;
      if (!isNewFormat && !isLegacyFormat) {
        return "";
      }
      return `+225${digits}`;
    };

    const formattedCustomerPhone = formatIvorianPhone(customer_phone);
    if (!formattedCustomerPhone) {
      return new Response(
        JSON.stringify({ error: "Numéro de téléphone du locataire invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format agency's mobile money number
    const formattedAgencyPhone = formatIvorianPhone(agency.mobile_money_number);
    if (!formattedAgencyPhone) {
      return new Response(
        JSON.stringify({ error: "Le numéro Mobile Money de l'agence est invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantData = payment.tenant as any;
    const propertyTitle = tenantData?.property?.title || "Bien";
    const dueDate = new Date(payment.due_date);
    const month = dueDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    // Use the agency's configured mobile money provider
    const agencyProviderMode = fedapayModeByPaymentMethod[agency.mobile_money_provider as keyof typeof fedapayModeByPaymentMethod];
    // Use the customer's selected payment method for their side
    const customerPaymentMode = fedapayModeByPaymentMethod[payment_method];

    const fedapayPayload = {
      description: `Loyer ${month} - ${propertyTitle} - Paiement à ${agency.name}`,
      amount: Math.round(Number(payment.amount)),
      currency: { iso: "XOF" },
      callback_url: `${supabaseUrl}/functions/v1/tenant-pay-rent-webhook`,
      mode: customerPaymentMode,
      customer: {
        firstname: tenant.name.split(" ")[0] || tenant.name,
        lastname: tenant.name.split(" ").slice(1).join(" ") || "",
        email: tenant.email || "",
        phone_number: {
          number: formattedCustomerPhone,
          country: "CI",
        },
      },
      metadata: {
        payment_id: payment.id,
        tenant_id: tenant.id,
        agency_id: agency.id,
        agency_phone: formattedAgencyPhone,
        agency_provider: agency.mobile_money_provider,
        type: "rent_payment",
      },
    };

    console.log("FedaPay rent payment request:", JSON.stringify({
      ...fedapayPayload,
      environment: isSandbox ? "sandbox" : "production",
    }));

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
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fedapayTransaction = fedapayData["v1/transaction"];
    if (!fedapayTransaction) {
      return new Response(
        JSON.stringify({ error: "Réponse FedaPay inattendue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentUrl = fedapayTransaction.payment_url;
    
    if (!paymentUrl) {
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
          payment_id: payment.id,
          fedapay_transaction_id: fedapayTransaction.id,
          payment_url: tokenData.url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        fedapay_transaction_id: fedapayTransaction.id,
        payment_url: paymentUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Tenant pay rent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
