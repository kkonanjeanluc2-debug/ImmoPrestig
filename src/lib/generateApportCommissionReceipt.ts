import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, type PDFAgencyInfo } from "@/lib/pdfHeader";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

interface ApportCommissionReceiptData {
  apporteurName: string;
  apporteurPhone?: string | null;
  apporteurEmail?: string | null;
  apporteurAddress?: string | null;
  apporteurCni?: string | null;
  commissionPercentage: number;
  commissionAmount: number;
  apportDate: string;
  paidAt: string;
  description?: string | null;
  tenantName?: string | null;
  propertyTitle?: string | null;
  agency?: PDFAgencyInfo | null;
}

const MARGIN = 15;

export const generateApportCommissionReceipt = async (data: ApportCommissionReceiptData): Promise<void> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const textColor: [number, number, number] = [51, 51, 51];
  const primaryColor: [number, number, number] = [26, 54, 93];
  const lightGray: [number, number, number] = [245, 245, 245];

  let yPos = await addPDFHeader(doc, data.agency, "REÇU DE COMMISSION", "Apporteur d'affaires");
  yPos += 8;

  // Date
  const paidDate = new Date(data.paidAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  doc.setFillColor(...lightGray);
  doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, 14, 3, 3, "F");
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Date de paiement : ${paidDate}`, pageWidth / 2, yPos + 9, { align: "center" });
  yPos += 20;

  // Apporteur info - compact two-column layout
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BÉNÉFICIAIRE", MARGIN, yPos);
  yPos += 5;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.apporteurName, MARGIN, yPos);

  const rightCol = pageWidth / 2 + 10;
  let rightY = yPos;
  if (data.apporteurPhone) {
    doc.text(`Tél: ${data.apporteurPhone}`, rightCol, rightY);
    rightY += 4;
  }
  if (data.apporteurCni) {
    doc.text(`CNI: ${data.apporteurCni}`, rightCol, rightY);
    rightY += 4;
  }

  yPos += 4;
  if (data.apporteurEmail) {
    doc.text(`Email: ${data.apporteurEmail}`, MARGIN, yPos);
    yPos += 4;
  }
  if (data.apporteurAddress) {
    doc.text(`Adresse: ${data.apporteurAddress}`, MARGIN, yPos);
    yPos += 4;
  }
  yPos = Math.max(yPos, rightY) + 6;

  // Apport details - compact
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("DÉTAILS DE L'APPORT", MARGIN, yPos);
  yPos += 5;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const apportDate = new Date(data.apportDate).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  // Two columns for details
  doc.text(`Date : ${apportDate}`, MARGIN, yPos);
  doc.text(`Taux : ${data.commissionPercentage}%`, rightCol, yPos);
  yPos += 4;

  if (data.tenantName) {
    doc.text(`Locataire : ${data.tenantName}`, MARGIN, yPos);
    yPos += 4;
  }
  if (data.propertyTitle) {
    doc.text(`Bien : ${data.propertyTitle}`, MARGIN, yPos);
    yPos += 4;
  }
  if (data.description) {
    doc.text(`Description : ${data.description}`, MARGIN, yPos);
    yPos += 4;
  }
  yPos += 6;

  // Amount box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, 30, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Montant de la commission versée", pageWidth / 2, yPos + 10, { align: "center" });
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(data.commissionAmount), pageWidth / 2, yPos + 22, {
    align: "center", charSpace: 0.5,
  });
  yPos += 36;

  // Amount in words
  doc.setTextColor(...textColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  const wordsText = `Soit : ${numberToWordsPDF(data.commissionAmount)} francs CFA`;
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - MARGIN * 2);
  doc.text(wordsLines, MARGIN, yPos);
  yPos += wordsLines.length * 4 + 8;

  // Declaration
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const agencyName = data.agency?.name || "l'agence";
  const declaration = `Je soussigné(e) ${agencyName}, certifie avoir versé à ${data.apporteurName} la somme de ${formatAmountWithCurrency(data.commissionAmount)} au titre de sa commission d'apporteur d'affaires (${data.commissionPercentage}%)${data.propertyTitle ? ` pour le bien "${data.propertyTitle}"` : ""}${data.tenantName ? `, locataire : ${data.tenantName}` : ""}.`;
  const splitDecl = doc.splitTextToSize(declaration, pageWidth - MARGIN * 2);
  doc.text(splitDecl, MARGIN, yPos, { lineHeightFactor: 1.4 });
  yPos += splitDecl.length * 4.5 + 12;

  // Signatures
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fait le ${paidDate}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("L'agence", 50, yPos, { align: "center" });
  yPos += 5;
  doc.setFont("helvetica", "italic");
  doc.text(agencyName, 50, yPos, { align: "center" });
  doc.text(data.apporteurName, pageWidth - 50, yPos, { align: "center" });

  // Footer
  doc.setFillColor(...lightGray);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  if (data.agency) {
    doc.text(`${data.agency.name} - Reçu de commission apporteur`, pageWidth / 2, pageHeight - 12, { align: "center" });
    const contactLine = [data.agency.phone, data.agency.email].filter(Boolean).join(" | ");
    if (contactLine) {
      doc.text(contactLine, pageWidth / 2, pageHeight - 6, { align: "center" });
    }
  }

  const fileName = `recu_commission_${data.apporteurName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};
