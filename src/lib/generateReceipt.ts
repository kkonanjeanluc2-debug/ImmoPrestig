import jsPDF from "jspdf";
import { createPDFDocument } from "@/lib/pdfFont";
import { getReceiptTemplates, type ReceiptTemplates } from "@/components/settings/ReceiptSettings";
import { type ReceiptTemplate } from "@/hooks/useReceiptTemplates";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

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
  receiptNumber?: string;
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
  paymentMonths?: string[];
  totalRentAmount?: number;
  remainingAmount?: number;
  unitNumber?: string;
  gestionnaireName?: string;
}

interface ReceiptDataWithTemplate extends ReceiptData {
  template?: ReceiptTemplate | null;
}

interface PdfImageAsset {
  dataUrl: string;
  format: "PNG" | "JPEG";
  naturalWidth?: number;
  naturalHeight?: number;
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
    stampImageUrl: template.stamp_image_url || null,
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

const loadImageAsset = async (url: string): Promise<PdfImageAsset | null> => {
  try {
    console.log("[Receipt PDF] Loading image from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("[Receipt PDF] Image fetch failed with status:", response.status);
      return null;
    }

    const blob = await response.blob();
    const format: PdfImageAsset["format"] = blob.type.includes("png") ? "PNG" : "JPEG";

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") {
          console.warn("[Receipt PDF] FileReader did not return a string");
          resolve(null);
          return;
        }
        console.log("[Receipt PDF] Image loaded successfully, format:", format);
        resolve({ dataUrl, format });
      };
      reader.onerror = () => {
        console.warn("[Receipt PDF] FileReader error");
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("[Receipt PDF] loadImageAsset error:", err);
    return null;
  }
};

const addImageToPdf = (
  doc: jsPDF,
  image: PdfImageAsset,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  doc.addImage(image.dataUrl, image.format, x, y, width, height);
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
    .replace(/{montant}/g, formatAmountWithCurrency(data.amount))
    .replace(/{periode}/g, data.period)
    .replace(/{bien}/g, data.propertyTitle)
    .replace(/{agence}/g, data.agency?.name || signerName)
    .replace(/{telephone}/g, data.agency?.phone || "")
    .replace(/{email}/g, data.agency?.email || "")
    .replace(/{adresse}/g, addressParts.join(", "));
};

const createReceiptDocument = async (data: ReceiptData, templateOverride?: ReceiptTemplates): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const templates = templateOverride || getReceiptTemplates();
  
  // Colors
  const primaryColor: [number, number, number] = [26, 54, 93];
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];
  
  // Compact header (reduced from 55 to 45)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  let headerXOffset = 15;
  
  // Agency logo and info
  if (data.agency) {
    if (templates.showLogo && data.agency.logo_url) {
      const logoImage = await loadImageAsset(data.agency.logo_url);
      if (logoImage) {
        addImageToPdf(doc, logoImage, 12, 6, 18, 18);
        headerXOffset = 34;
      }
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(data.agency.name, headerXOffset, 14);
    
    if (templates.showAgencyContact) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      let contactY = 20;
      const contactParts: string[] = [];
      if (data.agency.phone) contactParts.push(`Tél: ${data.agency.phone}`);
      if (data.agency.email) contactParts.push(data.agency.email);
      if (contactParts.length > 0) {
        doc.text(contactParts.join(" | "), headerXOffset, contactY);
        contactY += 5;
      }
      if (data.agency.address || data.agency.city) {
        const addressParts = [data.agency.address, data.agency.city, data.agency.country].filter(Boolean);
        const fullAddress = addressParts.join(", ");
        if (fullAddress) {
          doc.text(fullAddress, headerXOffset, contactY);
        }
      }
    }
  }
  
  // Title (right side)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  
  if (data.agency) {
    doc.setFontSize(14);
    doc.text(templates.title, pageWidth - 15, 14, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const displayNumber = data.receiptNumber || data.paymentId.substring(0, 8).toUpperCase();
    doc.text(`N° ${displayNumber}`, pageWidth - 15, 21, { align: "right" });
  } else {
    doc.setFontSize(18);
    doc.text(templates.title, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const displayNumber = data.receiptNumber || data.paymentId.substring(0, 8).toUpperCase();
    doc.text(`N° ${displayNumber}`, pageWidth / 2, 28, { align: "center" });
  }
  
  doc.setTextColor(...textColor);
  
  let yPos = 52;
  
  // Period box (compact)
  const isMultiMonth = data.paymentMonths && data.paymentMonths.length > 1;
  const monthCount = data.paymentMonths?.length || 1;
  let periodText: string;
  
  if (isMultiMonth) {
    periodText = `Loyer de ${monthCount} mois : ${data.paymentMonths!.join(", ")}`;
  } else {
    periodText = `Période : ${data.period}`;
  }
  
  doc.setFillColor(...lightGray);
  const splitPeriod = doc.splitTextToSize(periodText, pageWidth - 40);
  const periodBoxHeight = Math.max(14, splitPeriod.length * 5 + 6);
  doc.roundedRect(15, yPos, pageWidth - 30, periodBoxHeight, 2, 2, "F");
  doc.setFontSize(splitPeriod.length > 1 ? 9 : 10);
  doc.setFont("helvetica", "bold");
  const periodYCenter = yPos + (periodBoxHeight / 2) + 1;
  doc.text(splitPeriod, pageWidth / 2, splitPeriod.length > 1 ? yPos + 5 : periodYCenter, { align: "center" });
  
  yPos += periodBoxHeight + 6;

  // Compact info row: BAILLEUR / LOCATAIRE / BIEN LOUÉ on same line
  const sections = [
    templates.showOwnerSection && data.ownerName
      ? {
          title: "BAILLEUR",
          lines: doc.splitTextToSize(data.ownerName, 48),
        }
      : null,
    {
      title: "LOCATAIRE",
      lines: doc.splitTextToSize(
        [data.tenantName, data.tenantEmail].filter(Boolean).join("\n"),
        48,
      ),
    },
    {
      title: "BIEN LOUÉ",
      lines: doc.splitTextToSize(
        [
          data.propertyTitle,
          data.unitNumber ? `Porte : ${data.unitNumber}` : null,
          data.propertyAddress,
        ]
          .filter(Boolean)
          .join("\n"),
        48,
      ),
    },
  ].filter(Boolean) as Array<{ title: string; lines: string[] }>;

  const sectionGap = 6;
  const availableWidth = pageWidth - 30;
  const sectionWidth = (availableWidth - sectionGap * (sections.length - 1)) / sections.length;
  const sectionXStart = 15;

  let maxSectionBottom = yPos;

  sections.forEach((section, index) => {
    const x = sectionXStart + index * (sectionWidth + sectionGap);
    let sectionY = yPos;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.setFontSize(8);
    doc.text(section.title, x, sectionY);

    sectionY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    doc.setFontSize(8);
    doc.text(section.lines, x, sectionY, { lineHeightFactor: 1.3 });

    const sectionBottom = sectionY + Math.max(section.lines.length - 1, 0) * 3.5;
    maxSectionBottom = Math.max(maxSectionBottom, sectionBottom);
  });

  yPos = maxSectionBottom + 10;
  
  // Determine if this is a partial payment (advance)
  const isPartialPayment = data.totalRentAmount && data.totalRentAmount > data.amount && data.remainingAmount !== undefined && data.remainingAmount > 0;
  
  // Amount box
  doc.setFillColor(...primaryColor);
  const amountBoxHeight = 28;
  doc.roundedRect(15, yPos, pageWidth - 30, amountBoxHeight, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  
  if (isPartialPayment) {
    // Partial payment: "Avance sur le loyer"
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const advanceLabel = isMultiMonth
      ? `Avance sur le loyer de ${monthCount} mois`
      : `Avance sur le loyer du mois de ${data.period}`;
    doc.text(advanceLabel, pageWidth / 2, yPos + 9, { align: "center" });
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const receiptLabel = isMultiMonth
      ? `Montant du loyer reçu pour ${monthCount} mois`
      : "Montant du loyer reçu";
    doc.text(receiptLabel, pageWidth / 2, yPos + 9, { align: "center" });
  }
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const amountText = formatAmountWithCurrency(data.amount);
  doc.text(amountText, pageWidth / 2, yPos + 22, { align: "center", charSpace: 0.5 });
  
  yPos += amountBoxHeight + 4;

  // Partial payment details
  if (isPartialPayment) {
    const accentColor: [number, number, number] = [220, 120, 0];
    doc.setFillColor(255, 248, 235);
    doc.roundedRect(15, yPos, pageWidth - 30, 16, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...accentColor);
    doc.text(`Loyer total : ${formatAmountWithCurrency(data.totalRentAmount!)}`, 20, yPos + 6);
    doc.setFont("helvetica", "bold");
    doc.text(`Reste à payer : ${formatAmountWithCurrency(data.remainingAmount!)}`, pageWidth - 20, yPos + 6, { align: "right" });
    doc.setTextColor(...textColor);
    yPos += 20;
  } else if (data.totalRentAmount && data.totalRentAmount <= data.amount && data.totalRentAmount > 0) {
    // Fully paid
    doc.setFillColor(240, 255, 240);
    doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 139, 34);
    doc.text("✓ Loyer intégralement payé", pageWidth / 2, yPos + 6.5, { align: "center" });
    doc.setTextColor(...textColor);
    yPos += 14;
  }

  // Amount in words (compact)
  if (templates.showAmountInWords) {
    doc.setTextColor(...textColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const amountInWords = numberToWordsPDF(data.amount);
    doc.text(`Soit : ${amountInWords} francs CFA`, 15, yPos + 2);
    yPos += 8;
  }
  
  // Payment details table (compact)
  if (templates.showPaymentDetails) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    doc.text("DÉTAILS DU PAIEMENT", 20, yPos + 5);
    
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    const details: [string, string][] = [
      ["Date d'échéance", formatDate(data.dueDate, templates.dateFormat)],
      ["Date de paiement", formatDate(data.paidDate, templates.dateFormat)],
      ["Mode de paiement", data.method || "Non spécifié"],
    ];
    if (data.gestionnaireName) {
      details.push(["Gestionnaire", data.gestionnaireName]);
    }
    
    details.forEach(([label, value]) => {
      doc.text(label, 20, yPos);
      doc.text(value, pageWidth - 20, yPos, { align: "right" });
      yPos += 6;
    });
    
    yPos += 6;
  } else {
    yPos += 4;
  }
  
  // Declaration text (compact)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const declarationText = replaceVariables(templates.declarationText, data, templates);
  const splitDeclaration = declarationText ? doc.splitTextToSize(declarationText, pageWidth - 30) : [];

  if (splitDeclaration.length > 0) {
    doc.text(splitDeclaration, 15, yPos, { lineHeightFactor: 1.4 });
    yPos += splitDeclaration.length * 4.5 + 8;
  }
  
  // Date and signature block
  const today = new Date().toLocaleDateString(
    "fr-FR",
    templates.dateFormat === "long"
      ? { day: "numeric", month: "long", year: "numeric" }
      : undefined,
  );

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(`Fait le ${today}`, pageWidth - 20, yPos, { align: "right" });

  yPos += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  const signatureLabel = replaceVariables(templates.signatureLabel, data, templates);
  doc.text(signatureLabel, pageWidth - 20, yPos, { align: "right" });

  // Stamp image
  if (templates.stampImageUrl) {
    console.log("[Receipt PDF] Attempting to load stamp from:", templates.stampImageUrl);
    const stampImage = await loadImageAsset(templates.stampImageUrl);
    if (stampImage) {
      console.log("[Receipt PDF] Stamp loaded, adding to PDF");
      const stampSize = 32;
      const stampX = pageWidth - 20 - stampSize;
      const stampY = yPos + 3;
      addImageToPdf(doc, stampImage, stampX, stampY, stampSize, stampSize);
      yPos += stampSize + 4;
    } else {
      console.warn("[Receipt PDF] Stamp image could not be loaded");
    }
  } else {
    console.log("[Receipt PDF] No stamp URL configured. stampImageUrl:", templates.stampImageUrl);
  }
  
  // Watermark
  if (templates.watermarkEnabled) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const opacity = templates.watermarkOpacity / 100;
    
    if (templates.watermarkType === "text" && templates.watermarkText) {
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
      const logoImage = await loadImageAsset(data.agency.logo_url);
      if (logoImage) {
        doc.saveGraphicsState();
        const logoSize = 60;
        let logoX = (pageWidth - logoSize) / 2;
        let logoY = (pageHeight - logoSize) / 2;
        
        if (templates.watermarkPosition === "bottom-right") {
          logoX = pageWidth - logoSize - 20;
          logoY = pageHeight - logoSize - 40;
        } else if (templates.watermarkPosition === "diagonal") {
          const smallLogoSize = 40;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
              const x = (pageWidth / 3) * i + 20;
              const y = (pageHeight / 4) * j + 40;
              if (x > 0 && x < pageWidth - smallLogoSize && y > 0 && y < pageHeight - smallLogoSize) {
                doc.setGState(new (doc as any).GState({ opacity: opacity }));
                addImageToPdf(doc, logoImage, x, y, smallLogoSize, smallLogoSize);
              }
            }
          }
          doc.restoreGraphicsState();
        }
        
        if (templates.watermarkPosition !== "diagonal") {
          doc.setGState(new (doc as any).GState({ opacity: opacity }));
          addImageToPdf(doc, logoImage, logoX, logoY, logoSize, logoSize);
          doc.restoreGraphicsState();
        }
      }
    } else if (templates.watermarkType === "image" && templates.watermarkImageUrl) {
      const watermarkImage = await loadImageAsset(templates.watermarkImageUrl);
      if (watermarkImage) {
        doc.saveGraphicsState();
        const imageSize = 60;
        let imgX = (pageWidth - imageSize) / 2;
        let imgY = (pageHeight - imageSize) / 2;
        
        if (templates.watermarkPosition === "bottom-right") {
          imgX = pageWidth - imageSize - 20;
          imgY = pageHeight - imageSize - 40;
        }
        
        doc.setGState(new (doc as any).GState({ opacity: opacity }));
        addImageToPdf(doc, watermarkImage, imgX, imgY, imageSize, imageSize);
        doc.restoreGraphicsState();
      }
    }
  }
  
  // Footer
  doc.setFillColor(...lightGray);
  doc.rect(0, doc.internal.pageSize.getHeight() - 20, pageWidth, 20, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  
  if (data.agency) {
    const footerText = replaceVariables(templates.footerText, data, templates);
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 12, { align: "center" });
    if (templates.showAgencyContact) {
      const contactLine = [data.agency.phone, data.agency.email].filter(Boolean).join(" | ");
      if (contactLine) {
        doc.text(contactLine, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
      }
    }
  } else {
    doc.text(
      "Ce document est une quittance de loyer générée automatiquement.",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }
  
  return doc;
};

export const generateRentReceipt = async (data: ReceiptData, template?: ReceiptTemplate | null): Promise<void> => {
  const legacyTemplate = template ? convertDbTemplateToLegacy(template) : undefined;
  const doc = await createReceiptDocument(data, legacyTemplate);
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

export const getPaymentPeriodsFromMonths = (paymentMonths: string[] | null): string => {
  if (!paymentMonths || paymentMonths.length === 0) {
    return "";
  }
  if (paymentMonths.length === 1) {
    return paymentMonths[0];
  }
  return paymentMonths.join(", ");
};
