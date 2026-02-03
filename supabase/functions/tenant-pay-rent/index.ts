import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fedapaySecretKey = Deno.env.get("FEDAPAY_SECRET_KEY");

    if (!fedapaySecretKey) {
      throw new Error("FedaPay secret key not configured");
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Get user from token
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { payment_id, payment_mode } = await req.json();

    if (!payment_id) {
      throw new Error("Payment ID is required");
    }

    // Verify this payment belongs to the tenant
    const { data: tenant, error: tenantError } = await supabaseClient
      .from("tenants")
      .select("id, name, email, phone, property:properties(title)")
      .eq("portal_user_id", user.id)
      .eq("has_portal_access", true)
      .single();

    if (tenantError || !tenant) {
      throw new Error("Tenant not found or access denied");
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select("id, amount, due_date, status, tenant_id")
      .eq("id", payment_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment not found or access denied");
    }

    if (payment.status === "paid") {
      throw new Error("This payment has already been paid");
    }

    // Determine FedaPay mode
    const fedapayMode = payment_mode || "orange_ci";

    // Get callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/tenant-pay-rent-webhook`;

    // Create FedaPay transaction
    const fedapayResponse = await fetch("https://api.fedapay.com/v1/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${fedapaySecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: `Paiement loyer - ${(tenant.property as any)?.title || "Bien"}`,
        amount: Number(payment.amount),
        currency: { iso: "XOF" },
        callback_url: callbackUrl,
        customer: {
          firstname: tenant.name.split(" ")[0] || tenant.name,
          lastname: tenant.name.split(" ").slice(1).join(" ") || "",
          email: tenant.email || "noemail@tenant.local",
          phone_number: {
            number: tenant.phone?.replace(/\s/g, "").replace("+225", "") || "0000000000",
            country: "CI",
          },
        },
        metadata: {
          payment_id: payment.id,
          tenant_id: tenant.id,
          type: "tenant_rent_payment",
        },
      }),
    });

    if (!fedapayResponse.ok) {
      const errorData = await fedapayResponse.json();
      console.error("FedaPay error:", errorData);
      throw new Error("Failed to create FedaPay transaction");
    }

    const fedapayData = await fedapayResponse.json();
    const transactionId = fedapayData.v1?.transaction?.id;

    if (!transactionId) {
      throw new Error("Failed to get transaction ID from FedaPay");
    }

    // Generate payment token for the transaction
    const tokenResponse = await fetch(
      `https://api.fedapay.com/v1/transactions/${transactionId}/token`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${fedapaySecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: fedapayMode }),
      }
    );

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json();
      console.error("FedaPay token error:", tokenError);
      throw new Error("Failed to generate payment token");
    }

    const tokenData = await tokenResponse.json();
    const checkoutUrl = tokenData.url;

    if (!checkoutUrl) {
      throw new Error("Failed to get checkout URL");
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        transaction_id: transactionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in tenant-pay-rent:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
