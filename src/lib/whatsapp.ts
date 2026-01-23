/**
 * Utility functions for WhatsApp integration using wa.me links
 * This approach opens WhatsApp with a pre-filled message - no API needed
 */

import { getWhatsAppTemplates, WhatsAppTemplates } from "@/components/settings/WhatsAppSettings";

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
 * Replace template variables with actual values
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

/**
 * Get the full message with signature
 */
function getFullMessage(template: string, templates: WhatsAppTemplates): string {
  return `${template}

${templates.signature}`;
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
  
  const templates = getWhatsAppTemplates();
  const message = replaceVariables(templates.receipt, {
    tenantName,
    propertyTitle,
    period,
    amount: formattedAmount,
    paidDate: formattedDate,
  });
  
  return getFullMessage(message, templates);
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
  
  const templates = getWhatsAppTemplates();
  const templateKey = isLate ? "lateReminder" : "reminder";
  const message = replaceVariables(templates[templateKey], {
    tenantName,
    propertyTitle,
    dueDate: formattedDate,
    amount: formattedAmount,
  });
  
  return getFullMessage(message, templates);
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
  
  const templates = getWhatsAppTemplates();
  const message = replaceVariables(templates.document, {
    tenantName,
    documentName,
    documentUrl: documentUrl || "",
  });
  
  return getFullMessage(message, templates);
}
