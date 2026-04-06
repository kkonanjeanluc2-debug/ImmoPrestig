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

const FOOTER_HEIGHT = 30;
const MARGIN = 15;

export const generateApportCommissionReceipt = async (data: ApportCommissionReceiptData): Promise<void> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - FOOTER_HEIGHT - 10;

  const textColor: [number, number, number] = [51, 51, 51];
  const primaryColor: [number, number, number] = [26, 54, 93];
  const lightGray: [number, number, number] = [245, 245, 245];

  const checkPage = (needed: number, yPos: number): number => {
    if (yPos + needed > maxY) {
      addFooter();
      doc.addPage();
      return 20;
    }
    return yPos;
  };

  const addFooter = () => {
    doc.setFillColor(...lightGray);
    doc.rect(0, pageHeight - FOOTER_HEIGHT, pageWidth, FOOTER_HEIGHT, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);

    if (data.agency) {
      doc.text(`${data.agency.name} - Reçu de commission apporteur`, pageWidth / 2, pageHeight - 18, { align: "center" });
      const contactLine = [data.agency.phone, data.agency.email].filter(Boolean).join(" | ");
      if (contactLine) {
        doc.text(contactLine, pageWidth / 2, pageHeight - 10, { align: "center" });
      }
    }
  };

  let yPos = await addPDFHeader(doc, data.agency, "REÇU DE COMMISSION", "Apporteur d'affaires");
  yPos += 10;

  // Date section
  const paidDate = new Date(data.paidAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  yPos = checkPage(20, yPos);
  doc.setFillColor(...lightGray);
  doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, 18, 3, 3, "F");
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Date de paiement : ${paidDate}`, pageWidth / 2, yPos + 11, { align: "center" });
  yPos += 28;

  // Apporteur info
  const infoItems: string[] = [];
  if (data.apporteurPhone) infoItems.push(`Tél: ${data.apporteurPhone}`);
  if (data.apporteurEmail) infoItems.push(`Email: ${data.apporteurEmail}`);
  if (data.apporteurCni) infoItems.push(`CNI: ${data.apporteurCni}`);
  if (data.apporteurAddress) infoItems.push(`Adresse: ${data.apporteurAddress}`);
  const infoHeight = 10 + 6 + infoItems.length * 5 + 8;

  yPos = checkPage(infoHeight, yPos);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BÉNÉFICIAIRE (APPORTEUR D'AFFAIRES)", MARGIN, yPos);
  yPos += 7;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.text(data.apporteurName, MARGIN, yPos);
  yPos += 6;

  doc.setFontSize(9);
  for (const item of infoItems) {
    doc.text(item, MARGIN, yPos);
    yPos += 5;
  }
  yPos += 8;

  // Apport details
  let detailLines = 2; // date + taux
  if (data.tenantName) detailLines++;
  if (data.propertyTitle) detailLines++;
  if (data.description) detailLines++;
  yPos = checkPage(10 + detailLines * 6, yPos);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("DÉTAILS DE L'APPORT", MARGIN, yPos);
  yPos += 7;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const apportDate = new Date(data.apportDate).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  doc.text(`Date de l'apport : ${apportDate}`, MARGIN, yPos);
  yPos += 6;
  doc.text(`Taux de commission : ${data.commissionPercentage}%`, MARGIN, yPos);
  yPos += 6;

  if (data.tenantName) {
    doc.text(`Locataire concerné : ${data.tenantName}`, MARGIN, yPos);
    yPos += 6;
  }
  if (data.propertyTitle) {
    doc.text(`Bien concerné : ${data.propertyTitle}`, MARGIN, yPos);
    yPos += 6;
  }
  if (data.description) {
    const descLines = doc.splitTextToSize(`Description : ${data.description}`, pageWidth - MARGIN * 2);
    doc.text(descLines, MARGIN, yPos);
    yPos += descLines.length * 5;
  }
  yPos += 10;

  // Amount box
  yPos = checkPage(50, yPos);
  doc.setFillColor(...primaryColor);
  doc.roundedRect(MARGIN, yPos, pageWidth - MARGIN * 2, 35, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Montant de la commission versée", pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(data.commissionAmount), pageWidth / 2, yPos + 26, {
    align: "center", charSpace: 0.5,
  });
  yPos += 45;

  // Amount in words
  yPos = checkPage(10, yPos);
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  const wordsText = `Soit : ${numberToWordsPDF(data.commissionAmount)} francs CFA`;
  const wordsLines = doc.splitTextToSize(wordsText, pageWidth - MARGIN * 2);
  doc.text(wordsLines, MARGIN, yPos);
  yPos += wordsLines.length * 5 + 15;

  // Declaration
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const agencyName = data.agency?.name || "l'agence";
  const declaration = `Je soussigné(e) ${agencyName}, certifie avoir versé à ${data.apporteurName} la somme de ${formatAmountWithCurrency(data.commissionAmount)} au titre de sa commission d'apporteur d'affaires (${data.commissionPercentage}%)${data.propertyTitle ? ` pour le bien "${data.propertyTitle}"` : ""}${data.tenantName ? `, locataire : ${data.tenantName}` : ""}.`;
  const splitDecl = doc.splitTextToSize(declaration, pageWidth - MARGIN * 2);
  const declHeight = splitDecl.length * 6;
  yPos = checkPage(declHeight + 5, yPos);
  doc.text(splitDecl, MARGIN, yPos, { lineHeightFactor: 1.5 });
  yPos += declHeight + 20;

  // Signatures block (need ~35px)
  yPos = checkPage(35, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fait le ${paidDate}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("L'agence", 50, yPos, { align: "center" });
  doc.text("L'apporteur", pageWidth - 50, yPos, { align: "center" });
  yPos += 7;
  doc.setFont("helvetica", "italic");
  doc.text(agencyName, 50, yPos, { align: "center" });
  doc.text(data.apporteurName, pageWidth - 50, yPos, { align: "center" });

  // Footer on last page
  addFooter();

  const fileName = `recu_commission_${data.apporteurName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};
