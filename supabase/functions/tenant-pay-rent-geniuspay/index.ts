import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return unauthorizedResponse(auth.error);
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

    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id")
      .eq("portal_user_id", auth.userId)
      .eq("has_portal_access", true)
      .is("deleted_at", null)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Accès portail non autorisé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment details with tenant and property info via contract
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("*, tenants(name, email, phone), contracts(properties(title))")
      .eq("id", payment_id)
      .eq("tenant_id", tenant.id)
      .single();

    if (paymentError || !payment) {
      console.error("Payment lookup error:", paymentError?.message, "for id:", payment_id);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve the agency-owner user_id (so we can fetch encrypted credentials from Vault)
    let ownerUserId: string | null = null;
    let agency: { geniuspay_public_key: string | null; geniuspay_sandbox: boolean | null } | null = null;

    const { data: ownedAgency } = await adminClient
      .from("agencies")
      .select("user_id, geniuspay_public_key, geniuspay_sandbox")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    if (ownedAgency) {
      ownerUserId = ownedAgency.user_id;
      agency = ownedAgency;
    } else {
      // Payment created by team member - find agency via membership
      const { data: membership } = await adminClient
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", payment.user_id)
        .eq("status", "active")
        .maybeSingle();

      if (membership) {
        const { data: memberAgency } = await adminClient
          .from("agencies")
          .select("user_id, geniuspay_public_key, geniuspay_sandbox")
          .eq("id", membership.agency_id)
          .maybeSingle();
        if (memberAgency) {
          ownerUserId = memberAgency.user_id;
          agency = memberAgency;
        }
      }
    }

    // Fetch the encrypted secret key from Vault via security-definer RPC
    let agencySecretKey: string | null = null;
    if (ownerUserId) {
      const { data: vaultSecret } = await adminClient.rpc(
        "get_agency_payment_secret_by_owner",
        { _owner_user_id: ownerUserId, _field: "geniuspay_secret_key" },
      );
      agencySecretKey = (vaultSecret as string | null) || null;
    }

    // Use agency keys if configured, otherwise fall back to platform keys
    const secretKey = agencySecretKey || Deno.env.get("GENIUSPAY_SECRET_KEY");
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

    const remainingAmount = Number(payment.amount) - Number(payment.paid_amount || 0);
    const requestedAmount = Number(amount || 0);
    const payAmount = requestedAmount > 0 ? requestedAmount : remainingAmount;

    if (payAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Montant invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payAmount > remainingAmount) {
      return new Response(
        JSON.stringify({ error: "Le montant dépasse le reste à payer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GeniusPay requires a minimum amount of 200 FCFA
    if (payAmount < 200) {
      return new Response(
        JSON.stringify({ error: "Le montant minimum pour un paiement GeniusPay est de 200 F CFA" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const tenant = payment.tenants as any;
    const contract = payment.contracts as any;
    const property = contract?.properties as any;

    const dueMonth = new Date(payment.due_date).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    // Create GeniusPay checkout (redirect mode - no payment_method specified)
    // Use the actual custom domain for redirects
    const appUrl = "https://immoprestigeci.com";

    console.log(`Creating GeniusPay payment: amount=${Math.round(payAmount)}, sandbox=${isSandbox}`);

    const requestBody = {
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
      success_url: `${appUrl}/payments?payment=success`,
      error_url: `${appUrl}/payments?payment=cancelled`,
    };

    console.log(`GeniusPay request URL: ${baseUrl}`);
    console.log(`GeniusPay request body:`, JSON.stringify(requestBody));

    const geniusPayResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": publicKey,
        "X-API-Secret": secretKey,
      },
      body: JSON.stringify(requestBody),
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

    // GeniusPay wraps response in data: { checkout_url, reference, ... }
    const paymentData = geniusPayData.data || geniusPayData;
    const checkoutUrl = paymentData.checkout_url;

    if (!geniusPayResponse.ok || !checkoutUrl) {
      console.error("GeniusPay rent checkout error:", JSON.stringify(geniusPayData));
      // Extract readable error from validation errors
      let errorMsg = geniusPayData.message || paymentData.message || "Erreur lors de la création du paiement";
      if (geniusPayData.error?.errors) {
        const fieldErrors = Object.entries(geniusPayData.error.errors)
          .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
          .join("; ");
        errorMsg = `Erreur de validation: ${fieldErrors}`;
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`GeniusPay rent checkout created for payment ${payment_id}, reference: ${paymentData.reference || paymentData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: checkoutUrl,
        reference: paymentData.reference || paymentData.id,
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
