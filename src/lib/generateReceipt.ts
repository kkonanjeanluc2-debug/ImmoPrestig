import jsPDF from "jspdf";

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
}

const numberToWords = (num: number): string => {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  
  if (num === 0) return "zéro";
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) {
      return tens[t - 1] + "-" + teens[u];
    }
    return tens[t] + (u > 0 ? "-" + units[u] : "");
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const prefix = h === 1 ? "cent" : units[h] + " cent";
    return prefix + (rest > 0 ? " " + numberToWords(rest) : "");
  }
  if (num < 1000000) {
    const t = Math.floor(num / 1000);
    const rest = num % 1000;
    const prefix = t === 1 ? "mille" : numberToWords(t) + " mille";
    return prefix + (rest > 0 ? " " + numberToWords(rest) : "");
  }
  return num.toLocaleString("fr-FR");
};

const createReceiptDocument = (data: ReceiptData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [26, 54, 93]; // Navy
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");
  
  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("QUITTANCE DE LOYER", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${data.paymentId.substring(0, 8).toUpperCase()}`, pageWidth / 2, 35, { align: "center" });
  
  // Reset text color
  doc.setTextColor(...textColor);
  
  let yPos = 60;
  
  // Period box
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Période : ${data.period}`, pageWidth / 2, yPos + 12, { align: "center" });
  
  yPos += 35;
  
  // Owner section (if available)
  if (data.ownerName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("BAILLEUR", 15, yPos);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");
    yPos += 7;
    doc.text(data.ownerName, 15, yPos);
    yPos += 15;
  }
  
  // Tenant section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("LOCATAIRE", 15, yPos);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  yPos += 7;
  doc.text(data.tenantName, 15, yPos);
  if (data.tenantEmail) {
    yPos += 5;
    doc.setFontSize(9);
    doc.text(data.tenantEmail, 15, yPos);
  }
  
  // Property section
  yPos += 15;
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
  doc.text("Montant du loyer reçu", pageWidth / 2, yPos + 12, { align: "center" });
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.amount.toLocaleString("fr-FR")} F CFA`, pageWidth / 2, yPos + 26, { align: "center" });
  
  yPos += 50;
  
  // Amount in words
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  const amountInWords = numberToWords(data.amount);
  doc.text(`Soit : ${amountInWords} francs CFA`, 15, yPos);
  
  yPos += 15;
  
  // Payment details table
  doc.setFillColor(...lightGray);
  doc.rect(15, yPos, pageWidth - 30, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DÉTAILS DU PAIEMENT", 20, yPos + 5.5);
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  
  const details = [
    ["Date d'échéance", new Date(data.dueDate).toLocaleDateString("fr-FR")],
    ["Date de paiement", new Date(data.paidDate).toLocaleDateString("fr-FR")],
    ["Mode de paiement", data.method || "Non spécifié"],
  ];
  
  details.forEach(([label, value]) => {
    doc.text(label, 20, yPos);
    doc.text(value, pageWidth - 20, yPos, { align: "right" });
    yPos += 7;
  });
  
  yPos += 15;
  
  // Declaration text
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const declarationText = `Je soussigné(e), propriétaire du bien désigné ci-dessus, déclare avoir reçu de ${data.tenantName} la somme de ${data.amount.toLocaleString("fr-FR")} F CFA au titre du loyer pour la période indiquée, et lui en donne quittance, sous réserve de tous mes droits.`;
  
  const splitDeclaration = doc.splitTextToSize(declarationText, pageWidth - 30);
  doc.text(splitDeclaration, 15, yPos);
  
  yPos += splitDeclaration.length * 5 + 20;
  
  // Date and signature
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  
  doc.setFont("helvetica", "normal");
  doc.text(`Fait le ${today}`, pageWidth - 20, yPos, { align: "right" });
  
  yPos += 15;
  doc.setFont("helvetica", "italic");
  doc.text("Signature du bailleur", pageWidth - 20, yPos, { align: "right" });
  
  // Footer
  doc.setFillColor(...lightGray);
  doc.rect(0, doc.internal.pageSize.getHeight() - 20, pageWidth, 20, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  doc.text(
    "Ce document est une quittance de loyer générée automatiquement.",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );
  
  return doc;
};

export const generateRentReceipt = (data: ReceiptData): void => {
  const doc = createReceiptDocument(data);
  const fileName = `quittance_${data.tenantName.replace(/\s+/g, "_")}_${data.period.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};

export const generateRentReceiptBase64 = (data: ReceiptData): string => {
  const doc = createReceiptDocument(data);
  return doc.output("datauristring").split(",")[1];
};

export const getPaymentPeriod = (dueDate: string): string => {
  const date = new Date(dueDate);
  const month = date.toLocaleDateString("fr-FR", { month: "long" });
  const year = date.getFullYear();
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
};
