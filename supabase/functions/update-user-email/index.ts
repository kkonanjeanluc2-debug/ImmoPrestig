import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, newEmail, newPassword } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newEmail && !newPassword) {
      return new Response(
        JSON.stringify({ error: "newEmail ou newPassword est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is admin of the same agency as the target user
    const { data: callerMembership } = await supabaseAdmin
      .from("agency_members")
      .select("agency_id, role")
      .eq("user_id", caller.id)
      .eq("status", "active")
      .maybeSingle();

    // Also check if caller is agency owner
    const { data: callerAgency } = await supabaseAdmin
      .from("agencies")
      .select("id")
      .eq("user_id", caller.id)
      .maybeSingle();

    const callerAgencyId = callerMembership?.agency_id || callerAgency?.id;
    const isAdmin = callerMembership?.role === "admin" || !!callerAgency;

    if (!isAdmin || !callerAgencyId) {
      return new Response(
        JSON.stringify({ error: "Vous n'avez pas les droits pour cette action" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target user belongs to same agency
    const { data: targetMembership } = await supabaseAdmin
      .from("agency_members")
      .select("agency_id")
      .eq("user_id", userId)
      .eq("agency_id", callerAgencyId)
      .maybeSingle();

    if (!targetMembership) {
      return new Response(
        JSON.stringify({ error: "Ce membre n'appartient pas à votre agence" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (newEmail) {
      updatePayload.email = newEmail;
      updatePayload.email_confirm = true;
    }
    if (newPassword) {
      updatePayload.password = newPassword;
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

    if (error) {
      console.error("Error updating user:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also update profile email if changed
    if (newEmail) {
      await supabaseAdmin
        .from("profiles")
        .update({ email: newEmail })
        .eq("user_id", userId);
    }

    console.log("User credentials updated successfully for:", userId);

    return new Response(
      JSON.stringify({ success: true, email: data.user?.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
