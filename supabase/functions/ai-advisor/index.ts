import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth token
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context } = await req.json();

    // Fetch contextual data based on context type
    let contextData = "";

    if (context === "unpaid" || context === "all") {
      const { data: unpaidCases } = await supabase
        .from("unpaid_cases")
        .select("*, tenant:tenants(name, phone, email), property:properties(title, address)")
        .eq("user_id", user.id)
        .neq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(20);

      if (unpaidCases?.length) {
        contextData += `\n\n--- DOSSIERS D'IMPAYÉS ACTIFS (${unpaidCases.length}) ---\n`;
        for (const c of unpaidCases) {
          contextData += `- Locataire: ${c.tenant?.name || "?"}, Montant: ${c.amount_due} FCFA, Retard: ${c.days_late} jours, Statut: ${c.status}, Bien: ${c.property?.title || c.tenant?.property?.title || "?"}\n`;
        }
      } else {
        contextData += "\n\nAucun dossier d'impayé actif.\n";
      }
    }

    if (context === "sales" || context === "all") {
      const { data: sales } = await supabase
        .from("ventes_immobilieres")
        .select("*, bien:biens_vente(title, price, status), acquereur:acquereurs(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (sales?.length) {
        contextData += `\n\n--- VENTES IMMOBILIÈRES RÉCENTES (${sales.length}) ---\n`;
        for (const s of sales) {
          contextData += `- Bien: ${s.bien?.title || "?"}, Prix: ${s.sale_price} FCFA, Acquéreur: ${s.acquereur?.name || "?"}, Type paiement: ${s.payment_type}\n`;
        }
      }

      const { data: echeancesVentes } = await supabase
        .from("echeances_ventes")
        .select("*, vente:ventes_immobilieres(bien:biens_vente(title), acquereur:acquereurs(name))")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(15);

      if (echeancesVentes?.length) {
        contextData += `\n--- ÉCHÉANCES VENTES EN ATTENTE (${echeancesVentes.length}) ---\n`;
        for (const e of echeancesVentes) {
          contextData += `- Bien: ${e.vente?.bien?.title || "?"}, Montant: ${e.amount} FCFA, Échéance: ${e.due_date}, Acquéreur: ${e.vente?.acquereur?.name || "?"}\n`;
        }
      }
    }

    if (context === "parcels" || context === "all") {
      const { data: ventesP } = await supabase
        .from("ventes_parcelles")
        .select("*, parcelle:parcelles(plot_number, lotissement:lotissements(name)), acquereur:acquereurs(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (ventesP?.length) {
        contextData += `\n\n--- VENTES DE PARCELLES RÉCENTES (${ventesP.length}) ---\n`;
        for (const v of ventesP) {
          contextData += `- Parcelle: ${v.parcelle?.plot_number || "?"} (${v.parcelle?.lotissement?.name || "?"}), Prix: ${v.total_price} FCFA, Acquéreur: ${v.acquereur?.name || "?"}\n`;
        }
      }

      const { data: echeancesParcelles } = await supabase
        .from("echeances_parcelles")
        .select("*, vente:ventes_parcelles(parcelle:parcelles(plot_number), acquereur:acquereurs(name))")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(15);

      if (echeancesParcelles?.length) {
        contextData += `\n--- ÉCHÉANCES PARCELLES EN ATTENTE (${echeancesParcelles.length}) ---\n`;
        for (const e of echeancesParcelles) {
          contextData += `- Parcelle: ${e.vente?.parcelle?.plot_number || "?"}, Montant: ${e.amount} FCFA, Échéance: ${e.due_date}\n`;
        }
      }
    }

    const systemPrompt = `Tu es un assistant IA expert en gestion immobilière en Afrique de l'Ouest (Bénin, Togo, Côte d'Ivoire, Sénégal, etc.). Tu conseilles les administrateurs d'agences immobilières.

Ton rôle :
1. **Recouvrement d'impayés** : Donner des conseils stratégiques pour récupérer les loyers impayés (relances amiables, mises en demeure, procédures judiciaires adaptées au droit OHADA et aux législations locales).
2. **Ventes immobilières** : Conseiller sur les stratégies de vente, la négociation, le suivi des échéances, et la sécurisation des transactions.
3. **Ventes de parcelles/lotissements** : Aider à optimiser la commercialisation des parcelles, le suivi des paiements échelonnés, et la gestion des prospects.

Règles :
- Réponds TOUJOURS en français.
- Sois concis, pratique et orienté action.
- Propose des étapes concrètes et priorisées.
- Prends en compte le contexte juridique OHADA et les pratiques locales (Mobile Money, WhatsApp, etc.).
- Si tu as des données contextuelles, analyse-les et donne des recommandations personnalisées.
- Utilise des emojis pour structurer tes réponses (📋, ⚠️, ✅, 💡, 📞, etc.).

Voici les données actuelles de l'agence :
${contextData || "Aucune donnée disponible pour le moment."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
