import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";
import { addPDFHeader, addPDFFooter, type PDFAgencyInfo } from "@/lib/pdfHeader";
import type { AchatImmobilier } from "@/hooks/useAchatsImmobiliers";
import type { BienAchat } from "@/hooks/useBiensAchat";

export interface AchatSignatureForPDF {
  signerType: "vendor" | "buyer";
  signerName: string;
  signatureType: "drawn" | "typed";
  signatureData?: string | null;
  signatureText?: string | null;
  signedAt: string;
}

function checkPageBreak(doc: any, y: number, needed: number = 30): number {
  if (y + needed > 260) {
    doc.addPage();
    return 20;
  }
  return y;
}

export async function generateActeAchatPDF(
  achat: AchatImmobilier,
  bien: BienAchat,
  signatures: AchatSignatureForPDF[] = [],
  agency?: PDFAgencyInfo | null,
  mode: "acte" | "compromis" = "acte"
) {
  const doc = await createPDFDocument();
  const title = mode === "acte" ? "ACTE D'ACHAT" : "COMPROMIS D'ACHAT";
  let y = await addPDFHeader(doc, agency, title);

  const pageWidth = doc.internal.pageSize.getWidth();

  // Date & lieu
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const lieu = agency?.city || "Abidjan";
  const dateStr = new Date(achat.sale_date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Fait à ${lieu}, le ${dateStr}`, pageWidth - 15, y, { align: "right" });
  y += 10;

  // Between parties
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Le Vendeur :", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const vendeurName = achat.vendeurs?.name || bien.vendeurs?.name || "-";
  doc.text(`${vendeurName}`, 20, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("L'Acquéreur :", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const acquereurName = achat.acquereurs?.name || "-";
  doc.text(`${acquereurName}`, 20, y);
  y += 12;

  // Object
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("OBJET DE LA TRANSACTION", 14, y);
  y += 8;

  doc.setFontSize(10);
  const bienDetails = [
    ["Désignation", bien.title],
    ["Type de bien", bien.property_type],
    ["Adresse", `${bien.address}${bien.city ? `, ${bien.city}` : ""}`],
    ["Superficie", bien.area ? `${bien.area} m²` : "-"],
  ];

  for (const [label, value] of bienDetails) {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 70, y);
    y += 6;
  }

  y += 6;

  // Financial conditions
  y = checkPageBreak(doc, y, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CONDITIONS FINANCIÈRES", 14, y);
  y += 8;

  doc.setFontSize(10);
  const financials = [
    ["Prix de vente", formatAmountWithCurrency(achat.sale_price)],
    ["En lettres", `${numberToWordsPDF(achat.sale_price)} francs CFA`],
    ["Mode de paiement", achat.payment_type === "comptant" ? "Comptant" : "Paiement échelonné"],
  ];

  if (achat.down_payment) financials.push(["Apport initial", formatAmountWithCurrency(achat.down_payment)]);
  if (achat.total_installments) financials.push(["Nombre d'échéances", String(achat.total_installments)]);
  if (achat.notary_fees) financials.push(["Frais de notaire", formatAmountWithCurrency(achat.notary_fees)]);
  if (achat.commission_amount) financials.push(["Commission agence", formatAmountWithCurrency(achat.commission_amount)]);

  for (const [label, value] of financials) {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 80, y);
    y += 6;
  }

  y += 8;

  // Conditions
  y = checkPageBreak(doc, y, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(mode === "acte" ? "CLAUSES ET CONDITIONS" : "CONDITIONS SUSPENSIVES", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const clauses = mode === "acte"
    ? [
        "Le vendeur déclare être le propriétaire légitime du bien décrit ci-dessus et avoir le droit de le vendre.",
        "Le bien est vendu libre de toute hypothèque, servitude ou autre charge, sauf mention contraire ci-dessus.",
        "L'acquéreur déclare avoir visité le bien et l'accepter dans son état actuel.",
        "Le transfert de propriété est effectif à compter de la signature du présent acte et du paiement intégral du prix.",
        "Les frais de notaire et d'enregistrement sont à la charge de l'acquéreur, sauf accord contraire.",
      ]
    : [
        "La présente promesse est conclue sous les conditions suspensives suivantes :",
        "- L'obtention par l'acquéreur du financement nécessaire à l'acquisition dans un délai convenu.",
        "- La remise par le vendeur de tous les documents nécessaires à la vente.",
        "- L'absence de servitude, hypothèque ou charge grevant le bien.",
        "En cas de non-réalisation de l'une des conditions, la présente promesse sera caduque de plein droit.",
      ];

  for (const clause of clauses) {
    y = checkPageBreak(doc, y, 8);
    const lines = doc.splitTextToSize(clause, 175);
    doc.text(lines, 20, y);
    y += lines.length * 4.5 + 3;
  }

  if (achat.notes) {
    y += 6;
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVATIONS :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(achat.notes, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 4;
  }

  // Signatures section
  y += 10;
  y = checkPageBreak(doc, y, 60);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SIGNATURES", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait à ${lieu}, le ${dateStr}`, 14, y);
  y += 8;

  // Vendor signature
  const vendorX = 14;
  const buyerX = pageWidth / 2 + 10;

  doc.setFont("helvetica", "bold");
  doc.text("Le Vendeur", vendorX, y);
  doc.text("L'Acquéreur", buyerX, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(vendeurName, vendorX, y);
  doc.text(acquereurName, buyerX, y);
  y += 4;

  // Render signatures
  const vendorSig = signatures.find(s => s.signerType === "vendor");
  const buyerSig = signatures.find(s => s.signerType === "buyer");

  if (vendorSig || buyerSig) {
    y += 2;
    doc.text("Lu et approuvé", vendorX, y);
    doc.text("Lu et approuvé", buyerX, y);
    y += 4;

    if (vendorSig) {
      if (vendorSig.signatureType === "drawn" && vendorSig.signatureData) {
        try {
          doc.addImage(vendorSig.signatureData, "PNG", vendorX, y, 60, 30);
        } catch {}
      } else if (vendorSig.signatureText) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "italic");
        doc.text(vendorSig.signatureText, vendorX, y + 15);
      }
      const vDate = new Date(vendorSig.signedAt);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Signé le ${vDate.toLocaleDateString("fr-FR")} à ${vDate.toLocaleTimeString("fr-FR")}`, vendorX, y + 33);
    }

    if (buyerSig) {
      if (buyerSig.signatureType === "drawn" && buyerSig.signatureData) {
        try {
          doc.addImage(buyerSig.signatureData, "PNG", buyerX, y, 60, 30);
        } catch {}
      } else if (buyerSig.signatureText) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "italic");
        doc.text(buyerSig.signatureText, buyerX, y + 15);
      }
      const bDate = new Date(buyerSig.signedAt);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Signé le ${bDate.toLocaleDateString("fr-FR")} à ${bDate.toLocaleTimeString("fr-FR")}`, buyerX, y + 33);
    }
  } else {
    y += 4;
    doc.text("Signature :", vendorX, y);
    doc.text("Signature :", buyerX, y);
  }

  const footerLabel = mode === "acte" ? "Acte d'achat" : "Compromis d'achat";
  addPDFFooter(doc, agency, `${footerLabel} - ${bien.title}`);
  doc.save(`${footerLabel.replace(/'/g, "_").replace(/\s+/g, "_")}_${bien.title.replace(/\s+/g, "_")}.pdf`);
}
