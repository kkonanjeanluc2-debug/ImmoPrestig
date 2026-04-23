import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";
import { corsHeaders } from "../_shared/auth.ts";

const SlugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Slug requis")
    .max(120, "Slug trop long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide"),
});

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
    const parsed = SlugSchema.safeParse(await req.json());

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { slug } = parsed.data;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data, error } = await supabaseAdmin
      .from("agencies")
      .select("id, name, slug, logo_url, login_image_url")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return new Response(JSON.stringify({ branding: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        branding: {
          agency_id: data.id,
          agency_name: data.name,
          slug: data.slug,
          logo_url: data.logo_url,
          login_image_url: data.login_image_url,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("get-agency-login-branding error:", error);

    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});