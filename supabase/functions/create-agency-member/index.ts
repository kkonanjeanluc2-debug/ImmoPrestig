import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  agency_id: string;
  email: string;
  full_name: string;
  password: string;
  role: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateMemberRequest = await req.json();
    const { agency_id, email, full_name, password, role } = body;

    console.log("Creating member for agency:", agency_id, "by user:", callingUser.id);

    // Verify the calling user owns this agency
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .select("id, user_id, name")
      .eq("id", agency_id)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: "Agence non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (agency.user_id !== callingUser.id) {
      // Check if calling user is a super_admin
      const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { _user_id: callingUser.id });
      
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Vous n'êtes pas autorisé à ajouter des membres à cette agence" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check subscription limits
    const { data: canAdd } = await supabaseAdmin.rpc("can_agency_add_member", { p_agency_id: agency_id });
    
    if (!canAdd) {
      return new Response(
        JSON.stringify({ error: "Limite d'utilisateurs atteinte pour votre forfait. Veuillez mettre à niveau." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", email.toLowerCase());

    let userId: string;

    if (existingUsers && existingUsers.length > 0) {
      // User exists, check if already a member
      userId = existingUsers[0].user_id;
      
      const { data: existingMember } = await supabaseAdmin
        .from("agency_members")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "Cet utilisateur est déjà membre de votre agence" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: `Erreur lors de la création: ${createError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("Created new user:", userId);
    }

    // Add user to agency_members
    const { error: memberError } = await supabaseAdmin
      .from("agency_members")
      .insert({
        agency_id,
        user_id: userId,
        role,
        invited_by: callingUser.id,
        status: "active",
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de l'ajout du membre: ${memberError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also add/update user_roles for RBAC
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role,
      }, { onConflict: "user_id" });

    if (roleError) {
      console.error("Error setting user role:", roleError);
    }

    console.log("Member added successfully:", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        message: "Membre ajouté avec succès" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
