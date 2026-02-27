import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mutation_id, current_docs } = await req.json();

    // Fetch mutation with related data
    const { data: mutation, error: fetchError } = await supabase
      .from("mutations_achats")
      .select("*, biens_achat(title, address, city, price)")
      .eq("id", mutation_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !mutation) {
      return new Response(JSON.stringify({ error: "Dossier introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!mutation.notaire_email) {
      return new Response(JSON.stringify({ error: "Email du notaire non renseigné" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agency info for sender
    const { data: agency } = await supabase
      .from("agencies")
      .select("name, email, phone")
      .eq("user_id", user.id)
      .single();

    const docs = [
      { key: "titre_propriete", label: "Titre de propriété (ACD, CMPF, certificat)" },
      { key: "pieces_identite", label: "Pièces d'identité des parties" },
      { key: "certificat_localisation", label: "Certificat de localisation" },
      { key: "etat_foncier", label: "État foncier" },
      { key: "situation_fiscale", label: "Situation fiscale du bien" },
      { key: "quittances_paiement", label: "Quittances de paiement" },
    ];

    const bienTitle = mutation.biens_achat?.title || "Bien";
    const bienAddress = mutation.biens_achat?.address || "";

    const docsHtml = docs.map((d) => {
      const checked = current_docs ? current_docs[d.key] : mutation[d.key];
      const icon = checked ? "✅" : "❌";
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${icon}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${d.label}</td></tr>`;
    }).join("");

    const missing = docs.filter((d) => !(current_docs ? current_docs[d.key] : mutation[d.key]));

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1a365d;padding:24px;text-align:center;color:#ffffff;">
    <h1 style="margin:0;font-size:20px;">Checklist des pièces — Dossier de mutation</h1>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="margin:0 0 8px;font-size:14px;color:#333;">Cher(e) <strong>${mutation.notaire_name || "Maître"}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555;">Veuillez trouver ci-dessous l'état des pièces nécessaires pour le dossier de mutation du bien :</p>
    <p style="margin:0 0 16px;font-size:14px;"><strong>${bienTitle}</strong>${bienAddress ? ` — ${bienAddress}` : ""}</p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
      <tr style="background:#f7fafc;"><th style="padding:8px 12px;text-align:left;font-size:13px;">État</th><th style="padding:8px 12px;text-align:left;font-size:13px;">Document</th></tr>
      ${docsHtml}
    </table>

    ${missing.length > 0 ? `
    <div style="margin-top:16px;padding:12px;background:#fff5f5;border-left:4px solid #e53e3e;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#c53030;font-weight:bold;">Documents manquants (${missing.length}) :</p>
      <ul style="margin:8px 0 0;padding-left:20px;">${missing.map((m) => `<li style="font-size:13px;color:#742a2a;">${m.label}</li>`).join("")}</ul>
    </div>
    ` : `
    <div style="margin-top:16px;padding:12px;background:#f0fff4;border-left:4px solid #38a169;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#276749;font-weight:bold;">✅ Tous les documents sont fournis.</p>
    </div>
    `}
    
    <p style="margin:24px 0 0;font-size:13px;color:#718096;">Cordialement,<br/>${agency?.name || "L'agence"}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    const result = await sendEmail({
      from: `noreply@immoprestigeci.com`,
      to: [mutation.notaire_email],
      subject: `Checklist des pièces — ${bienTitle}`,
      html,
      replyTo: agency?.email || undefined,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
