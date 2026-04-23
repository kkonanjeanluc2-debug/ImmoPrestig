import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";
import { corsHeaders } from "../_shared/auth.ts";

const BodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug requis")
    .max(120, "Slug trop long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide"),
  loginEmail: z.string().trim().email("Email invalide"),
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function addEmailToSet(store: Set<string>, value: string | null | undefined) {
  if (!value) return;
  store.add(normalizeEmail(value));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { slug, loginEmail } = parsed.data;
    const normalizedEmail = normalizeEmail(loginEmail);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .select("id, user_id, email")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (agencyError) {
      throw agencyError;
    }

    if (!agency) {
      return new Response(
        JSON.stringify({ allowed: false, code: "agency_not_found", message: "Agence introuvable ou inactive." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from("agency_members")
      .select("user_id")
      .eq("agency_id", agency.id)
      .eq("status", "active");

    if (membersError) {
      throw membersError;
    }

    const memberIds = members?.map((member) => member.user_id) ?? [];
    const allowedUserIds = Array.from(new Set([agency.user_id, ...memberIds]));
    const allowedIdentifiers = new Set<string>();

    addEmailToSet(allowedIdentifiers, agency.email);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("email, user_id")
      .in("user_id", allowedUserIds);

    if (profilesError) {
      throw profilesError;
    }

    profiles?.forEach((profile) => addEmailToSet(allowedIdentifiers, profile.email));

    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from("tenants")
      .select("email, portal_user_id")
      .in("user_id", allowedUserIds)
      .eq("has_portal_access", true)
      .is("deleted_at", null);

    if (tenantsError) {
      throw tenantsError;
    }

    tenants?.forEach((tenant) => addEmailToSet(allowedIdentifiers, tenant.email));

    const authUserIds = Array.from(
      new Set([
        ...allowedUserIds,
        ...(tenants?.map((tenant) => tenant.portal_user_id).filter((id): id is string => Boolean(id)) ?? []),
      ]),
    );

    const authUsers = await Promise.all(
      authUserIds.map(async (userId) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
        return data.user?.email ?? null;
      }),
    );

    authUsers.forEach((email) => addEmailToSet(allowedIdentifiers, email));

    const isAllowed = allowedIdentifiers.has(normalizedEmail);

    return new Response(
      JSON.stringify({
        allowed: isAllowed,
        code: isAllowed ? "allowed" : "not_agency_member",
        message: isAllowed
          ? undefined
          : "Ces identifiants n'appartiennent pas à l'équipe de cette agence.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("verify-agency-login-access error:", error);

    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});