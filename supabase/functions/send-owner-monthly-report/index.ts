import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";
import { isEmailEnabled } from "../_shared/check-email-enabled.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TenantPaymentRow {
  tenantName: string;
  propertyTitle: string;
  rentAmount: number;
  paidAmount: number;
  status: "paid" | "pending" | "late";
}

interface InterventionRow {
  title: string;
  propertyTitle: string;
  type: string;
  cost: number;
}

interface ReportRequest {
  ownerName: string;
  ownerEmail: string;
  period: string;
  agencyName: string;
  agencyEmail?: string;
  agencyPhone?: string;
  agencyLogoUrl?: string;
  tenantPayments: TenantPaymentRow[];
  interventions: InterventionRow[];
  commissionPercentage: number;
  managementTypeName?: string;
}

const formatAmount = (amount: number): string => {
  return amount.toLocaleString("fr-FR") + " F CFA";
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    paid: "Payé",
    pending: "En attente",
    late: "En retard",
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    paid: "#22c55e",
    pending: "#eab308",
    late: "#ef4444",
  };
  return colors[status] || "#666666";
};

const getInterventionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    reparation: "Réparation",
    maintenance: "Maintenance",
    procedure: "Procédure",
    renovation: "Rénovation",
    autre: "Autre",
  };
  return labels[type] || type;
};

const generateEmailHtml = (data: ReportRequest): string => {
  const totalRent = data.tenantPayments.reduce((sum, p) => sum + p.rentAmount, 0);
  const totalPaid = data.tenantPayments.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalInterventions = data.interventions.reduce((sum, i) => sum + (i.cost || 0), 0);
  const commissionAmount = Math.round((totalPaid * data.commissionPercentage) / 100);
  const netAmount = totalPaid - commissionAmount - totalInterventions;

  const tenantRows = data.tenantPayments.length > 0 
    ? data.tenantPayments.map(p => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${p.tenantName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${p.propertyTitle}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(p.rentAmount)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(p.paidAmount)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            <span style="color: ${getStatusColor(p.status)}; font-weight: 600;">${getStatusLabel(p.status)}</span>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #888;">Aucun paiement enregistré pour cette période</td></tr>`;

  const interventionRows = data.interventions.length > 0
    ? data.interventions.map(i => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${i.title}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${i.propertyTitle}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">${getInterventionTypeLabel(i.type)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(i.cost || 0)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #888;">Aucune intervention pour cette période</td></tr>`;

  const commissionLabel = data.managementTypeName 
    ? `Commission agence (${data.managementTypeName} - ${data.commissionPercentage}%)`
    : `Commission agence (${data.commissionPercentage}%)`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 700px; margin: 0 auto; background: white; }
        .header { background: #1a365d; color: white; padding: 25px; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; }
        .content { padding: 25px; }
        .section-title { color: #1a365d; font-size: 16px; font-weight: bold; margin: 25px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #1a365d; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: #1a365d; color: white; padding: 12px; text-align: left; font-weight: 600; }
        th:last-child, td:last-child { text-align: right; }
        .totals-row { background: #f8f9fa; font-weight: bold; }
        .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 25px; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .summary-row:last-child { border-bottom: none; }
        .summary-row.total { border-top: 2px solid #1a365d; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: bold; }
        .positive { color: #22c55e; }
        .negative { color: #ef4444; }
        .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f0f0f0; }
        @media (max-width: 600px) {
          .content { padding: 15px; }
          table { font-size: 12px; }
          th, td { padding: 8px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${data.agencyLogoUrl ? `<img src="${data.agencyLogoUrl}" alt="Logo" style="max-height: 40px; margin-bottom: 10px;">` : ''}
          <h1>POINT MENSUEL</h1>
          <p>${data.period}</p>
        </div>
        
        <div class="content">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1a365d; font-weight: bold;">Propriétaire</p>
            <p style="margin: 5px 0 0 0; font-size: 18px;">${data.ownerName}</p>
          </div>

          <div class="section-title">📊 Détail des loyers</div>
          <table>
            <thead>
              <tr>
                <th>Locataire</th>
                <th>Bien</th>
                <th style="text-align: right;">Loyer</th>
                <th style="text-align: right;">Payé</th>
                <th style="text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${tenantRows}
              <tr class="totals-row">
                <td colspan="2" style="padding: 12px; font-weight: bold;">TOTAL</td>
                <td style="padding: 12px; text-align: right;">${formatAmount(totalRent)}</td>
                <td style="padding: 12px; text-align: right;">${formatAmount(totalPaid)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">🔧 Interventions / Réparations</div>
          <table>
            <thead>
              <tr>
                <th>Intervention</th>
                <th>Bien</th>
                <th>Type</th>
                <th style="text-align: right;">Coût</th>
              </tr>
            </thead>
            <tbody>
              ${interventionRows}
              ${data.interventions.length > 0 ? `
              <tr class="totals-row">
                <td colspan="3" style="padding: 12px; font-weight: bold;">TOTAL INTERVENTIONS</td>
                <td style="padding: 12px; text-align: right;">${formatAmount(totalInterventions)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="summary-box">
            <h3 style="margin: 0 0 15px 0; color: #1a365d;">📋 Récapitulatif</h3>
            <div class="summary-row">
              <span>Total loyers encaissés</span>
              <span style="font-weight: 600;">${formatAmount(totalPaid)}</span>
            </div>
            <div class="summary-row">
              <span>${commissionLabel}</span>
              <span class="negative">- ${formatAmount(commissionAmount)}</span>
            </div>
            <div class="summary-row">
              <span>Coûts interventions/réparations</span>
              <span class="negative">- ${formatAmount(totalInterventions)}</span>
            </div>
            <div class="summary-row total">
              <span>SOLDE PROPRIÉTAIRE</span>
              <span class="${netAmount >= 0 ? 'positive' : 'negative'}">${formatAmount(netAmount)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p style="margin: 0 0 5px 0;"><strong>${data.agencyName}</strong></p>
          ${data.agencyPhone ? `<p style="margin: 0;">${data.agencyPhone}${data.agencyEmail ? ` | ${data.agencyEmail}` : ''}</p>` : ''}
          <p style="margin: 10px 0 0 0; color: #aaa;">Ce document est un rapport mensuel généré automatiquement.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      return new Response(
        JSON.stringify({ success: false, error: "L'envoi d'emails est désactivé par l'administrateur" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: ReportRequest = await req.json();

    if (!data.ownerEmail) {
      throw new Error("L'email du propriétaire est requis");
    }

    const html = generateEmailHtml(data);
    const fromName = data.agencyName || "Gestion Locative";

    const emailResponse = await sendEmail({
      from: `RAPPORT MENSUEL <noreply@immoprestigeci.com>`,
      to: [data.ownerEmail],
      subject: `📊 Point mensuel - ${data.period}`,
      html,
    });

    if (!emailResponse.success) throw new Error(emailResponse.error);

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email envoyé avec succès" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Error sending monthly report email:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
