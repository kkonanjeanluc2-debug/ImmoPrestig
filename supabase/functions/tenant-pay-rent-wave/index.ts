import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayRentWaveRequest {
  payment_id: string;
  customer_phone: string;
  return_url?: string;
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

    const body: PayRentWaveRequest = await req.json();
    const { payment_id, customer_phone, return_url } = body;

    if (!payment_id || !customer_phone) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: payment_id, customer_phone requis" }),
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

    // Get agency info for the payment owner
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

    // Get Wave API key
    const waveApiKey = Deno.env.get("WAVE_API_KEY");
    if (!waveApiKey) {
      return new Response(
        JSON.stringify({ error: "Configuration Wave CI manquante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check Wave provider config for sandbox mode
    const { data: waveConfig } = await supabase
      .from("payment_provider_configs")
      .select("*")
      .eq("provider_name", "wave_ci")
      .single();

    const isSandbox = waveConfig?.is_sandbox ?? true;
    const waveBaseUrl = "https://api.wave.com/v1";

    // Format phone number for Wave CI (+225)
    const formatWavePhone = (phone: string): string => {
      if (!phone) return "";
      let digits = phone.replace(/\D/g, "");
      if (digits.startsWith("225")) {
        digits = digits.slice(3);
      }
      if (digits.length === 9 && !digits.startsWith("0")) {
        digits = `0${digits}`;
      }
      return `+225${digits}`;
    };

    const formattedCustomerPhone = formatWavePhone(customer_phone);
    const formattedAgencyPhone = formatWavePhone(agency.mobile_money_number);

    if (!formattedCustomerPhone || formattedCustomerPhone.length < 13) {
      return new Response(
        JSON.stringify({ error: "Numéro de téléphone du locataire invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantData = payment.tenant as any;
    const propertyTitle = tenantData?.property?.title || "Bien";
    const dueDate = new Date(payment.due_date);
    const month = dueDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    // Create Wave checkout session
    const wavePayload = {
      amount: Math.round(Number(payment.amount)).toString(),
      currency: "XOF",
      error_url: return_url || `${supabaseUrl}/functions/v1/tenant-pay-rent-wave-webhook?status=error&payment_id=${payment.id}`,
      success_url: return_url || `${supabaseUrl}/functions/v1/tenant-pay-rent-wave-webhook?status=success&payment_id=${payment.id}`,
      client_reference: `rent_${payment.id}`,
      // Optionally restrict to specific phone
      // restrict_payer_mobile: formattedCustomerPhone,
    };

    console.log("Wave rent payment request:", JSON.stringify({
      ...wavePayload,
      tenant_id: tenant.id,
      agency_id: agency.id,
      agency_phone: formattedAgencyPhone,
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
      return new Response(
        JSON.stringify({ error: `Erreur Wave: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        payment_id: payment.id,
        wave_session_id: waveData.id,
        payment_url: paymentUrl,
        provider: "wave_ci",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Tenant pay rent Wave error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur serveur";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
