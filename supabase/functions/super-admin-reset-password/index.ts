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

    // Verify caller is super_admin
    const { data: isSuperAdmin, error: roleError } = await supabaseAdmin.rpc("is_super_admin", {
      _user_id: caller.id,
    });

    if (roleError || !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès réservé au Super Administrateur" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, newPassword } = await req.json();

    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "userId est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Le mot de passe doit contenir au moins 8 caractères" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target user owns an agency (or is a proprietaire)
    const { data: targetAgency, error: targetAgencyError } = await supabaseAdmin
      .from("agencies")
      .select("id, name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (targetAgencyError) {
      throw targetAgencyError;
    }

    if (!targetAgency) {
      return new Response(
        JSON.stringify({ error: "Aucune agence trouvée pour cet utilisateur" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Error resetting password:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action
    await supabaseAdmin.from("activity_logs").insert({
      user_id: caller.id,
      action_type: "super_admin_reset_password",
      entity_type: "agencies",
      entity_id: targetAgency.id,
      entity_name: targetAgency.name,
      details: {
        target_user_id: userId,
        target_email: data.user?.email,
      },
    });

    console.log("Password reset successfully for agency owner:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        email: data.user?.email,
        agencyName: targetAgency.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne du serveur";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
