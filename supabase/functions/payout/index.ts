import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface PayoutRequest {
  amount: number;
  phoneNumber: string;
  reason: string;
}

/**
 * IMPORTANT: KKiaPay does NOT provide a direct payout/disbursement API for merchants.
 * Payouts can only be done via:
 * 1. KKiaPay Dashboard ("Request an instant payment" button)
 * 2. Automatic scheduled payouts (period/level based)
 * 
 * This endpoint records the payout request for manual processing via the dashboard.
 */

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

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's agency
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("id")
      .eq("user_id", userId)
      .single();

    let agencyId = agency?.id;

    if (!agencyId) {
      // Try to find agency via agency_members
      const { data: member } = await supabaseAdmin
        .from("agency_members")
        .select("agency_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      
      agencyId = member?.agency_id;
    }

    // Format phone number (add country code if needed)
    const formatPhoneNumber = (phone: string): string => {
      let cleaned = phone.replace(/[\s\-\(\)]/g, "");
      if (cleaned.startsWith("0")) {
        cleaned = "225" + cleaned.substring(1);
      } else if (!cleaned.startsWith("225") && !cleaned.startsWith("+225")) {
        cleaned = "225" + cleaned;
      }
      cleaned = cleaned.replace(/^\+/, "");
      return cleaned;
    };

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Create payout record in database with "processing" status
    // This will be processed manually via KKiaPay Dashboard
    const { data: payout, error: insertError } = await supabaseAdmin
      .from("payouts")
      .insert({
        user_id: userId,
        agency_id: agencyId,
        amount: amount,
        phone_number: formattedPhone,
        reason: reason,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Payout] Error inserting payout record:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la création de la demande." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Payout] Payout request recorded: ${amount} FCFA to ${formattedPhone} - Reason: ${reason}`);

    // Create notification for user
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Demande de reversement enregistrée",
      message: `Votre demande de reversement de ${amount.toLocaleString("fr-FR")} F CFA vers ${phoneNumber} a été enregistrée. Le transfert sera effectué via le tableau de bord KKiaPay.`,
      type: "info",
      entity_type: "payout",
      entity_id: payout.id,
    });

    // Note: KKiaPay does not provide a direct payout API for merchants
    // The payout must be processed manually via the KKiaPay dashboard
    // or through their scheduled payout system

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          payoutId: payout.id,
          amount: amount,
          phoneNumber: formattedPhone,
          reason: reason,
          status: "processing",
          message: "Demande enregistrée. Le reversement sera traité via le tableau de bord KKiaPay.",
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
