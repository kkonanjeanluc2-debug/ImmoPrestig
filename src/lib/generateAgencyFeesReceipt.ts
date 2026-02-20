import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

interface AgencyFeesReceiptData {
  tenantName: string;
  tenantEmail?: string;
  propertyTitle: string;
  propertyAddress?: string;
  amount: number;
  date: string;
  agency?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    logo_url?: string | null;
  } | null;
}

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

export const generateAgencyFeesReceipt = async (data: AgencyFeesReceiptData): Promise<void> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();

  const primaryColor: [number, number, number] = [26, 54, 93];
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, "F");

  let headerXOffset = 15;

  if (data.agency) {
    if (data.agency.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(data.agency.logo_url);
        if (logoBase64) {
          doc.addImage(logoBase64, "PNG", 15, 8, 20, 20);
          headerXOffset = 40;
        }
      } catch {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.agency.name, headerXOffset, 15);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    let contactY = 22;
    if (data.agency.phone) {
      doc.text(`Tel: ${data.agency.phone}`, headerXOffset, contactY);
      contactY += 5;
    }
    if (data.agency.email) {
      doc.text(data.agency.email, headerXOffset, contactY);
      contactY += 5;
    }
    const addressParts = [data.agency.address, data.agency.city, data.agency.country].filter(Boolean);
    if (addressParts.length) {
      doc.text(addressParts.join(", "), headerXOffset, contactY);
    }
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REÇU DE FRAIS D'AGENCE", data.agency ? pageWidth - 15 : pageWidth / 2, 18, {
    align: data.agency ? "right" : "center",
  });

  doc.setTextColor(...textColor);

  let yPos = 70;

  // Date
  const receiptDate = new Date(data.date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Date : ${receiptDate}`, pageWidth / 2, yPos + 12, { align: "center" });

  yPos += 35;

  // Tenant section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("LOCATAIRE", 15, yPos);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.text(data.tenantName, 15, yPos + 7);
  if (data.tenantEmail) {
    doc.setFontSize(9);
    doc.text(data.tenantEmail, 15, yPos + 12);
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
  doc.text("Montant des frais d'agence", pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(data.amount), pageWidth / 2, yPos + 26, {
    align: "center",
    charSpace: 0.5,
  });

  yPos += 50;

  // Amount in words
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Soit : ${numberToWordsPDF(data.amount)} francs CFA`, 15, yPos);

  yPos += 20;

  // Declaration
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const signerName = data.agency?.name || "le bailleur";
  const locationPart = data.propertyAddress ? ` situé à ${data.propertyAddress}` : "";
  const declaration = `Je soussigné(e) ${signerName}, reconnais avoir reçu de ${data.tenantName} la somme de ${formatAmountWithCurrency(data.amount)} au titre des frais d'agence pour le bien ${data.propertyTitle}${locationPart}.`;
  const splitDecl = doc.splitTextToSize(declaration, pageWidth - 30);
  doc.text(splitDecl, 15, yPos, { lineHeightFactor: 1.5 });

  yPos += splitDecl.length * 5 + 25;

  // Signature
  doc.setFont("helvetica", "normal");
  doc.text(`Fait le ${receiptDate}`, pageWidth - 20, yPos, { align: "right" });
  yPos += 15;
  doc.setFont("helvetica", "italic");
  doc.text(`Signature: ${signerName}`, pageWidth - 20, yPos, { align: "right" });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...lightGray);
  doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);

  if (data.agency) {
    doc.text(
      `${data.agency.name} - Reçu de frais d'agence`,
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" }
    );
    const contactLine = [data.agency.phone, data.agency.email].filter(Boolean).join(" | ");
    if (contactLine) {
      doc.text(contactLine, pageWidth / 2, pageHeight - 8, { align: "center" });
    }
  }

  const fileName = `frais_agence_${data.tenantName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};
