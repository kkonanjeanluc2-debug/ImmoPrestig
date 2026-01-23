import jsPDF from "jspdf";
import { getReceiptTemplates, type ReceiptTemplates } from "@/components/settings/ReceiptSettings";
import { type ReceiptTemplate } from "@/hooks/useReceiptTemplates";

interface AgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string | null;
}

interface ReceiptData {
  paymentId: string;
  tenantName: string;
  tenantEmail?: string;
  propertyTitle: string;
  propertyAddress?: string;
  amount: number;
  paidDate: string;
  dueDate: string;
  period: string;
  method?: string;
  ownerName?: string;
  agency?: AgencyInfo | null;
}

interface ReceiptDataWithTemplate extends ReceiptData {
  template?: ReceiptTemplate | null;
}

// Convert database template to legacy format for compatibility
const convertDbTemplateToLegacy = (template: ReceiptTemplate): ReceiptTemplates => {
  return {
    title: template.title,
    declarationText: template.declaration_text,
    footerText: template.footer_text,
    showLogo: template.show_logo,
    showAgencyContact: template.show_contacts,
    showOwnerSection: true,
    showAmountInWords: template.show_amount_in_words,
    showPaymentDetails: true,
    dateFormat: template.date_format === "long" ? "long" : "short",
    currency: template.currency_symbol,
    signatureLabel: template.signature_text,
    watermarkEnabled: template.watermark_enabled,
    watermarkType: template.watermark_type as "text" | "image" | "agency_logo",
    watermarkText: template.watermark_text || "ORIGINAL",
    watermarkImageUrl: template.watermark_image_url,
    watermarkOpacity: template.watermark_opacity,
    watermarkAngle: template.watermark_angle,
    watermarkPosition: template.watermark_position as "center" | "diagonal" | "bottom-right",
    watermarkLogoSize: ((template as any).watermark_logo_size as "small" | "medium" | "large") || "medium",
  };
};

const numberToWords = (num: number): string => {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  
  if (num === 0) return "zéro";
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) {
      return tens[t - 1] + "-" + teens[u];
    }
    return tens[t] + (u > 0 ? "-" + units[u] : "");
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const prefix = h === 1 ? "cent" : units[h] + " cent";
    return prefix + (rest > 0 ? " " + numberToWords(rest) : "");
  }
  if (num < 1000000) {
    const t = Math.floor(num / 1000);
    const rest = num % 1000;
    const prefix = t === 1 ? "mille" : numberToWords(t) + " mille";
    return prefix + (rest > 0 ? " " + numberToWords(rest) : "");
  }
  return num.toLocaleString("fr-FR");
};

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const formatDate = (dateStr: string, format: "short" | "long"): string => {
  const date = new Date(dateStr);
  if (format === "long") {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("fr-FR");
};

const replaceVariables = (
  template: string,
  data: ReceiptData,
  templates: ReceiptTemplates
): string => {
  const signerName = data.agency?.name || data.ownerName || "le bailleur";
  const addressParts = [data.agency?.address, data.agency?.city, data.agency?.country].filter(Boolean);
  
  return template
    .replace(/{bailleur}/g, signerName)
    .replace(/{locataire}/g, data.tenantName)
    .replace(/{montant}/g, `${data.amount.toLocaleString("fr-FR")} ${templates.currency}`)
    .replace(/{periode}/g, data.period)
    .replace(/{bien}/g, data.propertyTitle)
    .replace(/{agence}/g, data.agency?.name || signerName)
    .replace(/{telephone}/g, data.agency?.phone || "")
    .replace(/{email}/g, data.agency?.email || "")
    .replace(/{adresse}/g, addressParts.join(", "));
};

const createReceiptDocument = async (data: ReceiptData, templateOverride?: ReceiptTemplates): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const templates = templateOverride || getReceiptTemplates();
  
  // Colors
  const primaryColor: [number, number, number] = [26, 54, 93]; // Navy
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, "F");
  
  let headerYOffset = 0;
  
  // Agency logo and info
  if (data.agency) {
    // Try to load and add logo
    if (templates.showLogo && data.agency.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(data.agency.logo_url);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 15, 8, 20, 20);
          headerYOffset = 25;
        }
      } catch (e) {
        // Logo loading failed, continue without it
      }
    }
    
    // Agency name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.agency.name, headerYOffset > 0 ? 40 : 15, 15);
    
    // Agency contact info
    if (templates.showAgencyContact) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      let contactY = 22;
      
      if (data.agency.phone) {
        doc.text(`Tél: ${data.agency.phone}`, headerYOffset > 0 ? 40 : 15, contactY);
        contactY += 5;
      }
      if (data.agency.email) {
        doc.text(data.agency.email, headerYOffset > 0 ? 40 : 15, contactY);
        contactY += 5;
      }
      if (data.agency.address || data.agency.city) {
        const addressParts = [data.agency.address, data.agency.city, data.agency.country].filter(Boolean);
        const fullAddress = addressParts.join(", ");
        if (fullAddress) {
          doc.text(fullAddress, headerYOffset > 0 ? 40 : 15, contactY);
        }
      }
    }
  }
  
  // Title - positioned on the right or center
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  
  if (data.agency) {
    doc.text(templates.title, pageWidth - 15, 18, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${data.paymentId.substring(0, 8).toUpperCase()}`, pageWidth - 15, 26, { align: "right" });
  } else {
    doc.setFontSize(24);
    doc.text(templates.title, pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${data.paymentId.substring(0, 8).toUpperCase()}`, pageWidth / 2, 35, { align: "center" });
  }
  
  // Reset text color
  doc.setTextColor(...textColor);
  
  let yPos = 70;
  
  // Period box
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Période : ${data.period}`, pageWidth / 2, yPos + 12, { align: "center" });
  
  yPos += 35;
  
  // Two-column layout for Owner and Tenant
  const colWidth = (pageWidth - 40) / 2;
  
  // Owner section (left column)
  if (templates.showOwnerSection && data.ownerName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("BAILLEUR", 15, yPos);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");
    doc.text(data.ownerName, 15, yPos + 7);
  }
  
  // Tenant section (right column)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("LOCATAIRE", templates.showOwnerSection ? 15 + colWidth + 10 : 15, yPos);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.text(data.tenantName, templates.showOwnerSection ? 15 + colWidth + 10 : 15, yPos + 7);
  if (data.tenantEmail) {
    doc.setFontSize(9);
    doc.text(data.tenantEmail, templates.showOwnerSection ? 15 + colWidth + 10 : 15, yPos + 12);
  }
  
  yPos += 25;
  
  // Property section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BIEN LOUÉ", 15, yPos);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(data.propertyTitle, 15, yPos);
  if (data.propertyAddress) {
    yPos += 5;
    doc.setFontSize(9);
    doc.text(data.propertyAddress, 15, yPos);
  }
  
  yPos += 20;
  
  // Amount box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Montant du loyer reçu", pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.amount.toLocaleString("fr-FR")} ${templates.currency}`, pageWidth / 2, yPos + 26, { align: "center" });
  
  yPos += 50;
  
  // Amount in words
  if (templates.showAmountInWords) {
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const amountInWords = numberToWords(data.amount);
    doc.text(`Soit : ${amountInWords} francs CFA`, 15, yPos);
    yPos += 15;
  }
  
  // Payment details table
  if (templates.showPaymentDetails) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text("DÉTAILS DU PAIEMENT", 20, yPos + 5.5);
    
    yPos += 12;
    doc.setFont("helvetica", "normal");
    
    const details = [
      ["Date d'échéance", formatDate(data.dueDate, templates.dateFormat)],
      ["Date de paiement", formatDate(data.paidDate, templates.dateFormat)],
      ["Mode de paiement", data.method || "Non spécifié"],
    ];
    
    details.forEach(([label, value]) => {
      doc.text(label, 20, yPos);
      doc.text(value, pageWidth - 20, yPos, { align: "right" });
      yPos += 7;
    });
    
    yPos += 15;
  } else {
    yPos += 10;
  }
  
  // Declaration text
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const declarationText = replaceVariables(templates.declarationText, data, templates);
  
  const splitDeclaration = doc.splitTextToSize(declarationText, pageWidth - 30);
  doc.text(splitDeclaration, 15, yPos);
  
  yPos += splitDeclaration.length * 5 + 20;
  
  // Date and signature
  const today = new Date().toLocaleDateString("fr-FR", 
    templates.dateFormat === "long" 
      ? { day: "numeric", month: "long", year: "numeric" }
      : undefined
  );
  
  doc.setFont("helvetica", "normal");
  doc.text(`Fait le ${today}`, pageWidth - 20, yPos, { align: "right" });
  
  yPos += 15;
  doc.setFont("helvetica", "italic");
  const signatureLabel = replaceVariables(templates.signatureLabel, data, templates);
  doc.text(signatureLabel, pageWidth - 20, yPos, { align: "right" });
  
  // Watermark (rendered before footer so it's behind content)
  if (templates.watermarkEnabled) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const opacity = templates.watermarkOpacity / 100;
    
    if (templates.watermarkType === "text" && templates.watermarkText) {
      // Text watermark
      doc.saveGraphicsState();
      
      const grayValue = Math.round(200 + (55 * (1 - opacity)));
      doc.setTextColor(grayValue, grayValue, grayValue);
      doc.setFontSize(60);
      doc.setFont("helvetica", "bold");
      
      let wmX = pageWidth / 2;
      let wmY = pageHeight / 2;
      
      if (templates.watermarkPosition === "bottom-right") {
        wmX = pageWidth - 50;
        wmY = pageHeight - 50;
      }
      
      if (templates.watermarkPosition === "diagonal") {
        doc.setFontSize(40);
        for (let i = -2; i < 4; i++) {
          for (let j = -2; j < 4; j++) {
            const x = (pageWidth / 3) * i + 30;
            const y = (pageHeight / 4) * j + 60;
            if (x > -50 && x < pageWidth + 50 && y > -50 && y < pageHeight + 50) {
              doc.text(templates.watermarkText, x, y, { align: "center" });
            }
          }
        }
      } else {
        doc.text(templates.watermarkText, wmX, wmY, { align: "center" });
      }
      
      doc.restoreGraphicsState();
    } else if (templates.watermarkType === "agency_logo" && data.agency?.logo_url) {
      // Agency logo watermark
      try {
        const logoBase64 = await loadImageAsBase64(data.agency.logo_url);
        if (logoBase64) {
          doc.saveGraphicsState();
          
          // Calculate size and position
          const logoSize = 60;
          let logoX = (pageWidth - logoSize) / 2;
          let logoY = (pageHeight - logoSize) / 2;
          
          if (templates.watermarkPosition === "bottom-right") {
            logoX = pageWidth - logoSize - 20;
            logoY = pageHeight - logoSize - 40;
          } else if (templates.watermarkPosition === "diagonal") {
            // For diagonal, place multiple logos
            const smallLogoSize = 40;
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 4; j++) {
                const x = (pageWidth / 3) * i + 20;
                const y = (pageHeight / 4) * j + 40;
                if (x > 0 && x < pageWidth - smallLogoSize && y > 0 && y < pageHeight - smallLogoSize) {
                  doc.setGState(new (doc as any).GState({ opacity: opacity }));
                  doc.addImage(logoBase64, 'PNG', x, y, smallLogoSize, smallLogoSize);
                }
              }
            }
            doc.restoreGraphicsState();
            // Skip the single logo rendering below
          }
          
          if (templates.watermarkPosition !== "diagonal") {
            doc.setGState(new (doc as any).GState({ opacity: opacity }));
            doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
            doc.restoreGraphicsState();
          }
        }
      } catch (e) {
        console.error("Failed to load agency logo for watermark:", e);
      }
    } else if (templates.watermarkType === "image" && templates.watermarkImageUrl) {
      // Custom image watermark
      try {
        const imageBase64 = await loadImageAsBase64(templates.watermarkImageUrl);
        if (imageBase64) {
          doc.saveGraphicsState();
          
          const imageSize = 60;
          let imgX = (pageWidth - imageSize) / 2;
          let imgY = (pageHeight - imageSize) / 2;
          
          if (templates.watermarkPosition === "bottom-right") {
            imgX = pageWidth - imageSize - 20;
            imgY = pageHeight - imageSize - 40;
          }
          
          doc.setGState(new (doc as any).GState({ opacity: opacity }));
          doc.addImage(imageBase64, 'PNG', imgX, imgY, imageSize, imageSize);
          doc.restoreGraphicsState();
        }
      } catch (e) {
        console.error("Failed to load watermark image:", e);
      }
    }
  }
  
  // Footer with agency info
  doc.setFillColor(...lightGray);
  doc.rect(0, doc.internal.pageSize.getHeight() - 25, pageWidth, 25, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  
  if (data.agency) {
    const footerText = replaceVariables(templates.footerText, data, templates);
    doc.text(
      footerText,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: "center" }
    );
    if (templates.showAgencyContact) {
      const contactLine = [data.agency.phone, data.agency.email].filter(Boolean).join(" | ");
      if (contactLine) {
        doc.text(
          contactLine,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }
    }
  } else {
    doc.text(
      "Ce document est une quittance de loyer générée automatiquement.",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  return doc;
};

export const generateRentReceipt = async (data: ReceiptData): Promise<void> => {
  const doc = await createReceiptDocument(data);
  const fileName = `quittance_${data.tenantName.replace(/\s+/g, "_")}_${data.period.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};

export const generateRentReceiptBase64 = async (data: ReceiptData): Promise<string> => {
  const doc = await createReceiptDocument(data);
  return doc.output("datauristring").split(",")[1];
};

export const generateRentReceiptBase64WithTemplate = async (data: ReceiptDataWithTemplate): Promise<string> => {
  const { template, ...receiptData } = data;
  const legacyTemplate = template ? convertDbTemplateToLegacy(template) : undefined;
  const doc = await createReceiptDocument(receiptData, legacyTemplate);
  return doc.output("datauristring").split(",")[1];
};

export const getPaymentPeriod = (dueDate: string): string => {
  const date = new Date(dueDate);
  const month = date.toLocaleDateString("fr-FR", { month: "long" });
  const year = date.getFullYear();
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
};
