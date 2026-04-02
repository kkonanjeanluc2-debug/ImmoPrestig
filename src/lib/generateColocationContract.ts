import { createPDFDocument, PDF_FONT } from "@/lib/pdfFont";
import { numberToWordsPDF } from "@/lib/pdfFormat";

interface ColocationTenantInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  profession?: string | null;
  isPrincipal: boolean;
}

interface ColocationContractData {
  templateContent: string;
  colocataires: ColocationTenantInfo[];
  propertyTitle: string;
  propertyAddress?: string;
  unitNumber?: string;
  rentAmount: number;
  deposit?: number;
  startDate: string;
  endDate: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  agencyName: string;
  agencyEmail?: string;
  agencyPhone?: string;
  agencyAddress?: string;
  agencyCity?: string;
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

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

function replaceColocationVariables(content: string, data: ColocationContractData): string {
  const principal = data.colocataires.find(c => c.isPrincipal) || data.colocataires[0];

  const listeColocataires = data.colocataires
    .map((c, i) => {
      const lines = [`${i + 1}. **${c.name}**${c.isPrincipal ? " (Colocataire principal)" : ""}`];
      if (c.phone) lines.push(`   Téléphone : ${c.phone}`);
      if (c.email) lines.push(`   Email : ${c.email}`);
      if (c.profession) lines.push(`   Profession : ${c.profession}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const loyer = data.rentAmount.toLocaleString("fr-FR");
  const caution = (data.deposit || 0).toLocaleString("fr-FR");
  const nombreExemplaires = (data.colocataires.length + 2).toString();

  const replacements: Record<string, string> = {
    "{bailleur}": data.ownerName || "_______________",
    "{bailleur_adresse}": data.ownerAddress || "_______________",
    "{bailleur_telephone}": data.ownerPhone || "_______________",
    "{bailleur_email}": data.ownerEmail || "_______________",
    "{agence}": data.agencyName || "_______________",
    "{agence_adresse}": data.agencyAddress || "_______________",
    "{agence_telephone}": data.agencyPhone || "_______________",
    "{agence_email}": data.agencyEmail || "_______________",
    "{agence_ville}": data.agencyCity || "_______________",
    "{liste_colocataires}": listeColocataires,
    "{colocataire_principal}": principal?.name || "_______________",
    "{bien_titre}": data.propertyTitle || "_______________",
    "{bien_adresse}": data.propertyAddress || "_______________",
    "{numero_porte}": data.unitNumber || "N/A",
    "{date_debut}": formatDate(data.startDate),
    "{date_fin}": formatDate(data.endDate),
    "{loyer}": loyer,
    "{loyer_lettres}": numberToWordsPDF(data.rentAmount),
    "{caution}": caution,
    "{nombre_exemplaires}": nombreExemplaires,
    "{date_jour}": new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };

  let result = content;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}

export async function generateColocationContractPDF(data: ColocationContractData): Promise<void> {
  const doc = await createPDFDocument();
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

  // Header
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
    y += 25;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Replace variables
  const finalContent = replaceColocationVariables(data.templateContent, data);

  // Render markdown content
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
  if (y > pageHeight - 80) {
    doc.addPage();
    y = margin;
  }

  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Bailleur signature
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(10);
  doc.text("Le Bailleur", margin, y);
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(8);
  y += 5;
  doc.text('Signature précédée de "Lu et approuvé"', margin, y);
  y += 15;
  doc.setDrawColor(180, 180, 180);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, y, margin + contentWidth / 3, y);
  y += 15;

  // Colocataires signatures
  doc.setLineDashPattern([], 0);
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(10);
  doc.text("Les Colocataires", margin, y);
  y += 8;

  const colWidth = (contentWidth - 10) / 2;
  for (let i = 0; i < data.colocataires.length; i += 2) {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    const leftCol = data.colocataires[i];
    const rightCol = data.colocataires[i + 1];

    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(9);
    doc.text(leftCol.name + (leftCol.isPrincipal ? " (Principal)" : ""), margin, y);
    if (rightCol) doc.text(rightCol.name + (rightCol.isPrincipal ? " (Principal)" : ""), margin + colWidth + 10, y);

    y += 5;
    doc.setFontSize(8);
    doc.text('Signature précédée de "Lu et approuvé"', margin, y);
    if (rightCol) doc.text('Signature précédée de "Lu et approuvé"', margin + colWidth + 10, y);

    y += 12;
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, y, margin + colWidth, y);
    if (rightCol) doc.line(margin + colWidth + 10, y, pageWidth - margin, y);
    doc.setLineDashPattern([], 0);
    y += 12;
  }

  const principalName = data.colocataires.find(c => c.isPrincipal)?.name || data.colocataires[0]?.name || "colocation";
  doc.save(`contrat_colocation_${principalName.replace(/\s+/g, "_")}.pdf`);
}
