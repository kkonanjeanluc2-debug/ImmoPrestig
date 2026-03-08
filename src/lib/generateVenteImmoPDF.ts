import jsPDF from "jspdf";
import { createPDFDocument, PDF_FONT } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF, formatAmountForPDF } from "./pdfFormat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface VenteSignatureForPDF {
  signerType: "vendor" | "buyer";
  signerName: string;
  signatureType: "drawn" | "typed";
  signatureData?: string | null;
  signatureText?: string | null;
  signedAt: string;
}

interface VenteImmobiliereData {
  bien: {
    title: string;
    address: string;
    city?: string | null;
    property_type: string;
    area?: number | null;
  };
  acquereur: {
    name: string;
    address?: string | null;
    cni_number?: string | null;
    phone?: string | null;
    birth_date?: string | null;
    birth_place?: string | null;
    profession?: string | null;
  };
  sale_date: string;
  total_price: number;
  down_payment?: number | null;
  payment_type: "comptant" | "echelonne";
  monthly_payment?: number | null;
  total_installments?: number | null;
}

interface AgencyData {
  name: string;
  address?: string | null;
  phone?: string | null;
  email: string;
  siret?: string | null;
  logo_url?: string | null;
}

/**
 * Checks if we need a page break and adds one if necessary
 * Returns the new Y position
 */
const checkPageBreak = (doc: jsPDF, yPos: number, neededSpace: number = 30): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  
  if (yPos + neededSpace > pageHeight - margin) {
    doc.addPage();
    return margin + 10; // Reset to top margin with some padding
  }
  return yPos;
};

/**
 * Loads an image from a URL and returns it as a base64 data URL
 */
const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Adds agency header with logo and contact info
 */
const addAgencyHeader = async (doc: jsPDF, agency: AgencyData, yPos: number): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = yPos;

  // Try to add logo
  if (agency.logo_url) {
    try {
      const logoData = await loadImageAsBase64(agency.logo_url);
      if (logoData) {
        const logoHeight = 20;
        const logoWidth = 20;
        doc.addImage(logoData, "PNG", pageWidth / 2 - logoWidth / 2, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 5;
      }
    } catch {
      // Skip logo if loading fails
    }
  }

  // Agency name (large, centered)
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(agency.name.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
  currentY += 7;

  // Agency details (smaller, centered)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  if (agency.address) {
    doc.text(agency.address, pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
  }

  const contactParts: string[] = [];
  if (agency.phone) contactParts.push(`Tel: ${agency.phone}`);
  if (agency.email) contactParts.push(`Email: ${agency.email}`);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(" | "), pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
  }

  if (agency.siret) {
    doc.text(`RCCM: ${agency.siret}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 5;
  }

  // Separator line
  currentY += 3;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  return currentY;
};

/**
 * Generates a Promise de Vente (Sales Promise) PDF document
 */
export const generatePromesseVenteImmo = async (
  vente: VenteImmobiliereData,
  agency: AgencyData & { city?: string | null },
  validityDays: number = 90,
  signatures?: VenteSignatureForPDF[]
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = await addAgencyHeader(doc, agency, 20);

  // Document title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PROMESSE DE VENTE", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref: PV-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Parties
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS :", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Vendeur
  const vendeurLines = [
    `${agency.name}`,
    agency.address ? `Adresse : ${agency.address}` : null,
    agency.phone ? `Tel : ${agency.phone}` : null,
    `Email : ${agency.email}`,
    agency.siret ? `RCCM : ${agency.siret}` : null,
    `Ci-après dénommé "LE VENDEUR"`,
  ].filter(Boolean) as string[];

  vendeurLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.text("ET", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  // Acquereur
  const acquereurLines = [
    `${vente.acquereur.name}`,
    vente.acquereur.cni_number ? `CNI N° : ${vente.acquereur.cni_number}` : null,
    vente.acquereur.birth_date ? `Né(e) le : ${format(new Date(vente.acquereur.birth_date), "dd MMMM yyyy", { locale: fr })}` : null,
    vente.acquereur.birth_place ? `À : ${vente.acquereur.birth_place}` : null,
    vente.acquereur.profession ? `Profession : ${vente.acquereur.profession}` : null,
    vente.acquereur.address ? `Domicilié(e) à : ${vente.acquereur.address}` : null,
    vente.acquereur.phone ? `Tél : ${vente.acquereur.phone}` : null,
    `Ci-après dénommé "L'ACQUÉREUR"`,
  ].filter(Boolean) as string[];

  acquereurLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Article 1 - Object
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 1 - OBJET", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const objetText = `Le Vendeur s'engage à vendre à l'Acquéreur, qui accepte, le bien immobilier suivant :`;
  doc.text(objetText, margin, yPos);
  yPos += 8;

  const bienLines = [
    `- Désignation : ${vente.bien.title}`,
    `- Type : ${vente.bien.property_type.charAt(0).toUpperCase() + vente.bien.property_type.slice(1)}`,
    `- Adresse : ${vente.bien.address}${vente.bien.city ? `, ${vente.bien.city}` : ""}`,
    vente.bien.area ? `- Superficie : ${vente.bien.area} m²` : null,
  ].filter(Boolean) as string[];

  bienLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 8;

  // Article 2 - Prix
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 2 - PRIX", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const prixText = `Le prix de vente est fixé à la somme de ${formatAmountWithCurrency(vente.total_price)} (${numberToWordsPDF(vente.total_price)} francs CFA).`;
  const prixLines = doc.splitTextToSize(prixText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, prixLines.length * 6 + 10);
  doc.text(prixLines, margin, yPos);
  yPos += prixLines.length * 6 + 5;

  // Article 3 - Modalites
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3 - MODALITÉS DE PAIEMENT", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  if (vente.payment_type === "comptant") {
    doc.text("Le paiement sera effectué au comptant lors de la signature de l'acte de vente.", margin, yPos);
    yPos += 6;
  } else {
    const acompte = vente.down_payment || 0;
    const modalitesLines = [
      `- Acompte versé ce jour : ${formatAmountWithCurrency(acompte)}`,
      `- Solde : ${formatAmountWithCurrency(vente.total_price - acompte)}`,
      vente.monthly_payment ? `- Mensualité : ${formatAmountWithCurrency(vente.monthly_payment)}` : null,
      vente.total_installments ? `- Nombre d'échéances : ${vente.total_installments}` : null,
    ].filter(Boolean) as string[];

    modalitesLines.forEach((line) => {
      yPos = checkPageBreak(doc, yPos, 10);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  }
  yPos += 8;

  // Article 4 - Validite
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 4 - DURÉE DE VALIDITÉ", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const dateSignature = new Date(vente.sale_date);
  const dateExpiration = new Date(dateSignature);
  dateExpiration.setDate(dateExpiration.getDate() + validityDays);

  const validiteText = `Cette promesse de vente est valable pour une durée de ${validityDays} jours à compter de sa signature, soit jusqu'au ${format(dateExpiration, "dd MMMM yyyy", { locale: fr })}.`;
  const validiteLines = doc.splitTextToSize(validiteText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, validiteLines.length * 6 + 20);
  doc.text(validiteLines, margin, yPos);
  yPos += validiteLines.length * 6 + 15;

  // Signatures - need space for signature block
  yPos = checkPageBreak(doc, yPos, 80);
  doc.setFont("helvetica", "bold");
  const lieu = agency.city || "_________________";
  doc.text(`Fait à ${lieu}, le ${format(dateSignature, "dd MMMM yyyy", { locale: fr })}`, margin, yPos);
  yPos += 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("En deux exemplaires originaux", margin, yPos);
  yPos += 15;

  const colWidth = (pageWidth - margin * 2 - 20) / 2;
  const rightX = margin + colWidth + 20;
  const signatureY = yPos;

  const vendorSig = signatures?.find(s => s.signerType === "vendor");
  const buyerSig = signatures?.find(s => s.signerType === "buyer");

  // Vendor signature
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LE VENDEUR", margin, signatureY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Lu et approuvé)", margin, signatureY + 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (vendorSig) {
    doc.text(vendorSig.signerName, margin, signatureY + 12);
    if (vendorSig.signatureType === "drawn" && vendorSig.signatureData) {
      try { doc.addImage(vendorSig.signatureData, "PNG", margin, signatureY + 15, 60, 30); } catch {}
    } else if (vendorSig.signatureText) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(16);
      doc.text(vendorSig.signatureText, margin, signatureY + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    const vDate = new Date(vendorSig.signedAt);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Signé le ${vDate.toLocaleDateString("fr-FR")} à ${vDate.toLocaleTimeString("fr-FR")}`, margin, signatureY + 48);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
  } else {
    doc.text("Signature :", margin, signatureY + 15);
    doc.line(margin, signatureY + 40, margin + colWidth, signatureY + 40);
  }

  // Buyer signature
  doc.setFont("helvetica", "bold");
  doc.text("L'ACQUÉREUR", rightX, signatureY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Lu et approuvé)", rightX, signatureY + 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (buyerSig) {
    doc.text(buyerSig.signerName, rightX, signatureY + 12);
    if (buyerSig.signatureType === "drawn" && buyerSig.signatureData) {
      try { doc.addImage(buyerSig.signatureData, "PNG", rightX, signatureY + 15, 60, 30); } catch {}
    } else if (buyerSig.signatureText) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(16);
      doc.text(buyerSig.signatureText, rightX, signatureY + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    const bDate = new Date(buyerSig.signedAt);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Signé le ${bDate.toLocaleDateString("fr-FR")} à ${bDate.toLocaleTimeString("fr-FR")}`, rightX, signatureY + 48);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
  } else {
    doc.text("Signature :", rightX, signatureY + 15);
    doc.line(rightX, signatureY + 40, rightX + colWidth, signatureY + 40);
  }

  return doc;
};

/**
 * Generates a Receipt PDF for a payment installment
 */
export const generateRecuVenteImmo = async (
  echeance: {
    amount: number;
    paid_date: string;
    receipt_number?: string | null;
    payment_method?: string | null;
  },
  vente: VenteImmobiliereData,
  agency: AgencyData
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = await addAgencyHeader(doc, agency, 20);

  // Document title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("REÇU DE PAIEMENT", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (echeance.receipt_number) {
    doc.text(`N : ${echeance.receipt_number}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
  }
  doc.text(`Date : ${format(new Date(echeance.paid_date), "dd MMMM yyyy", { locale: fr })}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Received from
  doc.setFont("helvetica", "bold");
  doc.text("Reçu de :", margin, yPos);
  yPos += 8;
  doc.setFont("helvetica", "normal");
  doc.text(vente.acquereur.name, margin, yPos);
  yPos += 6;
  if (vente.acquereur.address) {
    doc.text(vente.acquereur.address, margin, yPos);
    yPos += 6;
  }
  yPos += 10;

  // Amount
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Montant : ${formatAmountWithCurrency(echeance.amount)}`, margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`(${numberToWordsPDF(echeance.amount)} francs CFA)`, margin, yPos);
  yPos += 12;

  // Purpose
  doc.setFont("helvetica", "normal");
  doc.text(`Objet : Paiement pour l'acquisition du bien "${vente.bien.title}"`, margin, yPos);
  yPos += 6;
  doc.text(`Situé à : ${vente.bien.address}`, margin, yPos);
  yPos += 10;

  if (echeance.payment_method) {
    const methodLabels: Record<string, string> = {
      especes: "Espèces",
      virement: "Virement bancaire",
      cheque: "Chèque",
      mobile_money: "Mobile Money",
    };
    doc.text(`Mode de paiement : ${methodLabels[echeance.payment_method] || echeance.payment_method}`, margin, yPos);
    yPos += 10;
  }

  // Signature
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.text("Signature du récepteur :", pageWidth - margin - 60, yPos);

  return doc;
};

interface ReservationData {
  bien: {
    title: string;
    address: string;
    city?: string | null;
    property_type: string;
    area?: number | null;
    price: number;
  };
  acquereur: {
    name: string;
    address?: string | null;
    cni_number?: string | null;
    phone?: string | null;
    birth_date?: string | null;
    birth_place?: string | null;
    profession?: string | null;
  };
  deposit_amount: number;
  payment_method?: string | null;
  reservation_date: string;
  notes?: string | null;
}

/**
 * Generates a Reservation Contract PDF document
 */
export const generateContratReservationImmo = async (
  reservation: ReservationData,
  agency: AgencyData,
  validityDays: number = 30
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = await addAgencyHeader(doc, agency, 20);

  // Document title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE RÉSERVATION", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref: CR-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Parties
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS :", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Vendeur
  const vendeurLines = [
    `${agency.name}`,
    agency.address ? `Adresse : ${agency.address}` : null,
    agency.phone ? `Tel : ${agency.phone}` : null,
    `Email : ${agency.email}`,
    agency.siret ? `RCCM : ${agency.siret}` : null,
    `Ci-après dénommé "LE RÉSERVANT"`,
  ].filter(Boolean) as string[];

  vendeurLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.text("ET", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  // Reservataire
  const acquereurLines = [
    `${reservation.acquereur.name}`,
    reservation.acquereur.cni_number ? `CNI N° : ${reservation.acquereur.cni_number}` : null,
    reservation.acquereur.birth_date ? `Né(e) le : ${format(new Date(reservation.acquereur.birth_date), "dd MMMM yyyy", { locale: fr })}` : null,
    reservation.acquereur.birth_place ? `À : ${reservation.acquereur.birth_place}` : null,
    reservation.acquereur.profession ? `Profession : ${reservation.acquereur.profession}` : null,
    reservation.acquereur.address ? `Domicilié(e) à : ${reservation.acquereur.address}` : null,
    reservation.acquereur.phone ? `Tél : ${reservation.acquereur.phone}` : null,
    `Ci-après dénommé "LE RÉSERVATAIRE"`,
  ].filter(Boolean) as string[];

  acquereurLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Article 1 - Object
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 1 - OBJET DE LA RÉSERVATION", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const objetText = `Le Réservant s'engage à réserver au profit du Réservataire le bien immobilier suivant :`;
  doc.text(objetText, margin, yPos);
  yPos += 8;

  const bienLines = [
    `- Désignation : ${reservation.bien.title}`,
    `- Type : ${reservation.bien.property_type.charAt(0).toUpperCase() + reservation.bien.property_type.slice(1)}`,
    `- Adresse : ${reservation.bien.address}${reservation.bien.city ? `, ${reservation.bien.city}` : ""}`,
    reservation.bien.area ? `- Superficie : ${reservation.bien.area} m²` : null,
  ].filter(Boolean) as string[];

  bienLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 8;

  // Article 2 - Prix
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 2 - PRIX DE VENTE", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const prixText = `Le prix de vente du bien est fixé à la somme de ${formatAmountWithCurrency(reservation.bien.price)} (${numberToWordsPDF(reservation.bien.price)} francs CFA).`;
  const prixLines = doc.splitTextToSize(prixText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, prixLines.length * 6 + 10);
  doc.text(prixLines, margin, yPos);
  yPos += prixLines.length * 6 + 5;

  // Article 3 - Depot de garantie
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3 - DÉPÔT DE GARANTIE", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const depositText = `En contrepartie de cette réservation, le Réservataire verse ce jour au Réservant la somme de ${formatAmountWithCurrency(reservation.deposit_amount)} (${numberToWordsPDF(reservation.deposit_amount)} francs CFA) à titre de dépôt de garantie.`;
  const depositLines = doc.splitTextToSize(depositText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, depositLines.length * 6 + 10);
  doc.text(depositLines, margin, yPos);
  yPos += depositLines.length * 6 + 3;

  if (reservation.payment_method) {
    const methodLabels: Record<string, string> = {
      especes: "Espèces",
      virement: "Virement bancaire",
      cheque: "Chèque",
      mobile_money: "Mobile Money",
    };
    yPos = checkPageBreak(doc, yPos, 15);
    doc.text(`Mode de paiement : ${methodLabels[reservation.payment_method] || reservation.payment_method}`, margin, yPos);
    yPos += 8;
  }

  const conditionsDepot = [
    "Ce dépôt de garantie sera :",
    "- Imputé sur le prix de vente en cas de réalisation de la vente",
    "- Restitué au Réservataire en cas de non-réalisation de la vente du fait du Réservant",
    "- Acquis au Réservant en cas de désistement du Réservataire sans motif légitime",
  ];

  yPos = checkPageBreak(doc, yPos, 30);
  conditionsDepot.forEach((line, index) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += index === 0 ? 7 : 5;
  });
  yPos += 5;

  // Article 4 - Duree
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 4 - DURÉE DE LA RÉSERVATION", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const dateReservation = new Date(reservation.reservation_date);
  const dateExpiration = new Date(dateReservation);
  dateExpiration.setDate(dateExpiration.getDate() + validityDays);

  const dureeText = `La présente réservation est consentie pour une durée de ${validityDays} jours à compter de ce jour, soit jusqu'au ${format(dateExpiration, "dd MMMM yyyy", { locale: fr })} inclus.`;
  const dureeLines = doc.splitTextToSize(dureeText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, dureeLines.length * 6 + 15);
  doc.text(dureeLines, margin, yPos);
  yPos += dureeLines.length * 6 + 3;

  yPos = checkPageBreak(doc, yPos, 15);
  doc.text("Passé ce délai, la réservation sera caduque de plein droit.", margin, yPos);
  yPos += 10;

  // Article 5 - Conditions
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 5 - CONDITIONS PARTICULIÈRES", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  if (reservation.notes) {
    const notesLines = doc.splitTextToSize(reservation.notes, pageWidth - 2 * margin);
    yPos = checkPageBreak(doc, yPos, notesLines.length * 6 + 10);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 6;
  } else {
    doc.text("Néant", margin, yPos);
    yPos += 6;
  }
  yPos += 10;

  // Signatures - need space for signature block
  yPos = checkPageBreak(doc, yPos, 60);
  doc.setFont("helvetica", "bold");
  doc.text("Fait à _________________, le " + format(dateReservation, "dd MMMM yyyy", { locale: fr }), margin, yPos);
  yPos += 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("En deux exemplaires originaux", margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LE RÉSERVANT", margin + 10, yPos);
  doc.text("LE RÉSERVATAIRE", pageWidth - margin - 45, yPos);
  yPos += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Lu et approuvé)", margin + 10, yPos);
  doc.text("(Lu et approuvé)", pageWidth - margin - 45, yPos);
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Signature :", margin + 10, yPos);
  doc.text("Signature :", pageWidth - margin - 45, yPos);

  return doc;
};

/**
 * Generates a Sales Contract (Contrat de Vente) PDF document
 */
export const generateContratVenteImmo = async (
  vente: VenteImmobiliereData,
  agency: AgencyData & { city?: string | null },
  signatures?: VenteSignatureForPDF[]
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = await addAgencyHeader(doc, agency, 20);

  // Document title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE VENTE", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref: CV-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Parties
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNÉS :", margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Vendeur
  const vendeurLines = [
    `${agency.name}`,
    agency.address ? `Adresse : ${agency.address}` : null,
    agency.phone ? `Tel : ${agency.phone}` : null,
    `Email : ${agency.email}`,
    agency.siret ? `RCCM : ${agency.siret}` : null,
    `Ci-après dénommé "LE VENDEUR"`,
  ].filter(Boolean) as string[];

  vendeurLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 5;

  doc.setFont("helvetica", "bold");
  doc.text("ET", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  // Acquereur
  const acquereurLines = [
    `${vente.acquereur.name}`,
    vente.acquereur.cni_number ? `CNI N° : ${vente.acquereur.cni_number}` : null,
    vente.acquereur.birth_date ? `Né(e) le : ${format(new Date(vente.acquereur.birth_date), "dd MMMM yyyy", { locale: fr })}` : null,
    vente.acquereur.birth_place ? `À : ${vente.acquereur.birth_place}` : null,
    vente.acquereur.profession ? `Profession : ${vente.acquereur.profession}` : null,
    vente.acquereur.address ? `Domicilié(e) à : ${vente.acquereur.address}` : null,
    vente.acquereur.phone ? `Tél : ${vente.acquereur.phone}` : null,
    `Ci-après dénommé "L'ACQUÉREUR"`,
  ].filter(Boolean) as string[];

  acquereurLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 10;

  // Article 1 - Object
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 1 - OBJET DE LA VENTE", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const objetText = `Par le présent contrat, le Vendeur cède à l'Acquéreur, qui accepte, la pleine propriété du bien immobilier suivant :`;
  const objetLines = doc.splitTextToSize(objetText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, objetLines.length * 6 + 10);
  doc.text(objetLines, margin, yPos);
  yPos += objetLines.length * 6 + 3;

  const bienLines = [
    `- Désignation : ${vente.bien.title}`,
    `- Type : ${vente.bien.property_type.charAt(0).toUpperCase() + vente.bien.property_type.slice(1)}`,
    `- Adresse : ${vente.bien.address}${vente.bien.city ? `, ${vente.bien.city}` : ""}`,
    vente.bien.area ? `- Superficie : ${vente.bien.area} m²` : null,
  ].filter(Boolean) as string[];

  bienLines.forEach((line) => {
    yPos = checkPageBreak(doc, yPos, 10);
    doc.text(line, margin, yPos);
    yPos += 6;
  });
  yPos += 8;

  // Article 2 - Prix
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 2 - PRIX DE VENTE", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const prixText = `La présente vente est consentie et acceptée moyennant le prix de ${formatAmountWithCurrency(vente.total_price)} (${numberToWordsPDF(vente.total_price)} francs CFA).`;
  const prixLines = doc.splitTextToSize(prixText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, prixLines.length * 6 + 10);
  doc.text(prixLines, margin, yPos);
  yPos += prixLines.length * 6 + 5;

  // Article 3 - Modalites de paiement
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3 - MODALITÉS DE PAIEMENT", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  if (vente.payment_type === "comptant") {
    doc.text("Le paiement du prix est effectué comptant ce jour.", margin, yPos);
    yPos += 6;
    yPos = checkPageBreak(doc, yPos, 15);
    doc.text("Le Vendeur reconnaît avoir reçu la totalité du prix et en délivre quittance.", margin, yPos);
    yPos += 10;
  } else {
    const acompte = vente.down_payment || 0;
    doc.text("Le paiement du prix est effectué comme suit :", margin, yPos);
    yPos += 8;
    
    const modalitesLines = [
      `- Acompte versé : ${formatAmountWithCurrency(acompte)}`,
      `- Solde restant : ${formatAmountWithCurrency(vente.total_price - acompte)}`,
      vente.monthly_payment ? `- Mensualité : ${formatAmountWithCurrency(vente.monthly_payment)}` : null,
      vente.total_installments ? `- Nombre d'échéances : ${vente.total_installments}` : null,
    ].filter(Boolean) as string[];

    modalitesLines.forEach((line) => {
      yPos = checkPageBreak(doc, yPos, 10);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 5;
    
    yPos = checkPageBreak(doc, yPos, 15);
    doc.text("L'Acquéreur s'engage à régler les échéances aux dates convenues.", margin, yPos);
    yPos += 10;
  }

  // Article 4 - Transfert de propriete
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 4 - TRANSFERT DE PROPRIÉTÉ", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const transfertText = `Le transfert de propriété sera effectif à compter de la signature du présent acte. L'Acquéreur aura la jouissance du bien à compter de ce jour.`;
  const transfertLines = doc.splitTextToSize(transfertText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, transfertLines.length * 6 + 10);
  doc.text(transfertLines, margin, yPos);
  yPos += transfertLines.length * 6 + 5;

  // Article 5 - Garanties
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 5 - GARANTIES", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const garantiesText = `Le Vendeur garantit l'Acquéreur contre tout trouble de jouissance et toute éviction. Le bien est vendu libre de toute hypothèque ou charge.`;
  const garantiesLines = doc.splitTextToSize(garantiesText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, garantiesLines.length * 6 + 10);
  doc.text(garantiesLines, margin, yPos);
  yPos += garantiesLines.length * 6 + 5;

  // Article 6 - Frais
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 6 - FRAIS", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.text("Tous les frais afférents à la présente vente sont à la charge de l'Acquéreur.", margin, yPos);
  yPos += 15;

  // Signatures - need space for signature block
  yPos = checkPageBreak(doc, yPos, 80);
  const dateVente = new Date(vente.sale_date);
  const lieuVente = agency.city || "_________________";
  doc.setFont("helvetica", "bold");
  doc.text(`Fait à ${lieuVente}, le ${format(dateVente, "dd MMMM yyyy", { locale: fr })}`, margin, yPos);
  yPos += 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("En deux exemplaires originaux", margin, yPos);
  yPos += 15;

  const colWidth = (pageWidth - margin * 2 - 20) / 2;
  const rightX = margin + colWidth + 20;
  const signatureY = yPos;

  const vendorSig = signatures?.find(s => s.signerType === "vendor");
  const buyerSig = signatures?.find(s => s.signerType === "buyer");

  // Vendor signature
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LE VENDEUR", margin, signatureY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Lu et approuvé)", margin, signatureY + 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (vendorSig) {
    doc.text(vendorSig.signerName, margin, signatureY + 12);
    if (vendorSig.signatureType === "drawn" && vendorSig.signatureData) {
      try { doc.addImage(vendorSig.signatureData, "PNG", margin, signatureY + 15, 60, 30); } catch {}
    } else if (vendorSig.signatureText) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(16);
      doc.text(vendorSig.signatureText, margin, signatureY + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    const vDate = new Date(vendorSig.signedAt);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Signé le ${vDate.toLocaleDateString("fr-FR")} à ${vDate.toLocaleTimeString("fr-FR")}`, margin, signatureY + 48);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
  } else {
    doc.text("Signature :", margin, signatureY + 15);
    doc.line(margin, signatureY + 40, margin + colWidth, signatureY + 40);
  }

  // Buyer signature
  doc.setFont("helvetica", "bold");
  doc.text("L'ACQUÉREUR", rightX, signatureY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Lu et approuvé)", rightX, signatureY + 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  if (buyerSig) {
    doc.text(buyerSig.signerName, rightX, signatureY + 12);
    if (buyerSig.signatureType === "drawn" && buyerSig.signatureData) {
      try { doc.addImage(buyerSig.signatureData, "PNG", rightX, signatureY + 15, 60, 30); } catch {}
    } else if (buyerSig.signatureText) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(16);
      doc.text(buyerSig.signatureText, rightX, signatureY + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    const bDate = new Date(buyerSig.signedAt);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Signé le ${bDate.toLocaleDateString("fr-FR")} à ${bDate.toLocaleTimeString("fr-FR")}`, rightX, signatureY + 48);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
  } else {
    doc.text("Signature :", rightX, signatureY + 15);
    doc.line(rightX, signatureY + 40, rightX + colWidth, signatureY + 40);
  }

  return doc;
};
