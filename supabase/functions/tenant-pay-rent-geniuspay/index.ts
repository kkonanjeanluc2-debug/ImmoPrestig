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

    const { payment_id, customer_phone, amount } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: "payment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get payment details with tenant and property info via contract
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("*, tenants(name, email, phone), contracts(properties(title))")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      console.error("Payment lookup error:", paymentError?.message, "for id:", payment_id);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agency GeniusPay config
    const { data: agency } = await adminClient
      .from("agencies")
      .select("geniuspay_public_key, geniuspay_secret_key, geniuspay_sandbox")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    // Use agency keys if configured, otherwise fall back to platform keys
    const secretKey = agency?.geniuspay_secret_key || Deno.env.get("GENIUSPAY_SECRET_KEY");
    const publicKey = agency?.geniuspay_public_key || Deno.env.get("GENIUSPAY_PUBLIC_KEY");
    const isSandbox = agency?.geniuspay_sandbox ?? false;

    if (!secretKey || !publicKey) {
      return new Response(
        JSON.stringify({ error: "GeniusPay not configured for this agency" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = isSandbox
      ? "https://sandbox.pay.genius.ci/api/v1/merchant/payments"
      : "https://pay.genius.ci/api/v1/merchant/payments";

    const payAmount = amount || (payment.amount - (payment.paid_amount || 0));
    const tenant = payment.tenants as any;
    const contract = payment.contracts as any;
    const property = contract?.properties as any;

    const dueMonth = new Date(payment.due_date).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    // Create GeniusPay checkout (redirect mode - no payment_method specified)
    const appUrl = Deno.env.get("VITE_APP_URL") || "https://property-grace.lovable.app";

    console.log(`Creating GeniusPay payment: amount=${Math.round(payAmount)}, sandbox=${isSandbox}`);

    const geniusPayResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": publicKey,
        "X-API-Secret": secretKey,
      },
      body: JSON.stringify({
        amount: Math.round(payAmount),
        description: `Loyer ${dueMonth} - ${property?.title || ""}`,
        customer: {
          email: tenant?.email || undefined,
          name: tenant?.name || undefined,
          phone: customer_phone || tenant?.phone || "",
        },
        metadata: {
          payment_id: payment_id,
          tenant_id: payment.tenant_id,
          user_id: payment.user_id,
          type: "rent",
        },
        success_url: `${appUrl}/sign-contract?payment=success`,
        cancel_url: `${appUrl}/sign-contract?payment=cancelled`,
      }),
    });

    const responseText = await geniusPayResponse.text();
    console.log(`GeniusPay response status: ${geniusPayResponse.status}, body preview: ${responseText.substring(0, 300)}`);

    let geniusPayData: any;
    try {
      geniusPayData = JSON.parse(responseText);
    } catch {
      console.error("GeniusPay returned non-JSON response:", responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Réponse invalide du service de paiement. Vérifiez vos clés API GeniusPay." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!geniusPayResponse.ok || !geniusPayData.checkout_url) {
      console.error("GeniusPay rent checkout error:", geniusPayData);
      return new Response(
        JSON.stringify({ error: geniusPayData.message || "Erreur lors de la création du paiement" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`GeniusPay rent checkout created for payment ${payment_id}, reference: ${geniusPayData.reference || geniusPayData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: geniusPayData.checkout_url,
        reference: geniusPayData.reference || geniusPayData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in tenant-pay-rent-geniuspay:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
