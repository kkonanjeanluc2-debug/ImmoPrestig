import { createPDFDocument, PDF_FONT } from "@/lib/pdfFont";
import { replaceManagementContractVariables } from "@/lib/managementContractDefaults";

interface ManagementContractPDFData {
  templateContent: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownerBirthDate?: string;
  ownerBirthPlace?: string;
  ownerProfession?: string;
  ownerCniNumber?: string;
  agencyName: string;
  agencyEmail?: string;
  agencyPhone?: string;
  agencyAddress?: string;
  agencyCity?: string;
  managementTypeName?: string;
  commissionPercentage?: number;
  logoUrl?: string | null;
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

export async function generateManagementContractPDF(data: ManagementContractPDFData): Promise<void> {
  const doc = createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Load logo
  let logoBase64: string | null = null;
  if (data.logoUrl) {
    logoBase64 = await loadImageAsBase64(data.logoUrl);
  }

  // Header with logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, y, 25, 25);
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(14);
      doc.text(data.agencyName, margin + 30, y + 10);
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(9);
      if (data.agencyAddress) doc.text(data.agencyAddress + (data.agencyCity ? `, ${data.agencyCity}` : ""), margin + 30, y + 16);
      if (data.agencyPhone || data.agencyEmail) {
        doc.text([data.agencyPhone, data.agencyEmail].filter(Boolean).join(" | "), margin + 30, y + 21);
      }
      y += 30;
    } catch {
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(14);
      doc.text(data.agencyName, margin, y + 10);
      y += 15;
    }
  } else {
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(14);
    doc.text(data.agencyName, pageWidth / 2, y + 8, { align: "center" });
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(9);
    if (data.agencyAddress) doc.text(data.agencyAddress + (data.agencyCity ? `, ${data.agencyCity}` : ""), pageWidth / 2, y + 14, { align: "center" });
    if (data.agencyPhone || data.agencyEmail) {
      doc.text([data.agencyPhone, data.agencyEmail].filter(Boolean).join(" | "), pageWidth / 2, y + 19, { align: "center" });
    }
    y += 25;
  }

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Replace variables in content
  const finalContent = replaceManagementContractVariables(data.templateContent, {
    ownerName: data.ownerName,
    ownerEmail: data.ownerEmail,
    ownerPhone: data.ownerPhone,
    ownerAddress: data.ownerAddress,
    ownerBirthDate: data.ownerBirthDate,
    ownerBirthPlace: data.ownerBirthPlace,
    ownerProfession: data.ownerProfession,
    ownerCniNumber: data.ownerCniNumber,
    agencyName: data.agencyName,
    agencyEmail: data.agencyEmail,
    agencyPhone: data.agencyPhone,
    agencyAddress: data.agencyAddress,
    agencyCity: data.agencyCity,
    managementTypeName: data.managementTypeName,
    commissionPercentage: data.commissionPercentage,
  });

  // Render content
  const lines = finalContent.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }

    if (trimmed.startsWith("# ")) {
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(14);
      const titleLines = doc.splitTextToSize(trimmed.substring(2), contentWidth);
      doc.text(titleLines, pageWidth / 2, y, { align: "center" });
      y += titleLines.length * 7 + 4;
    } else if (trimmed.startsWith("## ")) {
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(trimmed.substring(3), contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 5.5 + 3;
    } else if (trimmed.startsWith("### ")) {
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(10);
      const titleLines = doc.splitTextToSize(trimmed.substring(4), contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 5 + 2;
    } else if (trimmed === "") {
      y += 3;
    } else if (trimmed.startsWith("- ")) {
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(9);
      const bulletText = trimmed.substring(2);
      const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 8);
      doc.text("•", margin + 2, y);
      doc.text(bulletLines, margin + 8, y);
      y += bulletLines.length * 4.5 + 1;
    } else {
      // Handle bold markers **text**
      doc.setFontSize(9);
      if (trimmed.includes("**")) {
        doc.setFont(PDF_FONT, "bold");
        const cleanText = trimmed.replace(/\*\*/g, "");
        const textLines = doc.splitTextToSize(cleanText, contentWidth);
        doc.text(textLines, margin, y);
        y += textLines.length * 4.5 + 1;
      } else {
        doc.setFont(PDF_FONT, "normal");
        const textLines = doc.splitTextToSize(trimmed, contentWidth);
        doc.text(textLines, margin, y);
        y += textLines.length * 4.5 + 1;
      }
    }
  }

  // Signature area
  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const colWidth = (contentWidth - 10) / 2;
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(10);
  doc.text("Le Mandant", margin + colWidth / 2, y, { align: "center" });
  doc.text("Le Mandataire", margin + colWidth + 10 + colWidth / 2, y, { align: "center" });

  y += 5;
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(8);
  doc.text('Signature précédée de "Lu et approuvé"', margin + colWidth / 2, y, { align: "center" });
  doc.text('Signature précédée de "Lu et approuvé"', margin + colWidth + 10 + colWidth / 2, y, { align: "center" });

  y += 20;
  doc.setDrawColor(180, 180, 180);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, y, margin + colWidth, y);
  doc.line(margin + colWidth + 10, y, pageWidth - margin, y);

  doc.save(`contrat_gestion_${data.ownerName.replace(/\s+/g, "_")}.pdf`);
}
