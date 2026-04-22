import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";

interface CreateRentPaymentPayload {
  tenant_id?: string;
  due_date?: string;
  payment_months?: string[] | null;
}

const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function toYearMonth(value: string): string | null {
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const parts = value.split(" ");
  if (parts.length === 2) {
    const monthIndex = FRENCH_MONTHS.indexOf(parts[0]);
    if (monthIndex >= 0) return `${parts[1]}-${String(monthIndex + 1).padStart(2, "0")}`;
  }
  return value.length >= 7 ? value.substring(0, 7) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload: CreateRentPaymentPayload = await req.json();
    const dueDate = payload.due_date;
    if (!dueDate) {
      return new Response(JSON.stringify({ error: "due_date requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, portal_user_id, has_portal_access")
      .eq("portal_user_id", auth.userId)
      .eq("has_portal_access", true)
      .is("deleted_at", null)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Accès portail non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.tenant_id && payload.tenant_id !== tenant.id) {
      return new Response(JSON.stringify({ error: "Paiement non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetYearMonth = dueDate.substring(0, 7);
    const requestedMonths = (payload.payment_months || []).filter(Boolean);
    const requestedCoverage = new Set<string>([
      targetYearMonth,
      ...requestedMonths.map((month) => toYearMonth(month)).filter((value): value is string => !!value),
    ]);

    const { data: existingPayments, error: existingPaymentsError } = await adminClient
      .from("payments")
      .select("id, due_date, payment_months")
      .eq("tenant_id", tenant.id);

    if (existingPaymentsError) {
      throw existingPaymentsError;
    }

    const matchingPayment = (existingPayments || []).find((payment) => {
      const coveredMonths = new Set<string>();
      if (payment.due_date?.length >= 7) {
        coveredMonths.add(payment.due_date.substring(0, 7));
      }
      for (const month of payment.payment_months || []) {
        const normalized = toYearMonth(month);
        if (normalized) coveredMonths.add(normalized);
      }
      return [...requestedCoverage].some((month) => coveredMonths.has(month));
    });

    if (matchingPayment) {
      return new Response(JSON.stringify({ success: true, payment_id: matchingPayment.id, existing: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: contractError } = await adminClient
      .from("contracts")
      .select("id, user_id, rent_amount")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contractError) {
      throw contractError;
    }

    if (!contract) {
      return new Response(JSON.stringify({ error: "Aucun contrat actif trouvé pour ce locataire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertPayload = {
      tenant_id: tenant.id,
      contract_id: contract.id,
      amount: Number(contract.rent_amount),
      due_date: dueDate,
      status: "pending",
      user_id: contract.user_id,
      payment_months: requestedMonths.length > 0 ? requestedMonths : null,
    };

    const { data: createdPayment, error: createError } = await adminClient
      .from("payments")
      .insert(insertPayload)
      .select("id")
      .single();

    if (createError || !createdPayment) {
      throw createError || new Error("Création du paiement impossible");
    }

    return new Response(JSON.stringify({ success: true, payment_id: createdPayment.id, existing: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in tenant-create-rent-payment:", error);
    return new Response(JSON.stringify({ error: error.message || "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});