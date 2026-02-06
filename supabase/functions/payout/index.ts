import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface PayoutRequest {
  amount: number;
  phoneNumber: string;
  reason: string;
}

interface KkiapayPayoutResponse {
  status?: string;
  transactionId?: string;
  message?: string;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      return unauthorizedResponse(authResult.error);
    }

    const userId = authResult.userId!;

    // Parse request body
    const body: PayoutRequest = await req.json();
    const { amount, phoneNumber, reason } = body;

    // Validate required parameters
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Montant invalide. Le montant doit être un nombre positif." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, error: "Numéro de téléphone requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, error: "Motif du reversement requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get KKiaPay API credentials
    const privateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
    const publicKey = Deno.env.get("KKIAPAY_PUBLIC_KEY");
    const secretKey = Deno.env.get("KKIAPAY_SECRET");

    if (!privateKey || !publicKey || !secretKey) {
      console.error("KKiaPay API keys not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Configuration KKiaPay manquante. Contactez l'administrateur." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's agency
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (agencyError) {
      // Try to find agency via agency_members
      const { data: member } = await supabaseAdmin
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      
      if (!member) {
        return new Response(
          JSON.stringify({ success: false, error: "Agence non trouvée." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const agencyId = agency?.id;

    // Format phone number (add country code if needed)
    const formatPhoneNumber = (phone: string): string => {
      let cleaned = phone.replace(/[\s\-\(\)]/g, "");
      // Remove leading zeros and add country code for Ivory Coast
      if (cleaned.startsWith("0")) {
        cleaned = "225" + cleaned.substring(1);
      } else if (!cleaned.startsWith("225") && !cleaned.startsWith("+225")) {
        cleaned = "225" + cleaned;
      }
      // Remove + prefix if present
      cleaned = cleaned.replace(/^\+/, "");
      return cleaned;
    };

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Create payout record in database (pending status)
    const { data: payout, error: insertError } = await supabaseAdmin
      .from("payouts")
      .insert({
        user_id: userId,
        agency_id: agencyId,
        amount: amount,
        phone_number: formattedPhone,
        reason: reason,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting payout record:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la création de la demande." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Payout] Initiating payout: ${amount} FCFA to ${formattedPhone} - Reason: ${reason}`);

    // Call KKiaPay payout API
    // Based on documentation: https://docs.kkiapay.me
    const kkiapayResponse = await fetch("https://api.kkiapay.me/api/v1/payments/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PRIVATE-KEY": privateKey,
        "X-PUBLIC-KEY": publicKey,
        "X-SECRET-KEY": secretKey,
      },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        amount: amount,
        reason: reason,
        type: "payout",
      }),
    });

    const kkiapayData: KkiapayPayoutResponse = await kkiapayResponse.json();

    console.log(`[Payout] KKiaPay response:`, JSON.stringify(kkiapayData));

    if (!kkiapayResponse.ok) {
      // Update payout record with error
      await supabaseAdmin
        .from("payouts")
        .update({
          status: "failed",
          error_message: kkiapayData.message || `Erreur HTTP ${kkiapayResponse.status}`,
          kkiapay_response: kkiapayData,
        })
        .eq("id", payout.id);

      console.error(`[Payout] KKiaPay API error: ${kkiapayResponse.status}`, kkiapayData);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: kkiapayData.message || "Erreur lors de la communication avec KKiaPay.",
          details: kkiapayData
        }),
        { status: kkiapayResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payout record with success
    await supabaseAdmin
      .from("payouts")
      .update({
        status: "completed",
        kkiapay_transaction_id: kkiapayData.transactionId || null,
        kkiapay_response: kkiapayData,
        completed_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    // Create notification for user
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Reversement effectué",
      message: `Reversement de ${amount.toLocaleString("fr-FR")} F CFA vers ${phoneNumber} effectué avec succès.`,
      type: "success",
      entity_type: "payout",
      entity_id: payout.id,
    });

    console.log(`[Payout] Payout successful: ${payout.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          payoutId: payout.id,
          amount: amount,
          phoneNumber: formattedPhone,
          reason: reason,
          status: "completed",
          transactionId: kkiapayData.transactionId,
          kkiapayResponse: kkiapayData,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Payout] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erreur inattendue lors du reversement." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
