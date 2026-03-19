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
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    const format: PdfImageAsset["format"] = blob.type.includes("png") ? "PNG" : "JPEG";

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") {
          resolve(null);
          return;
        }

        resolve({ dataUrl, format });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
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

const ensureSpace = (
  doc: jsPDF,
  yPos: number,
  requiredHeight: number,
  topMargin = 20,
  footerReserve = 32,
): number => {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (yPos + requiredHeight > pageHeight - footerReserve) {
    doc.addPage();
    return topMargin;
  }

  return yPos;
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
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, "F");
  
  let headerYOffset = 0;
  
  // Agency logo and info
  if (data.agency) {
    if (templates.showLogo && data.agency.logo_url) {
      try {
        const logoImage = await loadImageAsset(data.agency.logo_url);
        if (logoImage) {
          addImageToPdf(doc, logoImage, 15, 8, 20, 20);
          headerYOffset = 25;
        }
      } catch {
        // Continue without logo
      }
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.agency.name, headerYOffset > 0 ? 40 : 15, 15);
    
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
  
  // Title
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
  
  doc.setTextColor(...textColor);
  
  let yPos = 70;
  
  // Period box
  const periodText = data.paymentMonths && data.paymentMonths.length > 1
    ? `Périodes : ${data.paymentMonths.join(", ")}`
    : `Période : ${data.period}`;
  
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, data.paymentMonths && data.paymentMonths.length > 2 ? 28 : 20, 3, 3, "F");
  doc.setFontSize(data.paymentMonths && data.paymentMonths.length > 3 ? 10 : 12);
  doc.setFont("helvetica", "bold");
  
  const splitPeriod = doc.splitTextToSize(periodText, pageWidth - 40);
  const periodYOffset = splitPeriod.length > 1 ? 8 : 12;
  doc.text(splitPeriod, pageWidth / 2, yPos + periodYOffset, { align: "center" });
  
  yPos += (data.paymentMonths && data.paymentMonths.length > 2 ? 38 : 35);

  // Compact info row: owner / tenant / property on the same line
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

  const sectionGap = 8;
  const availableWidth = pageWidth - 30;
  const sectionWidth = (availableWidth - sectionGap * (sections.length - 1)) / sections.length;
  const sectionXStart = 15;

  doc.setFontSize(10);
  let maxSectionBottom = yPos;

  sections.forEach((section, index) => {
    const x = sectionXStart + index * (sectionWidth + sectionGap);
    let sectionY = yPos;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(section.title, x, sectionY);

    sectionY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.text(section.lines, x, sectionY, { lineHeightFactor: 1.35 });

    const sectionBottom = sectionY + Math.max(section.lines.length - 1, 0) * 4.2;
    maxSectionBottom = Math.max(maxSectionBottom, sectionBottom);
  });

  yPos = maxSectionBottom + 18;
  
  // Amount box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Montant du loyer reçu", pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  const amountText = formatAmountWithCurrency(data.amount);
  doc.text(amountText, pageWidth / 2, yPos + 26, { align: "center", charSpace: 0.5 });
  
  yPos += 50;

  // Partial payment info
  if (data.totalRentAmount && data.totalRentAmount > data.amount && data.remainingAmount !== undefined) {
    const accentColor: [number, number, number] = [220, 120, 0];
    doc.setFillColor(255, 248, 235);
    doc.roundedRect(15, yPos - 5, pageWidth - 30, data.remainingAmount > 0 ? 22 : 14, 3, 3, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...accentColor);
    doc.text(`Loyer total : ${formatAmountWithCurrency(data.totalRentAmount)}`, 20, yPos + 3);
    doc.text(`Montant recu : ${formatAmountWithCurrency(data.amount)}`, pageWidth - 20, yPos + 3, { align: "right" });
    if (data.remainingAmount > 0) {
      doc.setFont("helvetica", "bold");
      doc.text(`Reste a payer : ${formatAmountWithCurrency(data.remainingAmount)}`, 20, yPos + 12);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 139, 34);
      doc.text("Loyer integralement paye", pageWidth - 20, yPos + 3, { align: "right" });
    }
    doc.setTextColor(...textColor);
    yPos += (data.remainingAmount > 0 ? 28 : 20);
  }

  // Amount in words
  if (templates.showAmountInWords) {
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const amountInWords = numberToWordsPDF(data.amount);
    doc.text(`Soit : ${amountInWords} francs CFA`, 15, yPos);
    yPos += 15;
  }
  
  // Payment details table
  if (templates.showPaymentDetails) {
    yPos = ensureSpace(doc, yPos, 55);

    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text("DÉTAILS DU PAIEMENT", 20, yPos + 5.5);
    
    yPos += 12;
    doc.setFont("helvetica", "normal");
    
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
      yPos += 7;
    });
    
    yPos += 15;
  } else {
    yPos += 10;
  }
  
  // Declaration text
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const declarationText = replaceVariables(templates.declarationText, data, templates);
  const splitDeclaration = declarationText ? doc.splitTextToSize(declarationText, pageWidth - 30) : [];

  if (splitDeclaration.length > 0) {
    yPos = ensureSpace(doc, yPos, splitDeclaration.length * 5 + 55);
    doc.text(splitDeclaration, 15, yPos, { lineHeightFactor: 1.5 });
    yPos += splitDeclaration.length * 5 + 20;
  } else {
    yPos = ensureSpace(doc, yPos, 55);
  }
  
  // Date and signature block
  yPos = ensureSpace(doc, yPos, 60);

  const today = new Date().toLocaleDateString(
    "fr-FR",
    templates.dateFormat === "long"
      ? { day: "numeric", month: "long", year: "numeric" }
      : undefined,
  );

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(`Fait le ${today}`, pageWidth - 20, yPos, { align: "right" });

  yPos += 12;
  doc.setFont("helvetica", "italic");
  const signatureLabel = replaceVariables(templates.signatureLabel, data, templates);
  doc.text(signatureLabel, pageWidth - 20, yPos, { align: "right" });

  if (templates.stampImageUrl) {
    try {
      const stampImage = await loadImageAsset(templates.stampImageUrl);
      if (stampImage) {
        const stampSize = 36;
        const stampX = pageWidth - 20 - stampSize;
        const stampY = yPos + 4;
        addImageToPdf(doc, stampImage, stampX, stampY, stampSize, stampSize);
        yPos += stampSize + 8;
      }
    } catch (e) {
      console.error("Failed to load stamp image:", e);
    }
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
      try {
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
      } catch (e) {
        console.error("Failed to load agency logo for watermark:", e);
      }
    } else if (templates.watermarkType === "image" && templates.watermarkImageUrl) {
      try {
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