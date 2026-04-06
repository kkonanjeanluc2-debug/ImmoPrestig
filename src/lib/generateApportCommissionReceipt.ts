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

export const generateApportCommissionReceipt = async (data: ApportCommissionReceiptData): Promise<void> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();

  let yPos = await addPDFHeader(doc, data.agency, "REÇU DE COMMISSION", "Apporteur d'affaires");

  const textColor: [number, number, number] = [51, 51, 51];
  const primaryColor: [number, number, number] = [26, 54, 93];
  const lightGray: [number, number, number] = [245, 245, 245];

  yPos += 10;

  // Date section
  const paidDate = new Date(data.paidAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 18, 3, 3, "F");
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Date de paiement : ${paidDate}`, pageWidth / 2, yPos + 11, { align: "center" });

  yPos += 30;

  // Apporteur info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("BÉNÉFICIAIRE (APPORTEUR D'AFFAIRES)", 15, yPos);
  yPos += 7;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.text(data.apporteurName, 15, yPos);
  yPos += 5;

  const infoItems: string[] = [];
  if (data.apporteurPhone) infoItems.push(`Tél: ${data.apporteurPhone}`);
  if (data.apporteurEmail) infoItems.push(`Email: ${data.apporteurEmail}`);
  if (data.apporteurCni) infoItems.push(`CNI: ${data.apporteurCni}`);
  if (data.apporteurAddress) infoItems.push(`Adresse: ${data.apporteurAddress}`);

  doc.setFontSize(9);
  for (const item of infoItems) {
    doc.text(item, 15, yPos);
    yPos += 5;
  }

  yPos += 8;

  // Apport details
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("DÉTAILS DE L'APPORT", 15, yPos);
  yPos += 7;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const apportDate = new Date(data.apportDate).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  doc.text(`Date de l'apport : ${apportDate}`, 15, yPos);
  yPos += 5;
  doc.text(`Taux de commission : ${data.commissionPercentage}%`, 15, yPos);
  yPos += 5;

  if (data.tenantName) {
    doc.text(`Locataire concerné : ${data.tenantName}`, 15, yPos);
    yPos += 5;
  }
  if (data.propertyTitle) {
    doc.text(`Bien concerné : ${data.propertyTitle}`, 15, yPos);
    yPos += 5;
  }
  if (data.description) {
    doc.text(`Description : ${data.description}`, 15, yPos);
    yPos += 5;
  }

  yPos += 10;

  // Amount box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Montant de la commission versée", pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(data.commissionAmount), pageWidth / 2, yPos + 26, {
    align: "center", charSpace: 0.5,
  });

  yPos += 50;

  // Amount in words
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Soit : ${numberToWordsPDF(data.commissionAmount)} francs CFA`, 15, yPos);

  yPos += 20;

  // Declaration
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const agencyName = data.agency?.name || "l'agence";
  const declaration = `Je soussigné(e) ${agencyName}, certifie avoir versé à ${data.apporteurName} la somme de ${formatAmountWithCurrency(data.commissionAmount)} au titre de sa commission d'apporteur d'affaires (${data.commissionPercentage}%)${data.propertyTitle ? ` pour le bien "${data.propertyTitle}"` : ""}${data.tenantName ? `, locataire : ${data.tenantName}` : ""}.`;
  const splitDecl = doc.splitTextToSize(declaration, pageWidth - 30);
  doc.text(splitDecl, 15, yPos, { lineHeightFactor: 1.5 });

  yPos += splitDecl.length * 5 + 25;

  // Signatures
  doc.setFont("helvetica", "normal");
  doc.text(`Fait le ${paidDate}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Two signature columns
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("L'agence", 50, yPos, { align: "center" });
  doc.text("L'apporteur", pageWidth - 50, yPos, { align: "center" });
  yPos += 7;
  doc.setFont("helvetica", "italic");
  doc.text(agencyName, 50, yPos, { align: "center" });
  doc.text(data.apporteurName, pageWidth - 50, yPos, { align: "center" });

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...lightGray);
  doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);

  if (data.agency) {
    doc.text(`${data.agency.name} - Reçu de commission apporteur`, pageWidth / 2, pageHeight - 15, { align: "center" });
    const contactLine = [data.agency.phone, data.agency.email].filter(Boolean).join(" | ");
    if (contactLine) {
      doc.text(contactLine, pageWidth / 2, pageHeight - 8, { align: "center" });
    }
  }

  const fileName = `recu_commission_${data.apporteurName.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};
