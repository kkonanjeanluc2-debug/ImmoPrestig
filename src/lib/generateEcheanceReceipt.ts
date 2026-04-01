import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

interface PartyInfo {
  name: string;
  phone?: string | null;
  address?: string | null;
  cniNumber?: string | null;
}

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
  vendeur?: PartyInfo | null;
  acquereur?: PartyInfo | null;
  previouslyPaid?: number;
  remainingAfterPayment?: number;
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

function renderPartyBlock(
  doc: any,
  title: string,
  party: PartyInfo,
  x: number,
  y: number,
  primaryColor: [number, number, number],
  textColor: [number, number, number]
): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(title, x, y);
  y += 5;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(party.name, x, y);
  y += 4.5;
  if (party.cniNumber) {
    doc.setFontSize(8);
    doc.text(`CNI : ${party.cniNumber}`, x, y);
    y += 4.5;
  }
  if (party.address) {
    doc.setFontSize(8);
    doc.text(`Adresse : ${party.address}`, x, y);
    y += 4.5;
  }
  if (party.phone) {
    doc.setFontSize(8);
    doc.text(`Tél : ${party.phone}`, x, y);
    y += 4.5;
  }
  return y;
}

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
  doc.text(data.agencyName || "Reçu de paiement", headerX, 15);

  if (data.agencyPhone || data.agencyEmail) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    let cy = 22;
    if (data.agencyPhone) { doc.text(`Tél: ${data.agencyPhone}`, headerX, cy); cy += 5; }
    if (data.agencyEmail) { doc.text(data.agencyEmail, headerX, cy); cy += 5; }
    if (data.agencyAddress) { doc.text(data.agencyAddress, headerX, cy); }
  }

  // Title right
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REÇU DE PAIEMENT", pageWidth - 15, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${data.echeanceId.substring(0, 8).toUpperCase()}`, pageWidth - 15, 26, { align: "right" });

  if (data.echeanceNumber && data.totalEcheances) {
    doc.text(`Échéance ${data.echeanceNumber} / ${data.totalEcheances}`, pageWidth - 15, 33, { align: "right" });
  }

  doc.setTextColor(...textColor);
  let yPos = 70;

  // Property info
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.propertyTitle, pageWidth / 2, yPos + 12, { align: "center" });
  yPos += 28;

  if (data.propertyAddress) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(data.propertyAddress, 15, yPos);
    yPos += 8;
  }

  // Parties section - side by side
  const vendeur = data.vendeur || (data.vendeurName ? { name: data.vendeurName } : null);
  const acquereur = data.acquereur;

  if (vendeur || acquereur) {
    const midX = pageWidth / 2 + 5;
    let leftY = yPos;
    let rightY = yPos;

    if (vendeur) {
      leftY = renderPartyBlock(doc, "VENDEUR", vendeur, 15, yPos, primaryColor, textColor);
    }
    if (acquereur) {
      rightY = renderPartyBlock(doc, "ACQUÉREUR", acquereur, midX, yPos, primaryColor, textColor);
    }

    yPos = Math.max(leftY, rightY) + 6;
  }

  // Amount box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Montant payé", pageWidth / 2, yPos + 12, { align: "center" });
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
  doc.text("DÉTAILS DU PAIEMENT", 20, yPos + 5.5);
  yPos += 12;

  doc.setFont("helvetica", "normal");
  const paidDateFormatted = new Date(data.paidDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dueDateFormatted = new Date(data.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const details: [string, string][] = [
    ["Prix total de l'échéance", formatAmountWithCurrency(data.totalSalePrice)],
    ["Montant versé", formatAmountWithCurrency(data.amount)],
    ["Date d'échéance", dueDateFormatted],
    ["Date de paiement", paidDateFormatted],
    ["Mode de paiement", data.paymentMethod || "Non spécifié"],
  ];
  if (data.previouslyPaid && data.previouslyPaid > 0) {
    details.push(["Précédemment payé", formatAmountWithCurrency(data.previouslyPaid)]);
  }
  if (data.remainingAfterPayment !== undefined && data.remainingAfterPayment > 0) {
    details.push(["Reste à payer", formatAmountWithCurrency(data.remainingAfterPayment)]);
  }
  if (data.validatedBy) {
    details.push(["Validé par", data.validatedBy]);
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
  const validatorText = data.validatedBy ? `, validé par ${data.validatedBy}` : "";
  const partialText = data.remainingAfterPayment && data.remainingAfterPayment > 0
    ? ` Il reste un solde de ${formatAmountWithCurrency(data.remainingAfterPayment)} à régler.`
    : "";
  const declaration = `Le soussigné reconnaît avoir reçu la somme de ${formatAmountWithCurrency(data.amount)} au titre du paiement de l'échéance du ${dueDateFormatted} pour le bien "${data.propertyTitle}"${validatorText}.${partialText}`;
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
    "Ce document est un reçu de paiement généré automatiquement.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  const fileName = `recu_echeance_${data.propertyTitle.replace(/\s+/g, "_")}_${data.echeanceId.substring(0, 8)}.pdf`;
  doc.save(fileName);
};
