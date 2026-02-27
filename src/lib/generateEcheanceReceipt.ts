import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

interface EcheanceReceiptData {
  echeanceId: string;
  propertyTitle: string;
  propertyAddress?: string;
  amount: number;
  paidDate: string;
  dueDate: string;
  paymentMethod: string;
  vendeurName?: string;
  totalSalePrice: number;
  echeanceNumber?: number;
  totalEcheances?: number;
  agencyName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyAddress?: string;
  agencyLogoUrl?: string | null;
  validatedBy?: string;
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

export const generateEcheanceReceipt = async (data: EcheanceReceiptData): Promise<void> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();

  const primaryColor: [number, number, number] = [26, 54, 93];
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, "F");

  let headerX = 15;

  if (data.agencyLogoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(data.agencyLogoUrl);
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 15, 8, 20, 20);
        headerX = 40;
      }
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.agencyName || "Recu de paiement", headerX, 15);

  if (data.agencyPhone || data.agencyEmail) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    let cy = 22;
    if (data.agencyPhone) { doc.text(`Tel: ${data.agencyPhone}`, headerX, cy); cy += 5; }
    if (data.agencyEmail) { doc.text(data.agencyEmail, headerX, cy); cy += 5; }
    if (data.agencyAddress) { doc.text(data.agencyAddress, headerX, cy); }
  }

  // Title right
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RECU DE PAIEMENT", pageWidth - 15, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${data.echeanceId.substring(0, 8).toUpperCase()}`, pageWidth - 15, 26, { align: "right" });

  if (data.echeanceNumber && data.totalEcheances) {
    doc.text(`Echeance ${data.echeanceNumber} / ${data.totalEcheances}`, pageWidth - 15, 33, { align: "right" });
  }

  doc.setTextColor(...textColor);
  let yPos = 70;

  // Property info
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.propertyTitle, pageWidth / 2, yPos + 12, { align: "center" });
  yPos += 30;

  if (data.propertyAddress) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(data.propertyAddress, 15, yPos);
    yPos += 10;
  }

  // Vendor
  if (data.vendeurName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("VENDEUR", 15, yPos);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");
    doc.text(data.vendeurName, 15, yPos + 7);
    yPos += 20;
  }

  // Amount box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Montant paye", pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(data.amount), pageWidth / 2, yPos + 26, { align: "center", charSpace: 0.5 });
  yPos += 45;

  // Amount in words
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Soit : ${numberToWordsPDF(data.amount)} francs CFA`, 15, yPos);
  yPos += 15;

  // Payment details table
  doc.setFillColor(...lightGray);
  doc.rect(15, yPos, pageWidth - 30, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.text("DETAILS DU PAIEMENT", 20, yPos + 5.5);
  yPos += 12;

  doc.setFont("helvetica", "normal");
  const paidDateFormatted = new Date(data.paidDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dueDateFormatted = new Date(data.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const details: [string, string][] = [
    ["Prix total du bien", formatAmountWithCurrency(data.totalSalePrice)],
    ["Date d'echeance", dueDateFormatted],
    ["Date de paiement", paidDateFormatted],
    ["Mode de paiement", data.paymentMethod || "Non specifie"],
  ];
  if (data.validatedBy) {
    details.push(["Valide par", data.validatedBy]);
  }

  details.forEach(([label, value]) => {
    doc.text(label, 20, yPos);
    doc.text(value, pageWidth - 20, yPos, { align: "right" });
    yPos += 7;
  });

  yPos += 20;

  // Declaration
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const validatorText = data.validatedBy ? `, valide par ${data.validatedBy}` : "";
  const declaration = `Le soussigne reconnait avoir recu la somme de ${formatAmountWithCurrency(data.amount)} au titre du paiement de l'echeance du ${dueDateFormatted} pour le bien "${data.propertyTitle}"${validatorText}.`;
  const splitDecl = doc.splitTextToSize(declaration, pageWidth - 30);
  doc.text(splitDecl, 15, yPos, { lineHeightFactor: 1.5 });
  yPos += splitDecl.length * 5 + 20;

  // Date and signature
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.text(`Fait le ${today}`, pageWidth - 20, yPos, { align: "right" });
  yPos += 15;
  doc.setFont("helvetica", "italic");
  doc.text(data.validatedBy || "Signature", pageWidth - 20, yPos, { align: "right" });

  // Footer
  doc.setFillColor(...lightGray);
  doc.rect(0, doc.internal.pageSize.getHeight() - 25, pageWidth, 25, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  doc.text(
    "Ce document est un recu de paiement genere automatiquement.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  const fileName = `recu_echeance_${data.propertyTitle.replace(/\s+/g, "_")}_${data.echeanceId.substring(0, 8)}.pdf`;
  doc.save(fileName);
};
