import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";
import type { BienAchat } from "@/hooks/useBiensAchat";
import type { OffreAchat } from "@/hooks/useOffresAchat";
import type { AchatImmobilier } from "@/hooks/useAchatsImmobiliers";

interface AgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

const STATUS_LABELS: Record<string, string> = {
  prospection: "Prospection",
  en_negociation: "En négociation",
  offre_faite: "Offre faite",
  sous_compromis: "Sous compromis",
  achete: "Acheté",
  abandonne: "Abandonné",
};

const OFFRE_STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
  contre_offre: "Contre-offre",
  expiree: "Expirée",
};

// Helper to check page break
function checkPageBreak(doc: any, y: number, needed: number = 30): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

/**
 * Fiche récapitulative du bien
 */
export async function generateFicheRecapBien(
  bien: BienAchat,
  offres: OffreAchat[],
  achat: AchatImmobilier | null,
  agency?: AgencyInfo | null
) {
  const doc = await createPDFDocument();
  let y = 15;

  // Header
  if (agency) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(agency.name, 14, y);
    y += 5;
    if (agency.address) { doc.text(agency.address, 14, y); y += 4; }
    if (agency.phone) { doc.text(`Tél: ${agency.phone}`, 14, y); y += 4; }
    if (agency.email) { doc.text(agency.email, 14, y); y += 4; }
    y += 4;
  }

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FICHE RÉCAPITULATIVE", 105, y, { align: "center" });
  y += 10;

  // Bien info
  doc.setFontSize(12);
  doc.text(bien.title, 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const info = [
    ["Type de bien", bien.property_type],
    ["Adresse", `${bien.address}${bien.city ? `, ${bien.city}` : ""}`],
    ["Prix demandé", formatAmountWithCurrency(bien.price)],
    ["Statut", STATUS_LABELS[bien.status] || bien.status],
    ["Superficie", bien.area ? `${bien.area} m²` : "Non renseignée"],
    ["Chambres", bien.bedrooms ? String(bien.bedrooms) : "-"],
    ["Salles de bain", bien.bathrooms ? String(bien.bathrooms) : "-"],
    ["Vendeur", bien.vendeurs?.name || "Non renseigné"],
  ];

  for (const [label, value] of info) {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 65, y);
    y += 6;
  }

  if (bien.description) {
    y += 4;
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.text("Description :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(bien.description, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5;
  }

  // Offres section
  const bienOffres = offres.filter((o) => o.bien_id === bien.id);
  if (bienOffres.length > 0) {
    y += 8;
    y = checkPageBreak(doc, y, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("HISTORIQUE DES OFFRES", 14, y);
    y += 8;

    doc.setFontSize(10);
    for (const offre of bienOffres) {
      y = checkPageBreak(doc, y, 25);
      doc.setFont("helvetica", "bold");
      doc.text(`Offre du ${new Date(offre.offer_date).toLocaleDateString("fr-FR")}`, 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Montant : ${formatAmountWithCurrency(offre.offer_amount)}`, 20, y);
      y += 5;
      doc.text(`Statut : ${OFFRE_STATUS_LABELS[offre.status] || offre.status}`, 20, y);
      y += 5;
      if (offre.counter_amount) {
        doc.text(`Contre-offre : ${formatAmountWithCurrency(offre.counter_amount)}`, 20, y);
        y += 5;
      }
      if (offre.conditions) {
        doc.text(`Conditions : ${offre.conditions}`, 20, y);
        y += 5;
      }
      y += 3;
    }
  }

  // Achat section
  if (achat) {
    y += 6;
    y = checkPageBreak(doc, y, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DÉTAILS DE L'ACHAT", 14, y);
    y += 8;

    doc.setFontSize(10);
    const achatInfo = [
      ["Prix d'achat", formatAmountWithCurrency(achat.sale_price)],
      ["Date d'achat", new Date(achat.sale_date).toLocaleDateString("fr-FR")],
      ["Type de paiement", achat.payment_type === "comptant" ? "Comptant" : "Échelonné"],
      ...(achat.down_payment ? [["Acompte", formatAmountWithCurrency(achat.down_payment)]] : []),
      ...(achat.notary_fees ? [["Frais de notaire", formatAmountWithCurrency(achat.notary_fees)]] : []),
      ...(achat.agency_fees ? [["Frais d'agence", formatAmountWithCurrency(achat.agency_fees)]] : []),
      ...(achat.total_installments ? [["Nombre d'échéances", String(achat.total_installments)]] : []),
    ];

    for (const [label, value] of achatInfo) {
      y = checkPageBreak(doc, y);
      doc.setFont("helvetica", "bold");
      doc.text(`${label} :`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), 75, y);
      y += 6;
    }

    if (achat.notes) {
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Notes :", 20, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(achat.notes, 170);
      doc.text(noteLines, 20, y);
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Généré le ${new Date().toLocaleDateString("fr-FR")} - Page ${i}/${pageCount}`,
      105, 290, { align: "center" }
    );
  }

  doc.save(`Fiche_${bien.title.replace(/\s+/g, "_")}.pdf`);
}

/**
 * Offre d'achat formelle
 */
export async function generateOffreAchatPDF(
  offre: OffreAchat,
  bien: BienAchat,
  vendeurName: string,
  agency?: AgencyInfo | null
) {
  const doc = await createPDFDocument();
  let y = 15;

  // Header agency
  if (agency) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(agency.name, 14, y);
    y += 5;
    if (agency.address) { doc.text(agency.address, 14, y); y += 4; }
    if (agency.phone) { doc.text(`Tél: ${agency.phone}`, 14, y); y += 4; }
    if (agency.email) { doc.text(agency.email, 14, y); y += 4; }
    y += 6;
  }

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait le ${new Date(offre.offer_date).toLocaleDateString("fr-FR")}`, 196, y, { align: "right" });
  y += 10;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("OFFRE D'ACHAT", 105, y, { align: "center" });
  y += 12;

  // Body
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const bodyLines = [
    `À l'attention de : ${vendeurName}`,
    "",
    `Nous avons l'honneur de vous soumettre notre offre d'achat pour le bien immobilier`,
    `suivant :`,
    "",
    `Désignation : ${bien.title}`,
    `Type : ${bien.property_type}`,
    `Adresse : ${bien.address}${bien.city ? `, ${bien.city}` : ""}`,
    ...(bien.area ? [`Superficie : ${bien.area} m²`] : []),
    "",
    `Prix proposé : ${formatAmountWithCurrency(offre.offer_amount)}`,
    `Soit : ${numberToWordsPDF(offre.offer_amount)} francs CFA`,
    "",
  ];

  for (const line of bodyLines) {
    doc.text(line, 14, y);
    y += 6;
  }

  if (offre.conditions) {
    doc.setFont("helvetica", "bold");
    doc.text("Conditions suspensives :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const condLines = doc.splitTextToSize(offre.conditions, 180);
    doc.text(condLines, 14, y);
    y += condLines.length * 6;
    y += 4;
  }

  if (offre.expiry_date) {
    doc.text(
      `Cette offre est valable jusqu'au ${new Date(offre.expiry_date).toLocaleDateString("fr-FR")}.`,
      14, y
    );
    y += 10;
  }

  // Signature area
  y += 10;
  y = checkPageBreak(doc, y, 40);
  doc.text("Dans l'attente de votre réponse, veuillez agréer nos salutations distinguées.", 14, y);
  y += 15;

  doc.setFont("helvetica", "bold");
  doc.text("L'Acquéreur", 14, y);
  doc.text("Le Vendeur", 130, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Signature :", 14, y);
  doc.text("Signature :", 130, y);

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 105, 290, { align: "center" });

  doc.save(`Offre_Achat_${bien.title.replace(/\s+/g, "_")}.pdf`);
}

/**
 * Dossier d'achat complet
 */
export async function generateDossierAchatPDF(
  bien: BienAchat,
  offres: OffreAchat[],
  achat: AchatImmobilier,
  echeances: Array<{ due_date: string; amount: number; status: string; paid_date?: string | null }>,
  agency?: AgencyInfo | null
) {
  const doc = await createPDFDocument();
  let y = 15;

  // Header
  if (agency) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(agency.name, 14, y);
    y += 5;
    if (agency.address) { doc.text(agency.address, 14, y); y += 4; }
    if (agency.phone) { doc.text(`Tél: ${agency.phone}`, 14, y); y += 4; }
    y += 4;
  }

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DOSSIER D'ACHAT COMPLET", 105, y, { align: "center" });
  y += 12;

  // === Section 1: Bien ===
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("1. INFORMATIONS DU BIEN", 14, y);
  y += 8;

  doc.setFontSize(10);
  const bienInfo = [
    ["Désignation", bien.title],
    ["Type", bien.property_type],
    ["Adresse", `${bien.address}${bien.city ? `, ${bien.city}` : ""}`],
    ["Prix initial", formatAmountWithCurrency(bien.price)],
    ["Superficie", bien.area ? `${bien.area} m²` : "-"],
    ["Vendeur", bien.vendeurs?.name || achat.vendeurs?.name || "-"],
  ];

  for (const [label, value] of bienInfo) {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 70, y);
    y += 6;
  }

  // === Section 2: Offres ===
  const bienOffres = offres.filter((o) => o.bien_id === bien.id);
  if (bienOffres.length > 0) {
    y += 6;
    y = checkPageBreak(doc, y, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("2. HISTORIQUE DES NÉGOCIATIONS", 14, y);
    y += 8;

    doc.setFontSize(10);
    for (const offre of bienOffres) {
      y = checkPageBreak(doc, y, 20);
      doc.setFont("helvetica", "bold");
      doc.text(`• Offre du ${new Date(offre.offer_date).toLocaleDateString("fr-FR")}`, 18, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`  Montant : ${formatAmountWithCurrency(offre.offer_amount)} - ${OFFRE_STATUS_LABELS[offre.status] || offre.status}`, 18, y);
      y += 5;
      if (offre.counter_amount) {
        doc.text(`  Contre-offre : ${formatAmountWithCurrency(offre.counter_amount)}`, 18, y);
        y += 5;
      }
      y += 2;
    }
  }

  // === Section 3: Achat ===
  y += 6;
  y = checkPageBreak(doc, y, 40);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`${bienOffres.length > 0 ? "3" : "2"}. DÉTAILS DE L'ACQUISITION`, 14, y);
  y += 8;

  doc.setFontSize(10);
  const achatDetails = [
    ["Prix d'achat", formatAmountWithCurrency(achat.sale_price)],
    ["En lettres", `${numberToWordsPDF(achat.sale_price)} francs CFA`],
    ["Date de vente", new Date(achat.sale_date).toLocaleDateString("fr-FR")],
    ["Mode de paiement", achat.payment_type === "comptant" ? "Comptant" : "Paiement échelonné"],
  ];

  if (achat.down_payment) achatDetails.push(["Acompte versé", formatAmountWithCurrency(achat.down_payment)]);
  if (achat.notary_fees) achatDetails.push(["Frais de notaire", formatAmountWithCurrency(achat.notary_fees)]);
  if (achat.agency_fees) achatDetails.push(["Frais d'agence", formatAmountWithCurrency(achat.agency_fees)]);

  const totalFrais = (achat.sale_price || 0) + (achat.notary_fees || 0) + (achat.agency_fees || 0);
  achatDetails.push(["Coût total", formatAmountWithCurrency(totalFrais)]);

  for (const [label, value] of achatDetails) {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 75, y);
    y += 6;
  }

  // === Section 4: Échéances ===
  if (echeances.length > 0) {
    y += 6;
    y = checkPageBreak(doc, y, 30);
    const sectionNum = bienOffres.length > 0 ? "4" : "3";
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${sectionNum}. ÉCHÉANCIER DE PAIEMENT`, 14, y);
    y += 8;

    doc.setFontSize(9);
    // Table header
    doc.setFont("helvetica", "bold");
    doc.text("N°", 18, y);
    doc.text("Date", 35, y);
    doc.text("Montant", 85, y);
    doc.text("Statut", 135, y);
    doc.text("Payé le", 165, y);
    y += 6;
    doc.line(18, y - 2, 196, y - 2);

    doc.setFont("helvetica", "normal");
    const statusLabels: Record<string, string> = {
      en_attente: "En attente",
      paye: "Payé",
      en_retard: "En retard",
    };

    echeances.forEach((e, i) => {
      y = checkPageBreak(doc, y, 8);
      doc.text(String(i + 1), 18, y);
      doc.text(new Date(e.due_date).toLocaleDateString("fr-FR"), 35, y);
      doc.text(formatAmountWithCurrency(e.amount), 85, y);
      doc.text(statusLabels[e.status] || e.status, 135, y);
      if (e.paid_date) doc.text(new Date(e.paid_date).toLocaleDateString("fr-FR"), 165, y);
      y += 5;
    });

    const totalPaid = echeances.filter((e) => e.status === "paye").reduce((sum, e) => sum + e.amount, 0);
    const totalRemaining = echeances.filter((e) => e.status !== "paye").reduce((sum, e) => sum + e.amount, 0);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text(`Total payé : ${formatAmountWithCurrency(totalPaid)}`, 18, y);
    y += 5;
    doc.text(`Reste à payer : ${formatAmountWithCurrency(totalRemaining)}`, 18, y);
  }

  if (achat.notes) {
    y += 10;
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVATIONS :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(achat.notes, 180);
    doc.text(noteLines, 14, y);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Dossier d'achat - ${bien.title} - Généré le ${new Date().toLocaleDateString("fr-FR")} - Page ${i}/${pageCount}`,
      105, 290, { align: "center" }
    );
  }

  doc.save(`Dossier_Achat_${bien.title.replace(/\s+/g, "_")}.pdf`);
}
