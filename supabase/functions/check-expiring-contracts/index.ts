import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for contracts expiring in the next 30 days
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const todayStr = today.toISOString().split("T")[0];
    const in30DaysStr = in30Days.toISOString().split("T")[0];

    // Find active contracts expiring soon
    const { data: expiringContracts, error: fetchError } = await supabase
      .from("contracts")
      .select(`
        id,
        user_id,
        end_date,
        tenant:tenants(name),
        property:properties(title)
      `)
      .eq("status", "active")
      .gte("end_date", todayStr)
      .lte("end_date", in30DaysStr);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiringContracts || expiringContracts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun contrat expirant prochainement",
          count: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check for existing notifications to avoid duplicates (one per day per contract)
    const contractIds = expiringContracts.map((c) => c.id);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("entity_id")
      .eq("entity_type", "contract")
      .in("entity_id", contractIds)
      .gte("created_at", todayStart.toISOString());

    const alreadyNotifiedIds = new Set(
      existingNotifications?.map((n) => n.entity_id) || []
    );

    // Create notifications for contracts not yet notified today
    const notificationPromises = expiringContracts
      .filter((contract) => !alreadyNotifiedIds.has(contract.id))
      .map(async (contract: any) => {
        const tenantName = contract.tenant?.name || "Locataire";
        const propertyTitle = contract.property?.title || "Bien immobilier";
        const endDate = new Date(contract.end_date);
        const daysRemaining = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        try {
          await supabase.from("notifications").insert({
            user_id: contract.user_id,
            title: "Contrat expirant bientôt",
            message: `Le contrat de ${tenantName} pour ${propertyTitle} expire dans ${daysRemaining} jour(s) (${endDate.toLocaleDateString("fr-FR")}).`,
            type: daysRemaining <= 7 ? "warning" : "info",
            entity_type: "contract",
            entity_id: contract.id,
          });
          return { contractId: contract.id, created: true };
        } catch (err) {
          console.error(`Failed to create notification for contract ${contract.id}:`, err);
          return { contractId: contract.id, created: false };
        }
      });

    const results = await Promise.all(notificationPromises);
    const createdCount = results.filter((r) => r.created).length;

    console.log(`Created ${createdCount} expiring contract notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${createdCount} notification(s) créée(s)`,
        expiring_count: expiringContracts.length,
        notifications_created: createdCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-expiring-contracts function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
