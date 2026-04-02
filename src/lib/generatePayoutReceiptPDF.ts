import jsPDF from "jspdf";
import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, addPDFFooter, PDFAgencyInfo } from "@/lib/pdfHeader";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

export interface PayoutReceiptData {
  ownerName: string;
  amount: number;
  payoutDate: string;
  payoutMonth: number;
  payoutYear: number;
  paymentMethod: string;
  recipientPhone?: string | null;
  notes?: string | null;
}

const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const getPaymentMethodLabel = (method: string): string => {
  const map: Record<string, string> = {
    especes: "Espèces",
    orange_money: "Orange Money",
    mtn_money: "MTN Mobile Money",
    moov: "Moov Money",
    card: "Carte bancaire",
    virement: "Virement bancaire",
    cheque: "Chèque",
  };
  return map[method] || method;
};

export const generatePayoutReceiptPDF = async (
  data: PayoutReceiptData,
  agency?: PDFAgencyInfo | null
) => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header
  const periodLabel = `${FRENCH_MONTHS[data.payoutMonth - 1]} ${data.payoutYear}`;
  let y = await addPDFHeader(doc, agency, "REÇU DE REVERSEMENT", periodLabel);

  y += 5;

  // Date
  const formattedDate = new Date(data.payoutDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Fait le ${formattedDate}`, pageWidth - margin, y, { align: "right" });
  y += 12;

  // Info box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 50, 3, 3, "FD");

  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  // Propriétaire
  doc.setFont("helvetica", "normal");
  doc.text("Bénéficiaire :", margin + 8, y);
  doc.setFont("helvetica", "bold");
  doc.text(data.ownerName, margin + 45, y);
  y += 10;

  // Période
  doc.setFont("helvetica", "normal");
  doc.text("Période :", margin + 8, y);
  doc.setFont("helvetica", "bold");
  doc.text(periodLabel, margin + 45, y);
  y += 10;

  // Mode de paiement
  doc.setFont("helvetica", "normal");
  doc.text("Mode :", margin + 8, y);
  doc.setFont("helvetica", "bold");
  doc.text(getPaymentMethodLabel(data.paymentMethod), margin + 45, y);

  if (data.recipientPhone) {
    doc.setFont("helvetica", "normal");
    doc.text(`(${data.recipientPhone})`, margin + 45 + doc.getTextWidth(getPaymentMethodLabel(data.paymentMethod)) + 3, y);
  }
  y += 10;

  // Date de reversement
  doc.setFont("helvetica", "normal");
  doc.text("Date :", margin + 8, y);
  doc.setFont("helvetica", "bold");
  doc.text(formattedDate, margin + 45, y);

  y += 20;

  // Amount box
  doc.setFillColor(26, 54, 93);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Montant reversé", pageWidth / 2, y + 12, { align: "center" });

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(data.amount), pageWidth / 2, y + 26, { align: "center" });

  y += 45;

  // Amount in words
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  const amountWords = numberToWordsPDF(Math.floor(data.amount));
  doc.text(
    `Arrêté le présent reçu à la somme de : ${amountWords} francs CFA`,
    pageWidth / 2,
    y,
    { align: "center", maxWidth: contentWidth }
  );

  y += 15;

  // Notes
  if (data.notes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Observations :", margin, y);
    y += 6;
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth - 10);
    doc.text(noteLines, margin + 5, y);
    y += noteLines.length * 5 + 10;
  }

  // Signature area
  y = Math.max(y, 200);
  doc.setDrawColor(200, 200, 200);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(pageWidth - margin - 70, y + 20, pageWidth - margin, y + 20);
  doc.setLineDashPattern([], 0);

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text("Signature et cachet", pageWidth - margin - 35, y + 26, { align: "center" });

  // Footer
  addPDFFooter(doc, agency, "Reçu de reversement");

  // Download
  const filename = `Recu_reversement_${data.ownerName.replace(/\s+/g, "_")}_${FRENCH_MONTHS[data.payoutMonth - 1]}_${data.payoutYear}.pdf`;
  doc.save(filename);
};
