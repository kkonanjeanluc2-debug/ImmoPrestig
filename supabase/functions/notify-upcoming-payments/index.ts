import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 3 days from now
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    const targetDate = threeDaysFromNow.toISOString().split("T")[0];

    console.log(`Checking for payments due on ${targetDate}`);

    // Fetch payments due in exactly 3 days that are not yet paid
    const { data: upcomingPayments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        id,
        user_id,
        tenant_id,
        amount,
        due_date,
        status,
        tenant:tenants(
          id,
          name,
          property:properties(title)
        )
      `)
      .eq("due_date", targetDate)
      .in("status", ["pending"]);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      throw paymentsError;
    }

    console.log(`Found ${upcomingPayments?.length || 0} payments due in 3 days`);

    let notificationsCreated = 0;

    for (const payment of upcomingPayments || []) {
      const tenant = Array.isArray(payment.tenant) ? payment.tenant[0] : payment.tenant;
      if (!tenant) continue;

      const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property;
      const propertyTitle = property?.title || "Propriété";
      const formattedAmount = Number(payment.amount).toLocaleString("fr-FR");
      const formattedDate = new Date(payment.due_date).toLocaleDateString("fr-FR");

      // Check if a notification was already created for this payment today
      const todayStart = new Date().toISOString().split("T")[0];
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", payment.user_id)
        .eq("entity_id", payment.id)
        .eq("entity_type", "payment")
        .gte("created_at", `${todayStart}T00:00:00.000Z`)
        .like("title", "%Échéance proche%")
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        console.log(`Notification already exists for payment ${payment.id}`);
        continue;
      }

      // Create the notification
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: payment.user_id,
        title: "⏰ Échéance proche",
        message: `Le paiement de ${formattedAmount} F CFA pour ${tenant.name} (${propertyTitle}) est dû dans 3 jours (${formattedDate}).`,
        type: "warning",
        entity_type: "payment",
        entity_id: payment.id,
        read: false,
      });

      if (notifError) {
        console.error(`Error creating notification for payment ${payment.id}:`, notifError);
      } else {
        notificationsCreated++;
        console.log(`Notification created for payment ${payment.id} - ${tenant.name}`);
      }
    }

    const result = {
      success: true,
      paymentsChecked: upcomingPayments?.length || 0,
      notificationsCreated,
      targetDate,
    };

    console.log("Upcoming payment notifications result:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in notify-upcoming-payments:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
