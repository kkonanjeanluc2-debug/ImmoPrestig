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

    // Get payment details
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("*, tenants(name, email, phone), properties(title)")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
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

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "GeniusPay not configured for this agency" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payAmount = amount || (payment.amount - (payment.paid_amount || 0));
    const tenant = payment.tenants as any;
    const property = payment.properties as any;

    const dueMonth = new Date(payment.due_date).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    // Create GeniusPay checkout (redirect mode - no payment_method specified)
    const appUrl = Deno.env.get("VITE_APP_URL") || "https://property-grace.lovable.app";

    const geniusPayResponse = await fetch("https://pay.genius.ci/api/v1/merchant/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: Math.round(payAmount),
        currency: "XOF",
        description: `Loyer ${dueMonth} - ${property?.title || ""}`,
        customer: {
          email: tenant?.email || "",
          name: tenant?.name || "",
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

    const geniusPayData = await geniusPayResponse.json();

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
