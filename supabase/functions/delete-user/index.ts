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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is super_admin OR agency owner/admin deleting a team member
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const isSuperAdmin = callerRole?.role === "super_admin";

    if (!isSuperAdmin) {
      // Check if caller is agency owner and target is their team member
      const { data: callerAgency } = await supabaseAdmin
        .from("agencies")
        .select("id")
        .eq("user_id", caller.id)
        .maybeSingle();

      if (!callerAgency) {
        // Check if caller is admin member
        const { data: callerMembership } = await supabaseAdmin
          .from("agency_members")
          .select("agency_id, role")
          .eq("user_id", caller.id)
          .eq("role", "admin")
          .eq("status", "active")
          .maybeSingle();

        if (!callerMembership) {
          return new Response(
            JSON.stringify({ error: "Vous n'avez pas les droits pour cette action" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify target belongs to same agency
        const { data: targetMember } = await supabaseAdmin
          .from("agency_members")
          .select("id")
          .eq("user_id", userId)
          .eq("agency_id", callerMembership.agency_id)
          .maybeSingle();

        if (!targetMember) {
          return new Response(
            JSON.stringify({ error: "Ce membre n'appartient pas à votre agence" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Verify target is a member of caller's agency
        const { data: targetMember } = await supabaseAdmin
          .from("agency_members")
          .select("id")
          .eq("user_id", userId)
          .eq("agency_id", callerAgency.id)
          .maybeSingle();

        if (!targetMember) {
          return new Response(
            JSON.stringify({ error: "Ce membre n'appartient pas à votre agence" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Delete user from auth (this cascades and removes profile, roles, etc.)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User deleted successfully:", userId);

    return new Response(
      JSON.stringify({ success: true }),
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
