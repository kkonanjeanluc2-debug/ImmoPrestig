/**
 * Utility functions for WhatsApp integration using click-to-chat links.
 * This approach opens WhatsApp with a pre-filled message - no API needed.
 */

import { getWhatsAppTemplates, WhatsAppTemplates } from "@/components/settings/WhatsAppSettings";

/**
 * Format phone number for WhatsApp.
 * Accepts local or international formats and only strips separators,
 * preserving meaningful leading zeros entered by the user.
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.trim().replace(/[^\d+]/g, "");

  if (!cleaned) {
    return "";
  }

  const normalized = cleaned.startsWith("00")
    ? `+${cleaned.slice(2)}`
    : cleaned;

  return normalized.startsWith("+") ? normalized.slice(1) : normalized;
}

/**
 * Generate a WhatsApp click-to-chat URL.
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);

  if (!formattedPhone) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Generate a WhatsApp native app URL.
 */
export function generateWhatsAppAppUrl(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);

  if (!formattedPhone) {
    return `whatsapp://send?text=${encodedMessage}`;
  }

  return `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
}

/**
 * Open WhatsApp with a pre-filled message
 */
export function openWhatsApp(phone: string, message: string, existingWindow?: Window | null): Window | null {
  const appUrl = generateWhatsAppAppUrl(phone, message);
  const webUrl = generateWhatsAppUrl(phone, message);
  const popup = existingWindow ?? window.open("", "_blank");

  if (!popup) {
    const fallbackWindow = window.open(webUrl, "_blank");

    if (!fallbackWindow) {
      window.location.href = webUrl;
    }

    return fallbackWindow;
  }

  popup.location.href = appUrl;

  window.setTimeout(() => {
    if (!popup.closed) {
      popup.location.href = webUrl;
    }
  }, 1200);

  return popup;
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
