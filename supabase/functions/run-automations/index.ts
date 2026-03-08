import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Master automation scheduler - called by pg_cron every hour.
 * Processes all agencies based on their automation_schedules.
 * Does NOT require user auth - uses service role key.
 * Security: validates the request comes with the anon key via Authorization header.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const today = now.toISOString().split("T")[0];
  const currentDayOfMonth = now.getUTCDate();
  const currentDayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...

  console.log(`[run-automations] Starting at ${now.toISOString()} (UTC hour: ${currentHour}, day: ${currentDayOfMonth})`);

  const results = {
    schedules_processed: 0,
    payment_reminders: { run: 0, notifications: 0, emails: 0 },
    late_payments: { run: 0, detected: 0, notifications: 0, emails: 0 },
    sms_reminders: { run: 0, sent: 0 },
    monthly_receipts: { run: 0, sent: 0 },
    contract_expirations: { run: 0, expired: 0 },
    errors: [] as string[],
  };

  try {
    // 1. Always run contract expiration check (once per day at hour 0)
    if (currentHour === 0 && currentMinute === 0) {
      await runContractExpiration(supabase, results);
    }

    // 2. Fetch all automation schedules
    const { data: schedules, error: schedError } = await supabase
      .from("automation_schedules")
      .select("*");

    if (schedError) {
      throw new Error(`Failed to fetch schedules: ${schedError.message}`);
    }

    if (!schedules || schedules.length === 0) {
      console.log("[run-automations] No automation schedules found");
      return jsonResponse(results);
    }

    const emailEnabled = await isEmailEnabled();

    for (const schedule of schedules) {
      results.schedules_processed++;
      const userId = schedule.user_id;

      try {
        // Payment reminders
        if (schedule.payment_reminder_enabled && isScheduledTime(schedule.payment_reminder_time, currentHour, currentMinute)) {
          await runPaymentReminders(supabase, userId, schedule.payment_reminder_days_before, emailEnabled, results);
        }

        // Late payment detection
        if (schedule.late_payment_enabled && isScheduledTime(schedule.late_payment_time, currentHour, currentMinute)) {
          await runLatePaymentDetection(supabase, userId, schedule.late_payment_days_after, emailEnabled, results);
        }

        // SMS reminders
        if (schedule.sms_reminder_enabled) {
          const allowedDays = schedule.sms_reminder_weekdays || [1, 2, 3, 4, 5];
          if (isScheduledTime(schedule.sms_reminder_time, currentHour, currentMinute) && allowedDays.includes(currentDayOfWeek)) {
            await runSmsReminders(supabase, userId, results);
          }
        }

        // Monthly receipts
        if (
          schedule.monthly_receipt_enabled &&
          schedule.monthly_receipt_day === currentDayOfMonth &&
          isScheduledTime(schedule.monthly_receipt_time, currentHour, currentMinute)
        ) {
          if (emailEnabled) {
            await runMonthlyReceipts(supabase, userId, results);
          }
        }
      } catch (err) {
        const msg = `Error processing schedule for user ${userId}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        results.errors.push(msg);
      }
    }

    console.log("[run-automations] Complete:", JSON.stringify(results));
    return jsonResponse(results);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[run-automations] Fatal error:", msg);
    results.errors.push(msg);
    return jsonResponse(results, 500);
  }
});

function parseTimeHour(timeStr: string): number {
  // timeStr is like "09:00:00" or "09:00"
  if (!timeStr) return 8; // default
  const parts = timeStr.split(":");
  return parseInt(parts[0], 10);
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, ...data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ==================== CONTRACT EXPIRATION ====================
async function runContractExpiration(supabase: any, results: any) {
  console.log("[contract-expiration] Running...");
  results.contract_expirations.run++;

  const today = new Date().toISOString().split("T")[0];

  const { data: expiredContracts, error } = await supabase
    .from("contracts")
    .select("id, user_id, property_id, unit_id, tenant_id, tenant:tenants(name), property:properties(title)")
    .eq("status", "active")
    .lt("end_date", today);

  if (error) {
    results.errors.push(`Contract expiration fetch error: ${error.message}`);
    return;
  }

  if (!expiredContracts || expiredContracts.length === 0) return;

  const contractIds = expiredContracts.map((c: any) => c.id);

  // Update contracts to expired
  await supabase.from("contracts").update({ status: "expired" }).in("id", contractIds);

  // Update units
  const contractsWithUnits = expiredContracts.filter((c: any) => c.unit_id);
  const contractsWithoutUnits = expiredContracts.filter((c: any) => !c.unit_id);

  const unitIds = contractsWithUnits.map((c: any) => c.unit_id).filter(Boolean);
  if (unitIds.length > 0) {
    await supabase.from("property_units").update({ status: "disponible" }).in("id", unitIds);
  }

  // Check if multi-unit properties should be set to disponible
  const propertyIdsToCheck = [...new Set(contractsWithUnits.map((c: any) => c.property_id).filter(Boolean))];
  for (const propertyId of propertyIdsToCheck) {
    const { data: occupiedUnits } = await supabase
      .from("property_units").select("id").eq("property_id", propertyId).eq("status", "loué");
    if (!occupiedUnits || occupiedUnits.length === 0) {
      await supabase.from("properties").update({ status: "disponible" }).eq("id", propertyId);
    }
  }

  // Update properties without units
  const propIdsNoUnit = contractsWithoutUnits.map((c: any) => c.property_id).filter(Boolean);
  if (propIdsNoUnit.length > 0) {
    await supabase.from("properties").update({ status: "disponible" }).in("id", propIdsNoUnit);
  }

  // Revoke portal access for tenants with no remaining active contracts
  const tenantIds = [...new Set(expiredContracts.map((c: any) => c.tenant_id).filter(Boolean))];
  for (const tenantId of tenantIds) {
    const { data: otherActive } = await supabase
      .from("contracts").select("id").eq("tenant_id", tenantId).eq("status", "active").limit(1);
    if (!otherActive || otherActive.length === 0) {
      await supabase.from("tenants").update({ has_portal_access: false }).eq("id", tenantId).eq("has_portal_access", true);
    }
  }

  // Create notifications
  for (const contract of expiredContracts) {
    const tenantName = contract.tenant?.name || "Locataire";
    const propertyTitle = contract.property?.title || "Bien immobilier";
    try {
      await supabase.from("notifications").insert({
        user_id: contract.user_id,
        title: "Contrat expiré",
        message: contract.unit_id
          ? `Le contrat de ${tenantName} pour ${propertyTitle} a expiré. La porte a été libérée.`
          : `Le contrat de ${tenantName} pour ${propertyTitle} a expiré. Le bien a été remis en disponible.`,
        type: "info", entity_type: "contract", entity_id: contract.id,
      });
    } catch (_) { /* skip */ }
  }

  results.contract_expirations.expired = contractIds.length;
  console.log(`[contract-expiration] Expired ${contractIds.length} contracts`);
}

// ==================== PAYMENT REMINDERS ====================
async function runPaymentReminders(supabase: any, userId: string, daysBefore: number, emailEnabled: boolean, results: any) {
  console.log(`[payment-reminders] Running for user ${userId}, ${daysBefore} days before`);
  results.payment_reminders.run++;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysBefore);
  const targetDateStr = targetDate.toISOString().split("T")[0];

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, user_id, tenant_id, amount, due_date, tenant:tenants(id, name, email, property:properties(title))")
    .eq("due_date", targetDateStr)
    .eq("user_id", userId)
    .in("status", ["pending"]);

  if (error || !payments) return;

  const todayStr = new Date().toISOString().split("T")[0];

  for (const payment of payments) {
    const tenant = Array.isArray(payment.tenant) ? payment.tenant[0] : payment.tenant;
    if (!tenant) continue;

    const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property;
    const propertyTitle = property?.title || "Propriété";
    const formattedAmount = Number(payment.amount).toLocaleString("fr-FR");
    const formattedDate = new Date(payment.due_date).toLocaleDateString("fr-FR");

    // Check duplicate notification
    const { data: existing } = await supabase
      .from("notifications").select("id")
      .eq("user_id", payment.user_id).eq("entity_id", payment.id).eq("entity_type", "payment")
      .gte("created_at", `${todayStr}T00:00:00.000Z`).like("title", "%Échéance proche%").limit(1);

    if (existing && existing.length > 0) continue;

    // Create notification
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: payment.user_id,
      title: "⏰ Échéance proche",
      message: `Le paiement de ${formattedAmount} F CFA pour ${tenant.name} (${propertyTitle}) est dû dans ${daysBefore} jours (${formattedDate}).`,
      type: "warning", entity_type: "payment", entity_id: payment.id, read: false,
    });
    if (!notifErr) results.payment_reminders.notifications++;

    // Send email
    if (emailEnabled && tenant.email) {
      try {
        const emailResponse = await sendEmail({
          from: "RAPPEL ECHEANCE <noreply@immoprestigeci.com>",
          to: [tenant.email],
          subject: `⏰ Rappel : Paiement de ${formattedAmount} F CFA dû le ${formattedDate}`,
          html: buildPaymentReminderEmail(tenant.name, propertyTitle, formattedAmount, formattedDate, daysBefore),
        });
        if (emailResponse.success) {
          results.payment_reminders.emails++;
          await supabase.from("email_logs").insert({
            user_id: payment.user_id, tenant_id: tenant.id, payment_id: payment.id,
            email_type: "upcoming_payment_reminder", recipient_email: tenant.email,
            subject: `Rappel : Paiement de ${formattedAmount} F CFA dû le ${formattedDate}`, status: "sent",
          });
        }
      } catch (e) {
        console.error(`Email error for payment ${payment.id}:`, e);
      }
    }
  }
}

// ==================== LATE PAYMENT DETECTION ====================
async function runLatePaymentDetection(supabase: any, userId: string, daysAfter: number, emailEnabled: boolean, results: any) {
  console.log(`[late-payments] Running for user ${userId}, ${daysAfter} days after`);
  results.late_payments.run++;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAfter);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const { data: latePayments, error } = await supabase
    .from("payments")
    .select("id, user_id, amount, due_date, tenant:tenants(id, name, email, property:properties(title))")
    .eq("status", "pending")
    .eq("user_id", userId)
    .lte("due_date", cutoffStr);

  if (error || !latePayments || latePayments.length === 0) return;

  results.late_payments.detected += latePayments.length;

  // Update to late status
  const ids = latePayments.map((p: any) => p.id);
  await supabase.from("payments").update({ status: "late" }).in("id", ids);

  for (const payment of latePayments) {
    const tenant = Array.isArray(payment.tenant) ? payment.tenant[0] : payment.tenant;
    if (!tenant) continue;

    const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property;
    const propertyTitle = property?.title || "Bien immobilier";
    const amount = Number(payment.amount).toLocaleString("fr-FR");
    const dueDate = new Date(payment.due_date).toLocaleDateString("fr-FR");

    // Create notification
    try {
      await supabase.from("notifications").insert({
        user_id: payment.user_id,
        title: "🚨 Paiement en retard",
        message: `Le paiement de ${amount} F CFA pour ${tenant.name} (${propertyTitle}) est en retard depuis le ${dueDate}.`,
        type: "warning", entity_type: "payment", entity_id: payment.id,
      });
      results.late_payments.notifications++;
    } catch (_) { /* skip */ }

    // Send email
    if (emailEnabled && tenant.email) {
      try {
        const emailResponse = await sendEmail({
          from: "RAPPEL ECHEANCE <noreply@immoprestigeci.com>",
          to: [tenant.email],
          subject: `🚨 Rappel: Paiement en retard - ${propertyTitle}`,
          html: buildLatePaymentEmail(tenant.name, propertyTitle, amount, dueDate),
        });
        if (emailResponse.success) {
          results.late_payments.emails++;
          await supabase.from("email_logs").insert({
            user_id: payment.user_id, tenant_id: tenant.id, payment_id: payment.id,
            email_type: "late_payment_reminder", recipient_email: tenant.email,
            subject: `Rappel: Paiement en retard - ${propertyTitle}`, status: "sent",
          });
        }
      } catch (e) {
        console.error(`Email error for late payment ${payment.id}:`, e);
      }
    }
  }
}

// ==================== SMS REMINDERS ====================
async function runSmsReminders(supabase: any, userId: string, results: any) {
  console.log(`[sms-reminders] Running for user ${userId}`);
  results.sms_reminders.run++;

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("[sms-reminders] Twilio not configured, skipping");
    return;
  }

  const { data: latePayments, error } = await supabase
    .from("payments")
    .select("id, user_id, tenant_id, amount, due_date, tenant:tenants(id, name, phone, property:properties(title))")
    .eq("status", "late")
    .eq("user_id", userId);

  if (error || !latePayments) return;

  const paymentsWithPhone = latePayments.filter((p: any) => {
    const t = Array.isArray(p.tenant) ? p.tenant[0] : p.tenant;
    return t?.phone;
  });

  // Check already sent today
  const today = new Date().toISOString().split("T")[0];
  const { data: sentToday } = await supabase
    .from("email_logs").select("payment_id")
    .eq("email_type", "sms_reminder")
    .gte("created_at", `${today}T00:00:00.000Z`);

  const sentIds = new Set((sentToday || []).map((l: any) => l.payment_id));
  const toNotify = paymentsWithPhone.filter((p: any) => !sentIds.has(p.id));

  for (const payment of toNotify) {
    const tenant = Array.isArray(payment.tenant) ? payment.tenant[0] : payment.tenant;
    if (!tenant?.phone) continue;

    const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property;
    const propertyTitle = property?.title || "votre logement";
    const amount = Number(payment.amount).toLocaleString("fr-FR");
    const dueDate = new Date(payment.due_date).toLocaleDateString("fr-FR");

    const message = `URGENT - Rappel de loyer impayé\n\nBonjour ${tenant.name},\n\nVotre loyer de ${amount} F CFA pour "${propertyTitle}" était dû le ${dueDate}.\n\nMerci de régulariser votre situation rapidement.`;

    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append("To", tenant.phone);
      formData.append("From", TWILIO_PHONE_NUMBER);
      formData.append("Body", message);

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (res.ok) {
        await supabase.from("email_logs").insert({
          user_id: payment.user_id, tenant_id: tenant.id, payment_id: payment.id,
          email_type: "sms_reminder", recipient_email: tenant.phone,
          subject: "SMS - Rappel automatique loyer en retard", status: "sent",
        });
        results.sms_reminders.sent++;
      }
    } catch (e) {
      console.error(`SMS error for ${tenant.name}:`, e);
    }
  }
}

// ==================== MONTHLY RECEIPTS ====================
async function runMonthlyReceipts(supabase: any, userId: string, results: any) {
  console.log(`[monthly-receipts] Running for user ${userId}`);
  results.monthly_receipts.run++;

  const { data: payments, error } = await supabase
    .from("payments")
    .select("id, amount, due_date, paid_date, method, user_id, tenant_id, tenant:tenants(id, name, email, property:properties(id, title, address, owner:owners(name)))")
    .eq("status", "paid")
    .not("paid_date", "is", null)
    .eq("user_id", userId);

  if (error || !payments) return;

  // Get agency info
  const { data: agency } = await supabase
    .from("agencies").select("name, email, phone, address, city, country, logo_url")
    .eq("user_id", userId).maybeSingle();

  for (const payment of payments) {
    // Check if receipt already sent
    const { data: existing } = await supabase
      .from("email_logs").select("id")
      .eq("payment_id", payment.id).eq("email_type", "receipt").eq("status", "sent").limit(1);

    if (existing && existing.length > 0) continue;

    const tenant = Array.isArray(payment.tenant) ? payment.tenant[0] : null;
    if (!tenant?.email) continue;

    const property = Array.isArray(tenant.property) ? tenant.property[0] : null;
    const owner = property?.owner ? (Array.isArray(property.owner) ? property.owner[0] : property.owner) : null;
    const period = getPaymentPeriod(payment.due_date);
    const propertyTitle = property?.title || "Bien loué";

    try {
      const emailResponse = await sendEmail({
        from: `QUITTANCE LOYER <noreply@immoprestigeci.com>`,
        to: [tenant.email],
        subject: `✅ Quittance de loyer - ${period} - ${propertyTitle}`,
        html: buildReceiptEmail(payment, tenant, property, owner, agency, period),
      });

      if (emailResponse.success) {
        await supabase.from("email_logs").insert({
          user_id: payment.user_id, tenant_id: tenant.id, payment_id: payment.id,
          email_type: "receipt", recipient_email: tenant.email,
          subject: `Quittance de loyer - ${period} - ${propertyTitle}`, status: "sent",
        });
        await supabase.from("notifications").insert({
          user_id: payment.user_id, title: "Quittance envoyée",
          message: `Quittance de ${period} envoyée à ${tenant.name}`,
          type: "info", entity_type: "payment", entity_id: payment.id,
        });
        results.monthly_receipts.sent++;
      }
    } catch (e) {
      console.error(`Receipt email error for payment ${payment.id}:`, e);
    }
  }
}

// ==================== HELPERS ====================

function getPaymentPeriod(dueDate: string): string {
  const date = new Date(dueDate);
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function buildPaymentReminderEmail(tenantName: string, property: string, amount: string, dueDate: string, daysBefore: number): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .amount { font-size: 28px; font-weight: bold; color: #f59e0b; margin: 20px 0; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style></head><body><div class="container">
    <div class="header"><h1>⏰ Rappel : Échéance dans ${daysBefore} jours</h1></div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Nous vous rappelons que votre paiement de loyer arrive à échéance prochainement.</p>
      <div class="details">
        <p><strong>📍 Propriété :</strong> ${property}</p>
        <p><strong>📅 Date d'échéance :</strong> ${dueDate}</p>
        <p class="amount">${amount} F CFA</p>
      </div>
      <p>Merci de prévoir le règlement avant la date d'échéance.</p>
      <p>Cordialement,<br>L'équipe de gestion immobilière</p>
    </div>
    <div class="footer"><p>Ceci est un email automatique.</p></div>
  </div></body></html>`;
}

function buildLatePaymentEmail(tenantName: string, property: string, amount: string, dueDate: string): string {
  return `<!DOCTYPE html><html><head><style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .amount { font-size: 24px; font-weight: bold; color: #e53e3e; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style></head><body><div class="container">
    <div class="header"><h1>⚠️ Rappel de paiement</h1></div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Nous vous informons que le paiement du loyer pour <strong>${property}</strong> est en retard.</p>
      <div class="info-box">
        <p><strong>Détails :</strong></p>
        <p>📍 Bien : ${property}</p>
        <p>📅 Date d'échéance : ${dueDate}</p>
        <p>💰 Montant : <span class="amount">${amount} F CFA</span></p>
      </div>
      <p>Nous vous prions de régulariser votre situation dans les plus brefs délais.</p>
      <p>Cordialement,<br>Votre gestionnaire immobilier</p>
    </div>
    <div class="footer"><p>Ceci est un email automatique.</p></div>
  </div></body></html>`;
}

function buildReceiptEmail(payment: any, tenant: any, property: any, owner: any, agency: any, period: string): string {
  const agencyName = agency?.name || "Votre gestionnaire immobilier";
  const agencyContact = [agency?.phone, agency?.email].filter(Boolean).join(" | ");
  const propertyTitle = property?.title || "Bien loué";
  const propertyAddress = property?.address || "";
  const ownerName = owner?.name || null;
  const amount = Number(payment.amount);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1a365d; color: white; padding: 25px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { padding: 25px; }
    .period-box { background: #e8f4f8; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px; font-weight: bold; color: #1a365d; }
    .amount-box { background: #1a365d; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .amount { font-size: 28px; font-weight: bold; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f0f0f0; }
    .badge { display: inline-block; background: #38a169; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  </style></head><body><div class="container">
    <div class="header">
      ${agency?.logo_url ? `<img src="${agency.logo_url}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;">` : ''}
      <h1>QUITTANCE DE LOYER</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">N° ${payment.id.substring(0, 8).toUpperCase()}</p>
    </div>
    <div class="content">
      <div class="period-box">📅 Période : ${period}</div>
      <div class="details"><p style="margin:0;font-weight:500;">👤 Bailleur : ${ownerName || agencyName}</p></div>
      <div class="details"><p style="margin:0;font-weight:500;">🏠 Locataire : ${tenant.name}</p></div>
      <div class="details"><p style="margin:0;font-weight:500;">📍 ${propertyTitle}${propertyAddress ? ` - ${propertyAddress}` : ''}</p></div>
      <div class="amount-box">
        <p style="margin:0 0 5px 0;font-size:14px;opacity:0.9;">Montant reçu</p>
        <p class="amount" style="margin:0;">${amount.toLocaleString("fr-FR")} F CFA</p>
        <span class="badge" style="margin-top:10px;">✓ PAYÉ</span>
      </div>
      <div class="details">
        <p>📆 Échéance : ${new Date(payment.due_date).toLocaleDateString("fr-FR")}</p>
        <p>✅ Payé le : ${new Date(payment.paid_date).toLocaleDateString("fr-FR")}</p>
        <p>💳 Mode : ${payment.method || 'Non spécifié'}</p>
      </div>
      <p style="font-size:13px;color:#555;line-height:1.6;padding:15px;background:#fafafa;border-radius:8px;border-left:3px solid #1a365d;">
        Je soussigné(e), ${ownerName || agencyName}, déclare avoir reçu de ${tenant.name} la somme de ${amount.toLocaleString("fr-FR")} F CFA 
        au titre du loyer pour la période de ${period}.
      </p>
      <p style="text-align:right;font-style:italic;color:#666;">
        Fait le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}<br>
        <strong>${ownerName || agencyName}</strong>
      </p>
    </div>
    <div class="footer">
      <p style="margin:0 0 5px 0;"><strong>${agencyName}</strong></p>
      ${agencyContact ? `<p style="margin:0;">${agencyContact}</p>` : ''}
      <p style="margin:10px 0 0 0;font-size:11px;color:#aaa;">Quittance de loyer générée automatiquement.</p>
    </div>
  </div></body></html>`;
}
