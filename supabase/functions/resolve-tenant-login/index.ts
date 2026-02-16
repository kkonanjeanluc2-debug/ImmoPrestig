import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";

/**
 * Resolves a phone number to the actual auth email for tenant portal login.
 * When a tenant has both email and phone, the portal account uses the email,
 * but we want them to be able to log in with their phone number too.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Numéro de téléphone requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleaned = phone.replace(/[^0-9+]/g, "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find tenant by phone number that has portal access
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("email, phone, portal_user_id")
      .eq("has_portal_access", true)
      .is("deleted_at", null)
      .or(`phone.eq.${cleaned},phone.eq.${phone}`)
      .not("portal_user_id", "is", null)
      .maybeSingle();

    if (error || !tenant || !tenant.portal_user_id) {
      // No tenant found - return the pseudo-email format as fallback
      return new Response(
        JSON.stringify({ auth_email: `phone_${cleaned}@tenant.immoprestige.local` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the actual auth email from the user account
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(tenant.portal_user_id);

    if (authUser?.user?.email) {
      return new Response(
        JSON.stringify({ auth_email: authUser.user.email }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to pseudo-email
    return new Response(
      JSON.stringify({ auth_email: `phone_${cleaned}@tenant.immoprestige.local` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
