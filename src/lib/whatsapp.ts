/**
 * Utility functions for WhatsApp integration using wa.me links
 * This approach opens WhatsApp with a pre-filled message - no API needed
 */

/**
 * Format phone number for WhatsApp (remove spaces, dashes, and ensure country code)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // If it starts with 0, assume it's a local number and needs country code
  // Default to Senegal (+221) - adjust as needed for your region
  if (cleaned.startsWith("0")) {
    cleaned = "221" + cleaned.substring(1);
  }
  
  // Remove leading + if present (wa.me doesn't need it)
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Generate a WhatsApp click-to-chat URL
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Open WhatsApp with a pre-filled message
 */
export function openWhatsApp(phone: string, message: string): void {
  const url = generateWhatsAppUrl(phone, message);
  window.open(url, "_blank");
}

/**
 * Generate a receipt reminder message for WhatsApp
 */
export function generateReceiptMessage(params: {
  tenantName: string;
  propertyTitle: string;
  amount: number;
  period: string;
  paidDate: string;
}): string {
  const { tenantName, propertyTitle, amount, period, paidDate } = params;
  const formattedAmount = amount.toLocaleString("fr-FR");
  const formattedDate = new Date(paidDate).toLocaleDateString("fr-FR");
  
  return `📄 *QUITTANCE DE LOYER*

Bonjour ${tenantName},

Votre quittance de loyer est disponible :

🏠 *Bien :* ${propertyTitle}
📅 *Période :* ${period}
💰 *Montant :* ${formattedAmount} F CFA
✅ *Payé le :* ${formattedDate}

Merci pour votre paiement.

Cordialement,
L'équipe de gestion immobilière`;
}

/**
 * Generate a payment reminder message for WhatsApp
 */
export function generatePaymentReminderMessage(params: {
  tenantName: string;
  propertyTitle: string;
  amount: number;
  dueDate: string;
  isLate: boolean;
}): string {
  const { tenantName, propertyTitle, amount, dueDate, isLate } = params;
  const formattedAmount = amount.toLocaleString("fr-FR");
  const formattedDate = new Date(dueDate).toLocaleDateString("fr-FR");
  
  if (isLate) {
    return `⚠️ *RAPPEL URGENT - LOYER EN RETARD*

Bonjour ${tenantName},

Nous vous rappelons que votre loyer est en retard :

🏠 *Bien :* ${propertyTitle}
📅 *Échéance :* ${formattedDate}
💰 *Montant dû :* ${formattedAmount} F CFA

Merci de régulariser votre situation dans les plus brefs délais.

Cordialement,
L'équipe de gestion immobilière`;
  }
  
  return `📋 *RAPPEL - ÉCHÉANCE DE LOYER*

Bonjour ${tenantName},

Ceci est un rappel pour votre prochain paiement de loyer :

🏠 *Bien :* ${propertyTitle}
📅 *Échéance :* ${formattedDate}
💰 *Montant :* ${formattedAmount} F CFA

Merci de prévoir le règlement avant cette date.

Cordialement,
L'équipe de gestion immobilière`;
}

/**
 * Generate a document sharing message for WhatsApp
 */
export function generateDocumentMessage(params: {
  tenantName: string;
  documentName: string;
  documentUrl?: string;
}): string {
  const { tenantName, documentName, documentUrl } = params;
  
  let message = `📎 *DOCUMENT PARTAGÉ*

Bonjour ${tenantName},

Veuillez trouver ci-dessous le document suivant :

📄 *Document :* ${documentName}`;

  if (documentUrl) {
    message += `

🔗 *Lien :* ${documentUrl}`;
  }

  message += `

Cordialement,
L'équipe de gestion immobilière`;

  return message;
}
