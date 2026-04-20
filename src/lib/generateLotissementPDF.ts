import jsPDF from "jspdf";
import { createPDFDocument, PDF_FONT } from "@/lib/pdfFont";
import { formatAmountForPDF, formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";
import { buildAttestationTemplateContent, formatAttestationPhone } from "@/lib/attestationTemplateContent";
import {
  estimatePreviewWatermarkImageSize,
  estimatePreviewWatermarkTextSize,
  estimateRepeatedWatermarkTextSize,
  getAttestationRepeatedWatermarkRatios,
  getAttestationWatermarkBounds,
  getAttestationWatermarkPlacement,
} from "@/lib/attestationWatermark";
import { drawMotifBorder, isMotifBorderStyle } from "@/lib/attestationBorderMotifs";

interface AgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string | null;
  siret?: string | null;
  pdf_header_text?: string | null;
}

interface AcquereurInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  cni_number?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  profession?: string | null;
}

interface ParcelleInfo {
  plot_number: string;
  area: number;
  price: number;
}

interface LotissementInfo {
  name: string;
  location: string;
  city?: string | null;
}

interface VenteInfo {
  id: string;
  sale_date: string;
  total_price: number;
  payment_type: "comptant" | "echelonne";
  down_payment?: number | null;
  monthly_payment?: number | null;
  total_installments?: number | null;
}

interface EcheanceInfo {
  id: string;
  due_date: string;
  amount: number;
  paid_date?: string | null;
  paid_amount?: number | null;
  payment_method?: string | null;
  receipt_number?: string | null;
}

// Colors
const primaryColor: [number, number, number] = [26, 54, 93];
const textColor: [number, number, number] = [51, 51, 51];
const lightGray: [number, number, number] = [245, 245, 245];

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

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const addHeader = async (doc: jsPDF, agency: AgencyInfo | null, title: string): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  if (agency) {
    // Try to load and display logo
    if (agency.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(agency.logo_url);
        if (logoBase64) {
          doc.addImage(logoBase64, "PNG", margin, yPos, 25, 25);
        }
      } catch {
        // Continue without logo
      }
    }

    // Company info
    const textStartX = agency.logo_url ? margin + 30 : margin;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(agency.name, textStartX, yPos + 8);
    
    const addressParts = [agency.address, agency.city, agency.country].filter(Boolean);
    if (addressParts.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      doc.text(addressParts.join(", "), textStartX, yPos + 14);
    }
    
    const contactParts: string[] = [];
    if (agency.phone) contactParts.push(`Tél: ${agency.phone}`);
    if (agency.email) contactParts.push(agency.email);
    if (agency.siret) contactParts.push(`RCCM: ${agency.siret}`);
    
    if (contactParts.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(contactParts.join(" | "), textStartX, yPos + 19);
    }
    
    yPos += 30;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  
  return yPos + 15;
};

const addFooter = (doc: jsPDF, agency: AgencyInfo | null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(...lightGray);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  
  if (agency) {
    doc.text(
      `${agency.name} - Document généré le ${formatDate(new Date().toISOString())}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  } else {
    doc.text(
      `Document généré le ${formatDate(new Date().toISOString())}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
};

// ========================================
// FICHE DE RÉSERVATION
// ========================================

interface ReservationInfo {
  deposit_amount: number;
  reservation_date: string;
  expiry_date: string;
  validity_days: number;
  payment_method?: string | null;
  notes?: string | null;
}

const getPaymentMethodLabel = (method: string | null | undefined): string => {
  const labels: Record<string, string> = {
    especes: "Especes",
    virement: "Virement bancaire",
    mobile_money: "Mobile Money",
    cheque: "Cheque",
  };
  return labels[method || ""] || method || "Non precise";
};

export const generateFicheReservation = async (
  parcelle: ParcelleInfo,
  lotissement: LotissementInfo,
  acquereur: AcquereurInfo,
  agency: AgencyInfo | null,
  reservation: ReservationInfo
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  const checkPage = (needed: number, y: number): number => {
    if (y + needed > pageHeight - 30) {
      doc.addPage();
      return margin;
    }
    return y;
  };

  let yPos = await addHeader(doc, agency, "FICHE DE RESERVATION");

  // Reference & date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const refNumber = `RES-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Reference : ${refNumber}`, pageWidth - margin, yPos, { align: "right" });
  doc.text(`Date : ${formatDate(reservation.reservation_date)}`, pageWidth - margin, yPos + 5, { align: "right" });

  yPos += 15;

  // === PREAMBULE ===
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const vendeurName = agency?.name || "Le Vendeur";
  const vendeurDetails = [agency?.address, agency?.city, agency?.country].filter(Boolean).join(", ");
  const rccm = agency?.siret ? `, RCCM : ${agency.siret}` : "";

  let preambule = `Entre les soussignés :\n\n${vendeurName}`;
  if (vendeurDetails) preambule += `, sis à ${vendeurDetails}`;
  preambule += `${rccm}, ci-après dénommé "LE VENDEUR",\n\nD'une part,\n\nEt\n\n`;
  preambule += `Monsieur/Madame ${acquereur.name}`;
  if (acquereur.birth_date) preambule += `, né(e) le ${formatDate(acquereur.birth_date)}`;
  if (acquereur.birth_place) preambule += ` à ${acquereur.birth_place}`;
  if (acquereur.profession) preambule += `, ${acquereur.profession}`;
  if (acquereur.cni_number) preambule += `, CNI N° ${acquereur.cni_number}`;
  if (acquereur.phone) preambule += `, Tél : ${acquereur.phone}`;
  if (acquereur.address) preambule += `, domicilié(e) à ${acquereur.address}`;
  preambule += `, ci-après dénommé "LE RÉSERVATAIRE",\n\nD'autre part,\n\nIl a été convenu et arrêté ce qui suit :`;

  const preLines = doc.splitTextToSize(preambule, maxWidth);
  preLines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // === ARTICLE 1 - OBJET ===
  yPos = checkPage(40, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 1 : OBJET DE LA RÉSERVATION", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const art1 = `Par la présente, le Réservataire déclare réserver auprès du Vendeur la parcelle de terrain ci-après désignée :\n\n- Lotissement : ${lotissement.name}, sis à ${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}\n- Numéro de lot : ${parcelle.plot_number}\n- Superficie : ${formatAmountForPDF(parcelle.area)} m²\n- Prix de vente : ${formatAmountWithCurrency(parcelle.price)} (${numberToWordsPDF(parcelle.price)} francs CFA)`;

  const art1Lines = doc.splitTextToSize(art1, maxWidth);
  art1Lines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // === ARTICLE 2 - MONTANT DE LA RESERVATION ===
  yPos = checkPage(50, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 2 : MONTANT DE LA RÉSERVATION", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const art2 = `Le Réservataire verse au Vendeur, à la signature des présentes, la somme de ${formatAmountWithCurrency(reservation.deposit_amount)} (${numberToWordsPDF(reservation.deposit_amount)} francs CFA) à titre de montant de réservation.\n\nMode de paiement : ${getPaymentMethodLabel(reservation.payment_method)}\n\nCe montant sera imputé sur le prix total de la parcelle en cas de conclusion de la vente définitive.`;

  const art2Lines = doc.splitTextToSize(art2, maxWidth);
  art2Lines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // === ARTICLE 3 - CARACTERE NON REMBOURSABLE ===
  yPos = checkPage(50, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 3 : CARACTÈRE NON REMBOURSABLE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const art3 = `Le montant de la réservation visé à l'article 2 est NON REMBOURSABLE, quels que soient les motifs d'annulation ou de désistement du Réservataire.\n\nEn cas de renonciation du Réservataire à l'acquisition de la parcelle réservée, le montant de la réservation reste définitivement acquis au Vendeur à titre d'indemnité forfaitaire, conformément aux dispositions des articles 1134 et suivants du Code civil applicable en Côte d'Ivoire.\n\nEn cas de défaut du Vendeur à honorer ses engagements, le montant de la réservation sera intégralement restitué au Réservataire, sans préjudice de dommages et intérêts éventuels.`;

  const art3Lines = doc.splitTextToSize(art3, maxWidth);
  art3Lines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // === ARTICLE 4 - DUREE DE VALIDITE ===
  yPos = checkPage(40, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 4 : DURÉE DE VALIDITÉ", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const art4 = `La présente réservation est valable pour une durée de ${reservation.validity_days} (${numberToWordsPDF(reservation.validity_days)}) jours à compter de sa date de signature, soit jusqu'au ${formatDate(reservation.expiry_date)}.\n\nÀ l'expiration de ce délai, si la vente définitive n'a pas été conclue du fait du Réservataire, la réservation sera caduque de plein droit et le montant versé restera acquis au Vendeur conformément à l'article 3 ci-dessus.`;

  const art4Lines = doc.splitTextToSize(art4, maxWidth);
  art4Lines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // === ARTICLE 5 - OBLIGATIONS DES PARTIES ===
  yPos = checkPage(60, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 5 : OBLIGATIONS DES PARTIES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const art5 = `Le Vendeur s'engage à :\n- Retirer la parcelle de la vente pendant la durée de validité de la réservation\n- Informer le Réservataire de toute modification affectant le lotissement\n- Conclure la vente définitive dans les conditions convenues\n\nLe Réservataire s'engage à :\n- Conclure la vente définitive dans le délai de validité de la réservation\n- Fournir tous les documents nécessaires à la régularisation de la vente\n- Respecter le calendrier de paiement qui sera fixé dans l'acte de vente`;

  const art5Lines = doc.splitTextToSize(art5, maxWidth);
  art5Lines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // === ARTICLE 6 - LITIGES ===
  yPos = checkPage(30, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 6 : RÈGLEMENT DES LITIGES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const art6 = `Tout différend né de l'interprétation ou de l'exécution de la présente fiche de réservation sera réglé à l'amiable. À défaut, il sera soumis aux juridictions compétentes d'Abidjan, République de Côte d'Ivoire.`;

  const art6Lines = doc.splitTextToSize(art6, maxWidth);
  art6Lines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // === ARTICLE 7 - DISPOSITIONS DIVERSES ===
  yPos = checkPage(30, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 7 : DISPOSITIONS DIVERSES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const art7 = `La présente fiche de réservation est établie en deux (2) exemplaires originaux, un pour chaque partie.\n\nLes frais de notaire, d'enregistrement et toutes taxes afférentes à la vente définitive seront à la charge du Réservataire.`;

  const art7Lines = doc.splitTextToSize(art7, maxWidth);
  art7Lines.forEach((line: string) => {
    yPos = checkPage(6, yPos);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  if (reservation.notes) {
    yPos += 5;
    doc.setFont("helvetica", "italic");
    doc.text(`Observations : ${reservation.notes}`, margin, yPos);
    yPos += 7;
  }

  yPos += 15;

  // === SIGNATURES ===
  yPos = checkPage(40, yPos);
  const sigDate = `Fait à ${agency?.city || "Abidjan"}, le ${formatDate(reservation.reservation_date)}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(sigDate, margin, yPos);
  yPos += 10;

  const colWidth = (maxWidth - 20) / 2;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("Le Réservataire", margin, yPos);
  doc.text("Le Vendeur", margin + colWidth + 20, yPos);

  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("(Signature précédée de \"Lu et approuvé\")", margin, yPos);
  doc.text("(Signature et cachet)", margin + colWidth + 20, yPos);

  yPos += 25;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, yPos, margin + colWidth, yPos);
  doc.line(margin + colWidth + 20, yPos, pageWidth - margin, yPos);

  addFooter(doc, agency);

  return doc;
};

// ========================================
// CONTRAT DE VENTE
// ========================================
export const generateContratVente = async (
  vente: VenteInfo,
  parcelle: ParcelleInfo,
  lotissement: LotissementInfo,
  acquereur: AcquereurInfo,
  agency: AgencyInfo | null
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(doc, agency, "CONTRAT DE VENTE DE TERRAIN");

  // Numéro de contrat
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Contrat N° : ${vente.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, yPos, { align: "right" });
  
  yPos += 10;

  // Préambule
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const preambule = `Entre les soussignés :\n\n${agency?.name || "Le Vendeur"}, ${agency?.address ? `sis à ${agency.address}` : ""} ${agency?.city || ""}, représenté par son responsable dûment habilité, ci-après dénommé « LE VENDEUR »,\n\nD'une part,\n\nEt\n\nMonsieur/Madame ${acquereur.name}${acquereur.birth_date ? `, né(e) le ${formatDate(acquereur.birth_date)}` : ""}${acquereur.birth_place ? ` à ${acquereur.birth_place}` : ""}${acquereur.profession ? `, ${acquereur.profession}` : ""}${acquereur.cni_number ? `, CNI N° ${acquereur.cni_number}` : ""}, ci-après dénommé « L'ACQUÉREUR »,\n\nD'autre part,\n\nIl a été convenu ce qui suit :`;

  const preambuleLines = doc.splitTextToSize(preambule, maxWidth);
  preambuleLines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 1 - Objet
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 1 : OBJET DU CONTRAT", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article1 = `Le Vendeur cède à l'Acquéreur, qui accepte, une parcelle de terrain nue située dans le lotissement « ${lotissement.name} » sis à ${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}, désignée sous le numéro de lot ${parcelle.plot_number}, d'une superficie de ${formatAmountForPDF(parcelle.area)} mètres carrés (${formatAmountForPDF(parcelle.area)} m²).`;
  
  const article1Lines = doc.splitTextToSize(article1, maxWidth);
  article1Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 2 - Prix
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 2 : PRIX ET MODALITÉS DE PAIEMENT", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  let article2 = `La présente vente est consentie et acceptée moyennant le prix principal de ${formatAmountWithCurrency(vente.total_price)} (${numberToWordsPDF(vente.total_price)} francs CFA).`;
  
  if (vente.payment_type === "echelonne") {
    article2 += `\n\nCe montant sera payé selon les modalités suivantes :\n- Apport initial : ${formatAmountWithCurrency(vente.down_payment || 0)}\n- Mensualités : ${vente.total_installments} versements de ${formatAmountWithCurrency(vente.monthly_payment || 0)}`;
  } else {
    article2 += `\n\nCe montant est payable au comptant, en une seule fois, à la signature du présent contrat.`;
  }

  const article2Lines = doc.splitTextToSize(article2, maxWidth);
  article2Lines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 3 - Transfert de propriété
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 3 : TRANSFERT DE PROPRIÉTÉ", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article3 = `Le transfert de propriété sera effectif après paiement intégral du prix de vente. L'Acquéreur deviendra alors pleinement propriétaire de la parcelle désignée ci-dessus, avec tous les droits et obligations qui s'y rattachent.`;
  
  const article3Lines = doc.splitTextToSize(article3, maxWidth);
  article3Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 4 - Obligations
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 4 : OBLIGATIONS DES PARTIES", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article4 = `Le Vendeur s'engage à :\n- Garantir l'Acquéreur contre toute éviction et tout trouble de jouissance\n- Remettre tous les documents relatifs à la propriété du terrain\n- Assister l'Acquéreur dans les démarches administratives\n\nL'Acquéreur s'engage à :\n- Respecter les échéances de paiement convenues\n- Se conformer aux règles d'urbanisme et de construction en vigueur\n- Ne pas céder ses droits avant le paiement intégral du prix`;
  
  const article4Lines = doc.splitTextToSize(article4, maxWidth);
  article4Lines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 5 - Litiges
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 5 : RÈGLEMENT DES LITIGES", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article5 = `Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis à la juridiction compétente d'Abidjan, Côte d'Ivoire, après échec d'une tentative de règlement amiable.`;
  
  const article5Lines = doc.splitTextToSize(article5, maxWidth);
  article5Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 15;

  // Date et lieu
  doc.text(`Fait à ${lotissement.city || "Abidjan"}, le ${formatDate(vente.sale_date)}`, margin, yPos);
  doc.text("En deux (2) exemplaires originaux.", margin, yPos + 6);

  yPos += 25;

  // Signatures
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  const colWidth = (maxWidth - 20) / 2;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("L'Acquéreur", margin, yPos);
  doc.text("Le Vendeur", margin + colWidth + 20, yPos);
  
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("(Signature précédée de \"Lu et approuvé\")", margin, yPos);
  doc.text("(Signature et cachet)", margin + colWidth + 20, yPos);
  
  yPos += 25;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, yPos, margin + colWidth, yPos);
  doc.line(margin + colWidth + 20, yPos, pageWidth - margin, yPos);

  addFooter(doc, agency);
  
  return doc;
};

// ========================================
// PROMESSE DE VENTE (PRE-SALE AGREEMENT)
// ========================================
export const generatePromesseVente = async (
  parcelle: ParcelleInfo,
  lotissement: LotissementInfo,
  acquereur: AcquereurInfo,
  agency: AgencyInfo | null,
  reservationDate: string = new Date().toISOString(),
  depositPercentage: number = 30,
  depositAmount: number = 0,
  paymentInfo?: {
    payment_type?: "comptant" | "echelonne";
    total_installments?: number | null;
    monthly_payment?: number | null;
  }
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(doc, agency, "PROMESSE DE VENTE");

  // Reference number
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const refNumber = `PV-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Référence : ${refNumber}`, pageWidth - margin, yPos, { align: "right" });
  doc.text(`Date : ${formatDate(reservationDate)}`, pageWidth - margin, yPos + 5, { align: "right" });
  
  yPos += 15;

  // Préambule
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const preambule = `Entre les soussignés :\n\n${agency?.name || "Le Vendeur"}, ${agency?.address ? `sis à ${agency.address}` : ""} ${agency?.city || ""}, représenté par son responsable dûment habilité, ci-après dénommé « LE PROMETTANT »,\n\nD'une part,\n\nEt\n\nMonsieur/Madame ${acquereur.name}${acquereur.birth_date ? `, né(e) le ${formatDate(acquereur.birth_date)}` : ""}${acquereur.birth_place ? ` à ${acquereur.birth_place}` : ""}${acquereur.profession ? `, ${acquereur.profession}` : ""}${acquereur.cni_number ? `, CNI N° ${acquereur.cni_number}` : ""}, ci-après dénommé « LE BÉNÉFICIAIRE »,\n\nD'autre part,\n\nIl a été convenu ce qui suit :`;

  const preambuleLines = doc.splitTextToSize(preambule, maxWidth);
  preambuleLines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 1 - Objet de la promesse
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 1 : OBJET DE LA PROMESSE", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article1 = `Le Promettant s'engage irrévocablement à vendre au Bénéficiaire, qui accepte, une parcelle de terrain nue située dans le lotissement « ${lotissement.name} » sis à ${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}, désignée sous le numéro de lot ${parcelle.plot_number}, d'une superficie de ${parcelle.area.toLocaleString("fr-FR")} mètres carrés (${parcelle.area.toLocaleString("fr-FR")} m²).`;
  
  const article1Lines = doc.splitTextToSize(article1, maxWidth);
  article1Lines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 2 - Prix
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 2 : PRIX ET CONDITIONS FINANCIÈRES", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const calculatedDeposit = depositAmount > 0 ? depositAmount : Math.round(parcelle.price * depositPercentage / 100);
  const remainingBalance = parcelle.price - calculatedDeposit;
  
  let article2 = `La vente sera consentie moyennant le prix de ${formatAmountWithCurrency(parcelle.price)} (${numberToWordsPDF(parcelle.price)} francs CFA).\n\nÀ titre de dépôt de garantie et en contrepartie de l'immobilisation du bien, le Bénéficiaire verse ce jour au Promettant la somme de ${formatAmountWithCurrency(calculatedDeposit)} (${numberToWordsPDF(calculatedDeposit)} francs CFA).`;
  
  if (paymentInfo?.payment_type === "echelonne" && paymentInfo.total_installments && paymentInfo.monthly_payment) {
    article2 += `\n\nLe solde restant à payer s'élève à ${formatAmountWithCurrency(remainingBalance)} (${numberToWordsPDF(remainingBalance)} francs CFA), payable en ${paymentInfo.total_installments} échéances mensuelles de ${formatAmountWithCurrency(paymentInfo.monthly_payment)} (${numberToWordsPDF(paymentInfo.monthly_payment)} francs CFA) chacune.`;
  } else {
    article2 += `\n\nLe solde restant à payer s'élève à ${formatAmountWithCurrency(remainingBalance)} (${numberToWordsPDF(remainingBalance)} francs CFA), payable au comptant lors de la signature de l'acte définitif.`;
  }
  
  article2 += `\n\nCette somme sera imputée sur le prix de vente lors de la signature de l'acte définitif.`;

  const article2Lines = doc.splitTextToSize(article2, maxWidth);
  article2Lines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 3 - Durée de validité
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 3 : DURÉE DE VALIDITÉ", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article3 = `La présente promesse de vente est consentie pour une durée de quatre-vingt-dix (90) jours à compter de ce jour.\n\nLe Bénéficiaire devra lever l'option et signer l'acte de vente définitif avant l'expiration de ce délai, faute de quoi la présente promesse sera caduque de plein droit.\n\nEn cas de non-réalisation de la vente du fait du Bénéficiaire, le dépôt de garantie restera acquis au Promettant à titre d'indemnité forfaitaire.`;
  
  const article3Lines = doc.splitTextToSize(article3, maxWidth);
  article3Lines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 4 - Conditions suspensives
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 4 : CONDITIONS SUSPENSIVES", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article4 = `La présente promesse est consentie sous les conditions suspensives suivantes :\n\n1. Obtention par le Bénéficiaire du financement nécessaire à l'acquisition, le cas échéant\n2. Régularité des titres de propriété du Promettant\n3. Absence de servitudes ou de charges non déclarées grevant le bien\n\nEn cas de non-réalisation d'une condition suspensive, les parties seront libérées de leurs engagements et le dépôt de garantie sera restitué au Bénéficiaire.`;
  
  const article4Lines = doc.splitTextToSize(article4, maxWidth);
  article4Lines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 5 - Élection de domicile
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 5 : ÉLECTION DE DOMICILE ET LITIGES", margin, yPos);
  yPos += 7;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article5 = `Pour l'exécution des présentes, les parties font élection de domicile en leur adresse respective ci-dessus indiquée.\n\nTout litige relatif à l'interprétation ou à l'exécution de la présente promesse sera soumis à la juridiction compétente d'Abidjan, Côte d'Ivoire, après échec d'une tentative de règlement amiable.`;
  
  const article5Lines = doc.splitTextToSize(article5, maxWidth);
  article5Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 15;

  // Date et lieu
  doc.text(`Fait à ${lotissement.city || "Abidjan"}, le ${formatDate(reservationDate)}`, margin, yPos);
  doc.text("En deux (2) exemplaires originaux.", margin, yPos + 6);

  yPos += 25;

  // Signatures
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = margin;
  }

  const colWidth = (maxWidth - 20) / 2;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Le Bénéficiaire", margin, yPos);
  doc.text("Le Promettant", margin + colWidth + 20, yPos);
  
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("(Signature précédée de \"Lu et approuvé\")", margin, yPos);
  doc.text("(Signature et cachet)", margin + colWidth + 20, yPos);
  
  yPos += 25;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, yPos, margin + colWidth, yPos);
  doc.line(margin + colWidth + 20, yPos, pageWidth - margin, yPos);

  addFooter(doc, agency);
  
  return doc;
};

// ========================================
// ATTESTATION DE PAIEMENT
// ========================================
export const generateAttestationPaiement = async (
  echeance: EcheanceInfo,
  vente: VenteInfo,
  parcelle: ParcelleInfo,
  lotissement: LotissementInfo,
  acquereur: AcquereurInfo,
  agency: AgencyInfo | null,
  echeanceNumber: number,
  totalEcheances: number
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(doc, agency, "ATTESTATION DE PAIEMENT");

  // Numéro et date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const receiptNumber = echeance.receipt_number || `ATT-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`N° : ${receiptNumber}`, pageWidth - margin, yPos, { align: "right" });
  doc.text(`Date : ${formatDate(echeance.paid_date || new Date().toISOString())}`, pageWidth - margin, yPos + 5, { align: "right" });
  
  yPos += 15;

  // Corps de l'attestation
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const attestation = `Je soussigné, ${agency?.name || "Le Vendeur"}, atteste avoir reçu de Monsieur/Madame ${acquereur.name}${acquereur.cni_number ? ` (CNI N° ${acquereur.cni_number})` : ""} la somme de :`;
  
  const attestationLines = doc.splitTextToSize(attestation, maxWidth);
  attestationLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Montant encadré
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, yPos, maxWidth, 30, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Montant reçu", pageWidth / 2, yPos + 10, { align: "center" });
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(`${formatAmountWithCurrency(echeance.paid_amount || echeance.amount)}`, pageWidth / 2, yPos + 22, { align: "center" });
  
  yPos += 40;

  // Montant en lettres
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`Soit : ${numberToWordsPDF(echeance.paid_amount || echeance.amount)} francs CFA`, margin, yPos);
  
  yPos += 15;

  // Détails du paiement
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("DÉTAILS DU PAIEMENT", margin + 5, yPos + 5.5);
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const details = [
    ["Objet", `Paiement échéance ${echeanceNumber}/${totalEcheances}`],
    ["Lotissement", lotissement.name],
    ["Parcelle N°", parcelle.plot_number],
    ["Superficie", `${parcelle.area.toLocaleString("fr-FR")} m²`],
    ["Mode de paiement", echeance.payment_method || "Non spécifié"],
    ["Date d'échéance", formatDate(echeance.due_date)],
    ["Date de paiement", formatDate(echeance.paid_date || new Date().toISOString())],
  ];
  
  details.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, pageWidth - margin, yPos, { align: "right" });
    yPos += 7;
  });

  yPos += 10;

  // Récapitulatif vente
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("RÉCAPITULATIF DE LA VENTE", margin + 5, yPos + 5.5);
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const recapDetails = [
    ["Prix total", formatAmountWithCurrency(vente.total_price)],
    ["Apport initial", formatAmountWithCurrency(vente.down_payment || 0)],
  ];
  
  recapDetails.forEach(([label, value]) => {
    doc.text(label, margin, yPos);
    doc.text(value, pageWidth - margin, yPos, { align: "right" });
    yPos += 7;
  });

  yPos += 15;

  // Mention légale
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  const legalText = "Cette attestation est délivrée pour servir et valoir ce que de droit.";
  doc.text(legalText, margin, yPos);

  yPos += 20;

  // Signature
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(`Fait à ${lotissement.city || "Abidjan"}, le ${formatDate(echeance.paid_date || new Date().toISOString())}`, pageWidth - margin, yPos, { align: "right" });
  
  yPos += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Le Vendeur", pageWidth - margin - 40, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("(Signature et cachet)", pageWidth - margin - 40, yPos);
  
  yPos += 25;
  doc.setDrawColor(150, 150, 150);
  doc.line(pageWidth - margin - 80, yPos, pageWidth - margin, yPos);

  addFooter(doc, agency);
  
  return doc;
};

// ========================================
// ATTESTATION VILLAGEOISE
// ========================================

export interface AttestationTemplateData {
  district?: string;
  commune?: string;
  village?: string;
  header_ministere?: string | null;
  header_region?: string | null;
  header_departement?: string | null;
  header_republique?: string | null;
  header_devise?: string | null;
  lotissement_origin_name?: string;
  arrete_approbation?: string;
  content?: string;
  banner_color_1?: string | null;
  banner_color_2?: string | null;
  banner_gradient?: boolean;
  doc_bg_color_1?: string | null;
  doc_bg_color_2?: string | null;
  doc_bg_gradient?: boolean;
  village_logo_url?: string | null;
  right_logo_url?: string | null;
  header_line_color?: string | null;
  title_border_color?: string | null;
  title_bg_color?: string | null;
  watermark_type?: string;
  watermark_text?: string | null;
  watermark_image_url?: string | null;
  watermark_angle?: string;
  watermark_opacity?: number;
  watermark_repeat?: boolean;
  watermark_position_x?: number | null;
  watermark_position_y?: number | null;
  watermark_rotation?: number | null;
  page_border_enabled?: boolean;
  page_border_color?: string;
  page_border_style?: string;
}

export interface AttestationChefImages {
  stamp_url?: string | null;
  signature_url?: string | null;
}

export interface AncienBeneficiaireInfo {
  nom: string;
  cni_number?: string | null;
  telephone?: string | null;
}

export const generateAttestationVillageoise = async (
  parcelle: ParcelleInfo,
  lotissement: LotissementInfo,
  acquereur: AcquereurInfo,
  agency: AgencyInfo | null,
  saleDate: string,
  villageName?: string,
  chefVillageName?: string,
  template?: AttestationTemplateData | null,
  chefVillageTitre?: string,
  ilotName?: string | null,
  chefImages?: AttestationChefImages | null,
  ancienBeneficiaire?: AncienBeneficiaireInfo | null,
  compactLevel = 0,
  forceCession = false
): Promise<jsPDF> => {
  // Auto-fit: try rendering, if it overflows one page, retry with higher compactLevel
  const result = await _generateAttestationVillageoiseInternal(
    parcelle, lotissement, acquereur, agency, saleDate, villageName,
    chefVillageName, template, chefVillageTitre, ilotName, chefImages,
    ancienBeneficiaire, compactLevel, forceCession
  );
  
  const totalPages = (result as any).internal.pages.length - 1;
  if (totalPages <= 1) return result;
  
  // Retry with increasing compact levels until it fits on one page
  for (let level = Math.max(compactLevel + 1, 1); level <= 5; level++) {
    const retry = await _generateAttestationVillageoiseInternal(
      parcelle, lotissement, acquereur, agency, saleDate, villageName,
      chefVillageName, template, chefVillageTitre, ilotName, chefImages,
      ancienBeneficiaire, level, forceCession
    );
    const retryPages = (retry as any).internal.pages.length - 1;
    if (retryPages <= 1) return retry;
  }
  
  // Last resort: return most compact version (even if multi-page)
  return await _generateAttestationVillageoiseInternal(
    parcelle, lotissement, acquereur, agency, saleDate, villageName,
    chefVillageName, template, chefVillageTitre, ilotName, chefImages,
    ancienBeneficiaire, 5, forceCession
  );
};

const _generateAttestationVillageoiseInternal = async (
  parcelle: ParcelleInfo,
  lotissement: LotissementInfo,
  acquereur: AcquereurInfo,
  agency: AgencyInfo | null,
  saleDate: string,
  villageName?: string,
  chefVillageName?: string,
  template?: AttestationTemplateData | null,
  chefVillageTitre?: string,
  ilotName?: string | null,
  chefImages?: AttestationChefImages | null,
  ancienBeneficiaire?: AncienBeneficiaireInfo | null,
  compactLevel = 0,
  forceCession = false
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isCessionTemplate = forceCession || (template?.content && (template.content.includes('CÉDANT') || template.content.includes('PROPRIÉTAIRE TERRIEN')) && template.content.includes('PROMOTEUR'));
  const isAttributionTemplate = !isCessionTemplate;
  const cl = compactLevel;
  const margin = isAttributionTemplate
    ? cl >= 4 ? 8 : cl >= 2 ? 10 : 12
    : cl >= 4 ? 12 : cl >= 2 ? 15 : 20;
  const contentWidth = pageWidth - 2 * margin;
  const bottomMargin = isAttributionTemplate
    ? cl >= 4 ? 5 : cl >= 2 ? 8 : 10
    : cl >= 4 ? 10 : cl >= 2 ? 15 : 25;
  let yPos = isAttributionTemplate
    ? cl >= 3 ? 6 : cl >= 1 ? 8 : 10
    : cl >= 3 ? 8 : cl >= 1 ? 10 : 15;
  const bodyFontSize = isAttributionTemplate
    ? cl >= 5 ? 8 : cl >= 4 ? 9 : cl >= 3 ? 10 : cl >= 2 ? 11 : cl >= 1 ? 12.5 : 14
    : cl >= 5 ? 8.5 : cl >= 4 ? 9.5 : cl >= 3 ? 10.5 : cl >= 2 ? 11.5 : cl >= 1 ? 13 : 14;
  const headingFontSize = isAttributionTemplate
    ? cl >= 5 ? 9 : cl >= 4 ? 10 : cl >= 3 ? 11 : cl >= 2 ? 12 : cl >= 1 ? 13.5 : 15
    : cl >= 5 ? 9.5 : cl >= 4 ? 10.5 : cl >= 3 ? 11.5 : cl >= 2 ? 12.5 : cl >= 1 ? 14 : 15;
  const bodyLineHeight = isAttributionTemplate
    ? cl >= 5 ? 3.6 : cl >= 4 ? 4 : cl >= 3 ? 4.4 : cl >= 2 ? 4.8 : cl >= 1 ? 5.4 : 6
    : cl >= 5 ? 3.8 : cl >= 4 ? 4.2 : cl >= 3 ? 4.6 : cl >= 2 ? 5 : cl >= 1 ? 5.6 : 6;
  const paragraphGap = isAttributionTemplate
    ? cl >= 4 ? 0.3 : cl >= 3 ? 0.5 : cl >= 2 ? 0.6 : cl >= 1 ? 0.8 : 1
    : cl >= 4 ? 0.5 : cl >= 3 ? 0.8 : cl >= 2 ? 1 : 1.5;

  const district = template?.district || "";
  const commune = template?.commune || "";
  const village = template?.village || villageName || lotissement.location || "";
  const chef = chefVillageName || "____________________";
  const chefTitre = chefVillageTitre || "";
  const lotOriginName = template?.lotissement_origin_name || lotissement.name;
  const arreteApprobation = template?.arrete_approbation || "";
  const pageBorderContentInset = !template?.page_border_enabled
    ? 0
    : isMotifBorderStyle(template.page_border_style)
      ? 16
      : template.page_border_style === 'ornate'
        ? 14
        : template.page_border_style === 'geometric'
          ? 12
          : template.page_border_style === 'double'
            ? 10
            : template.page_border_style === 'dashes'
              ? 9
              : 10;
  const headerLogoInsetX = Math.max(margin, pageBorderContentInset + 2);
  const headerLogoMinY = pageBorderContentInset > 0 ? pageBorderContentInset + 1 : 0;
  const headerBannerInsetX = template?.page_border_enabled
    ? headerLogoInsetX + 2
    : Math.max(0, margin - 5);

  if (pageBorderContentInset > 0) {
    yPos = Math.max(yPos, pageBorderContentInset + 4);
  }

  const hexToRgb = (hex: string, fallback = 255): [number, number, number] => {
    const normalized = hex.replace('#', '');
    return [
      parseInt(normalized.substring(0, 2), 16) || fallback,
      parseInt(normalized.substring(2, 4), 16) || fallback,
      parseInt(normalized.substring(4, 6), 16) || fallback,
    ];
  };

  const drawDocumentBackground = () => {
    const docBgColor1 = template?.doc_bg_color_1;
    if (!docBgColor1) return;

    const docBgColor2 = template?.doc_bg_color_2;
    const useGradient = template?.doc_bg_gradient && docBgColor2;

    if (useGradient) {
      const c1 = hexToRgb(docBgColor1);
      const c2 = hexToRgb(docBgColor2!);
      const steps = 60;
      const stripH = pageHeight / steps;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        doc.setFillColor(r, g, b);
        doc.rect(0, i * stripH, pageWidth, stripH + 0.5, 'F');
      }
      return;
    }

    const bg = hexToRgb(docBgColor1);
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  // drawPageBorder will be assigned later, after hexToRgb is defined
  let drawPageBorderFn = () => {};

  const ensureSpace = (neededHeight: number) => {
    if (yPos + neededHeight <= pageHeight - bottomMargin) return;
    doc.addPage();
    drawDocumentBackground();
    drawPageBorderFn();
    yPos = template?.page_border_enabled ? 15 : margin;
  };

  const writeWrappedLines = (
    lines: string | string[],
    options?: {
      align?: 'left' | 'center' | 'right';
      x?: number;
      lineHeight?: number;
      extraAfter?: number;
      width?: number;
      font?: 'normal' | 'bold' | 'italic';
      fontSize?: number;
    }
  ) => {
    const align = options?.align || 'left';
    const width = options?.width || contentWidth;
    const x = options?.x ?? (align === 'right' ? pageWidth - margin : align === 'center' ? pageWidth / 2 : margin);
    if (options?.fontSize) doc.setFontSize(options.fontSize);
    if (options?.font) doc.setFont('helvetica', options.font);

    const normalized = (Array.isArray(lines) ? lines : doc.splitTextToSize(lines, width)).flatMap((line) =>
      typeof line === 'string' ? doc.splitTextToSize(line, width) : line
    );

    const lineHeight = options?.lineHeight ?? 4.5;
    const extraAfter = options?.extraAfter ?? 1.5;
    ensureSpace(normalized.length * lineHeight + extraAfter + 2);
    doc.text(normalized, x, yPos, align === 'left' ? undefined : { align });
    yPos += normalized.length * lineHeight + extraAfter;
  };

  const writeMixedMarkdownLine = (line: string, lineHeight = 4.8) => {
    const segments = line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((segment) => ({
      bold: segment.startsWith('**') && segment.endsWith('**'),
      text: segment.startsWith('**') && segment.endsWith('**') ? segment.slice(2, -2) : segment,
    }));

    const wrappedLines: Array<Array<{ text: string; bold: boolean }>> = [];
    let currentLine: Array<{ text: string; bold: boolean }> = [];
    let currentWidth = 0;

    const flushCurrentLine = () => {
      if (currentLine.length === 0) return;
      wrappedLines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
    };

    for (const segment of segments) {
      const tokens = segment.text.split(/(\s+)/).filter((token) => token.length > 0);
      for (const token of tokens) {
        doc.setFont('helvetica', segment.bold ? 'bold' : 'normal');
        const tokenWidth = doc.getTextWidth(token);
        if (currentLine.length > 0 && currentWidth + tokenWidth > contentWidth) {
          flushCurrentLine();
        }
        currentLine.push({ text: token, bold: segment.bold });
        currentWidth += tokenWidth;
      }
    }
    flushCurrentLine();

    for (const wrappedLine of wrappedLines) {
      ensureSpace(lineHeight + 2);
      let cursorX = margin;
      for (const piece of wrappedLine) {
        doc.setFont('helvetica', piece.bold ? 'bold' : 'normal');
        doc.text(piece.text, cursorX, yPos);
        cursorX += doc.getTextWidth(piece.text);
      }
      yPos += lineHeight;
    }

    yPos += 0.5;
    doc.setFont('helvetica', 'normal');
  };

  // Draw decorative page border
  drawPageBorderFn = () => {
    if (!template?.page_border_enabled) return;
    const borderColor = template.page_border_color || '#8B4513';
    const borderStyle = template.page_border_style || 'geometric';
    const bc = hexToRgb(borderColor, 0);
    const bm = 4; // border margin from page edge
    const pw = pageWidth;
    const ph = pageHeight;

    if (isMotifBorderStyle(borderStyle)) {
      drawMotifBorder(doc, borderStyle, pw, ph, borderColor);
    } else if (borderStyle === 'geometric') {
      // Double rectangle frame with small repeated rectangles between them
      const outerOffset = bm;
      const innerOffset = bm + 6;
      
      // Outer rectangle
      doc.setDrawColor(bc[0], bc[1], bc[2]);
      doc.setLineWidth(0.8);
      doc.rect(outerOffset, outerOffset, pw - 2 * outerOffset, ph - 2 * outerOffset, 'S');
      
      // Inner rectangle
      doc.setLineWidth(0.5);
      doc.rect(innerOffset, innerOffset, pw - 2 * innerOffset, ph - 2 * innerOffset, 'S');
      
      // Small decorative rectangles between outer and inner borders
      doc.setFillColor(bc[0], bc[1], bc[2]);
      const blockSize = 2.5;
      const gap = 4;
      const midOffset = (outerOffset + innerOffset) / 2;
      
      // Top and bottom edges
      for (let x = outerOffset + gap; x < pw - outerOffset - gap; x += blockSize + gap) {
        doc.rect(x, midOffset - blockSize / 2, blockSize, blockSize, 'F');
        doc.rect(x, ph - midOffset - blockSize / 2, blockSize, blockSize, 'F');
      }
      // Left and right edges
      for (let y = outerOffset + gap; y < ph - outerOffset - gap; y += blockSize + gap) {
        doc.rect(midOffset - blockSize / 2, y, blockSize, blockSize, 'F');
        doc.rect(pw - midOffset - blockSize / 2, y, blockSize, blockSize, 'F');
      }
    } else if (borderStyle === 'dashes') {
      // Alternating colored dashes around the page
      doc.setDrawColor(bc[0], bc[1], bc[2]);
      doc.setLineWidth(2);
      const dashLen = 8;
      const gapLen = 4;
      const offset = bm + 3;
      
      // Top
      for (let x = offset; x < pw - offset; x += dashLen + gapLen) {
        doc.line(x, offset, Math.min(x + dashLen, pw - offset), offset);
      }
      // Bottom
      for (let x = offset; x < pw - offset; x += dashLen + gapLen) {
        doc.line(x, ph - offset, Math.min(x + dashLen, pw - offset), ph - offset);
      }
      // Left
      for (let y = offset; y < ph - offset; y += dashLen + gapLen) {
        doc.line(offset, y, offset, Math.min(y + dashLen, ph - offset));
      }
      // Right
      for (let y = offset; y < ph - offset; y += dashLen + gapLen) {
        doc.line(pw - offset, y, pw - offset, Math.min(y + dashLen, ph - offset));
      }
    } else if (borderStyle === 'double') {
      // Double line border
      doc.setDrawColor(bc[0], bc[1], bc[2]);
      doc.setLineWidth(1.2);
      doc.rect(bm, bm, pw - 2 * bm, ph - 2 * bm, 'S');
      doc.setLineWidth(0.5);
      doc.rect(bm + 4, bm + 4, pw - 2 * (bm + 4), ph - 2 * (bm + 4), 'S');
    } else if (borderStyle === 'ornate') {
      // Ornate border with corner decorations and dotted pattern
      const outerOffset = bm;
      const innerOffset = bm + 8;
      
      // Outer thick border
      doc.setDrawColor(bc[0], bc[1], bc[2]);
      doc.setLineWidth(1.5);
      doc.rect(outerOffset, outerOffset, pw - 2 * outerOffset, ph - 2 * outerOffset, 'S');
      
      // Inner thin border
      doc.setLineWidth(0.4);
      doc.rect(innerOffset, innerOffset, pw - 2 * innerOffset, ph - 2 * innerOffset, 'S');
      
      // Dots between borders
      doc.setFillColor(bc[0], bc[1], bc[2]);
      const dotR = 0.8;
      const dotGap = 5;
      const midOff = (outerOffset + innerOffset) / 2;
      
      for (let x = outerOffset + dotGap; x < pw - outerOffset; x += dotGap) {
        doc.circle(x, midOff, dotR, 'F');
        doc.circle(x, ph - midOff, dotR, 'F');
      }
      for (let y = outerOffset + dotGap; y < ph - outerOffset; y += dotGap) {
        doc.circle(midOff, y, dotR, 'F');
        doc.circle(pw - midOff, y, dotR, 'F');
      }
      
      // Corner squares
      const cornerSize = 4;
      const corners = [
        [outerOffset + 1, outerOffset + 1],
        [pw - outerOffset - cornerSize - 1, outerOffset + 1],
        [outerOffset + 1, ph - outerOffset - cornerSize - 1],
        [pw - outerOffset - cornerSize - 1, ph - outerOffset - cornerSize - 1],
      ];
      for (const [cx, cy] of corners) {
        doc.rect(cx, cy, cornerSize, cornerSize, 'FD');
      }
    }
    
    // Reset
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
  };

  drawDocumentBackground();
  drawPageBorderFn();

  // Draw watermark
  const drawWatermark = async (bodyTopY: number, bodyBottomY: number) => {
    const wmType = template?.watermark_type || 'none';
    if (wmType === 'none') return;
    const templateType = isCessionTemplate ? 'cession' : 'attribution';
    const opacity = template?.watermark_opacity ?? 0.1;
    const repeat = template?.watermark_repeat ?? true;
    const bodyHeight = bodyBottomY - bodyTopY;
    const placement = getAttestationWatermarkPlacement({
      templateType,
      watermarkAngle: template?.watermark_angle,
      watermarkRepeat: template?.watermark_repeat,
      watermarkPositionX: template?.watermark_position_x,
      watermarkPositionY: template?.watermark_position_y,
      watermarkRotation: template?.watermark_rotation,
    });
    const watermarkBounds = getAttestationWatermarkBounds({
      pageWidth,
      pageHeight,
      templateType,
      pageBorderEnabled: template?.page_border_enabled,
      pageBorderStyle: template?.page_border_style,
      contentArea: {
        left: margin,
        top: bodyTopY,
        right: pageWidth - margin,
        bottom: bodyBottomY,
      },
    });
    const centerXRatio = (placement.parsedPositionX ?? 50) / 100;
    const centerYRatio = (placement.parsedPositionY ?? 50) / 100;
    const centerX = watermarkBounds.left + (watermarkBounds.width * centerXRatio);
    const centerY = watermarkBounds.top + (watermarkBounds.height * centerYRatio);
    const mapAreaPoint = (xRatio: number, yRatio: number) => ({
      x: watermarkBounds.left + watermarkBounds.width * xRatio,
      y: watermarkBounds.top + watermarkBounds.height * yRatio,
    });
    const repeatedPositions = getAttestationRepeatedWatermarkRatios({
      centerX: centerXRatio,
      centerY: centerYRatio,
      isHorizontal: placement.isHorizontal,
    }).map(({ x, y }) => mapAreaPoint(x, y));
    const diagonalStartX = placement.isHorizontal
      ? watermarkBounds.left + watermarkBounds.width * 0.04
      : isCessionTemplate
        ? watermarkBounds.left + watermarkBounds.width * 0.01
        : watermarkBounds.left + watermarkBounds.width * 0.02;
    const diagonalStartY = placement.isHorizontal
      ? watermarkBounds.top + watermarkBounds.height / 2
      : isCessionTemplate
        ? watermarkBounds.top + watermarkBounds.height * 0.88
        : watermarkBounds.top + watermarkBounds.height * 0.95;
    const diagonalEndX = placement.isHorizontal
      ? watermarkBounds.right - watermarkBounds.width * 0.04
      : isCessionTemplate
        ? watermarkBounds.right - watermarkBounds.width * 0.01
        : watermarkBounds.right - watermarkBounds.width * 0.02;
    const diagonalEndY = placement.isHorizontal
      ? watermarkBounds.top + watermarkBounds.height / 2
      : isCessionTemplate
        ? watermarkBounds.top + watermarkBounds.height * 0.14
        : watermarkBounds.top + watermarkBounds.height * 0.05;
    const availableLength = placement.hasCustomPos
      ? Math.max(
          watermarkBounds.width * 0.28,
          2 * Math.min(centerX - watermarkBounds.left, watermarkBounds.right - centerX) * 0.9,
        )
      : placement.isHorizontal
        ? watermarkBounds.width * 0.92
        : Math.hypot(diagonalEndX - diagonalStartX, diagonalStartY - diagonalEndY) * 0.98;
    const angle = placement.isHorizontal ? 0 : (placement.customRotation ?? placement.defaultRotation);

    if (wmType === 'text' && template?.watermark_text) {
      const text = template.watermark_text;
      const grayVal = Math.round(230 - opacity * 150);
      doc.setTextColor(grayVal, grayVal, grayVal);
      doc.setFont('helvetica', 'bold');

      // Compute the exact font size that fills ~88% of the available length.
      // We measure with a probe font size, then scale by the target ratio so
      // the watermark text always uses the full content width with a
      // reasonable side padding — regardless of the text's character count.
      const fitFontSizeToWidth = (target: number) => {
        const probeSize = 40;
        doc.setFontSize(probeSize);
        const measuredWidth = doc.getTextWidth(text) || 1;
        const minFontSize = watermarkBounds.width * 0.06;
        const maxFontSize = watermarkBounds.width * 0.28;
        const computed = (target / measuredWidth) * probeSize;
        return Math.max(minFontSize, Math.min(maxFontSize, computed));
      };

      // Always center each watermark line on the horizontal axis of the
      // content area (pageWidth/2 when margins are symmetric). We cap the
      // target width to ~70% of the content width so a clear, visible padding
      // remains on both sides — making the centering visually obvious.
      const horizontalCenterX = watermarkBounds.left + watermarkBounds.width / 2;
      if (repeat && repeatedPositions.length > 0) {
        const targetLength = (placement.isHorizontal
          ? watermarkBounds.width
          : Math.hypot(diagonalEndX - diagonalStartX, diagonalStartY - diagonalEndY)) * 0.7;
        doc.setFontSize(fitFontSizeToWidth(targetLength));
        for (const position of repeatedPositions) {
          doc.text(text, horizontalCenterX, position.y, { align: 'center', angle, baseline: 'middle' });
        }
      } else if (!placement.isHorizontal && !placement.hasMeaningfulCustomPlacement) {
        // Single oblique watermark: render along the actual diagonal of the
        // content area (corner to corner), with the angle matching that
        // diagonal so the text follows it exactly.
        const dx = diagonalEndX - diagonalStartX;
        const dy = diagonalEndY - diagonalStartY;
        const diagAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const diagLength = Math.hypot(dx, dy);
        const diagCenterX = (diagonalStartX + diagonalEndX) / 2;
        const diagCenterY = (diagonalStartY + diagonalEndY) / 2;
        doc.setFontSize(fitFontSizeToWidth(diagLength * 0.92));
        doc.text(text, diagCenterX, diagCenterY, { align: 'center', angle: diagAngle, baseline: 'middle' });
      } else {
        const targetLength = availableLength * 0.7;
        doc.setFontSize(fitFontSizeToWidth(targetLength));
        doc.text(text, horizontalCenterX, centerY, { align: 'center', angle, baseline: 'middle' });
      }
      doc.setTextColor(...textColor);
    }

    if (wmType === 'image' && template?.watermark_image_url) {
      try {
        const imgBase64 = await loadImageAsBase64(template.watermark_image_url);
        if (imgBase64) {
          const imgSizeLarge = estimatePreviewWatermarkImageSize(watermarkBounds, true);
          const imgSizeSmall = estimatePreviewWatermarkImageSize(watermarkBounds, false);
          const gState = (doc as any).GState ? new (doc as any).GState({ opacity }) : null;
          const horizontalCenterX = watermarkBounds.left + watermarkBounds.width / 2;
          if (repeat && repeatedPositions.length > 0) {
            for (const position of repeatedPositions) {
              if (gState) (doc as any).setGState(gState);
              doc.addImage(imgBase64, 'PNG', horizontalCenterX - imgSizeSmall / 2, position.y - imgSizeSmall / 2, imgSizeSmall, imgSizeSmall);
            }
          } else {
            if (gState) (doc as any).setGState(gState);
            const imgX = horizontalCenterX - imgSizeLarge / 2;
            const imgY = centerY - imgSizeLarge / 2;
            doc.addImage(imgBase64, 'PNG', imgX, imgY, imgSizeLarge, imgSizeLarge);
          }
          // Reset opacity
          const resetState = (doc as any).GState ? new (doc as any).GState({ opacity: 1 }) : null;
          if (resetState) (doc as any).setGState(resetState);
        }
      } catch {}
    }
  };

  // Watermark will be drawn after the header, before footer
  // We store the body start Y after header rendering, then call drawWatermark
  let watermarkBodyTopY = 0;

  if (isCessionTemplate) {
    // === CESSION HEADER: District info text first, then logos aligned with title border ===
    const leftLogoUrl = template?.village_logo_url;
    const rightLogoUrl = template?.right_logo_url;
    const logoSize = cl >= 4 ? 18 : cl >= 2 ? 22 : 25;
    const leftLogoX = headerLogoInsetX;
    const rightLogoX = pageWidth - headerLogoInsetX - logoSize;
    const hasLogos = !!(leftLogoUrl || rightLogoUrl);

    // === CESSION OFFICIAL HEADER (2 columns: left / right) ===
    // Left column: Ministère, Région, Département, [District], Commune, Village
    // Right column: République, Devise
    const headerMinistere: string = (template as any)?.header_ministere || "";
    const headerRegion: string = (template as any)?.header_region || "";
    const headerDepartement: string = (template as any)?.header_departement || "";
    const headerRepublique: string = (template as any)?.header_republique || "République de Côte d'Ivoire";
    const headerDevise: string = (template as any)?.header_devise || "Union-Discipline-Travail";

    const leftCol: string[] = [];
    if (headerMinistere) leftCol.push(headerMinistere);
    if (headerRegion) leftCol.push(headerRegion);
    if (headerDepartement) leftCol.push(headerDepartement);
    if (district) leftCol.push(district);
    if (commune) leftCol.push(commune);
    if (village) leftCol.push(village);

    const rightCol: string[] = [];
    if (headerRepublique) rightCol.push(headerRepublique);
    if (headerDevise) rightCol.push(headerDevise);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);

    const colWidth = (pageWidth - margin * 2) / 2 - 4;
    const leftX = margin;
    const rightX = pageWidth - margin;
    const lineGap = 4;
    const blockGap = 2.5; // small gap between sub-blocks (Ministère wraps on multiple lines)

    let leftY = yPos;
    let rightY = yPos;

    // Left column: each entry may wrap to multiple lines
    for (const entry of leftCol) {
      const wrapped = doc.splitTextToSize(entry, colWidth);
      for (const line of wrapped) {
        doc.text(line, leftX, leftY);
        leftY += lineGap;
      }
      leftY += blockGap;
    }

    // Right column: short single-line entries, right-aligned
    for (const entry of rightCol) {
      doc.text(entry, rightX, rightY, { align: 'right' });
      rightY += lineGap + blockGap;
    }

    yPos = Math.max(leftY, rightY) + 2;

    // Colored dashes line (supports up to 4 alternating colors, last one stretched)
    const rawLineColor = template?.header_line_color || '#FF8C00';
    const traitsEnabled = rawLineColor !== 'none';
    
    if (traitsEnabled) {
      let dashColors: string[] = ['#FF8C00'];
      try { const parsed = JSON.parse(rawLineColor); if (Array.isArray(parsed)) dashColors = parsed; } catch { dashColors = [rawLineColor]; }
      doc.setLineWidth(1.5);
      const dashWidth = 12;
      const dashGap = 5;
      const numShortDashes = 4;
      const stretchedWidth = 35;
      const totalDashesWidth = numShortDashes * dashWidth + (numShortDashes) * dashGap + stretchedWidth;
      const dashStartX = (pageWidth - totalDashesWidth) / 2;
      for (let i = 0; i < numShortDashes; i++) {
        const dc = hexToRgb(dashColors[i % dashColors.length], 0);
        doc.setDrawColor(dc[0], dc[1], dc[2]);
        const x = dashStartX + i * (dashWidth + dashGap);
        doc.line(x, yPos, x + dashWidth, yPos);
      }
      const lastDc = hexToRgb(dashColors[numShortDashes % dashColors.length], 0);
      doc.setDrawColor(lastDc[0], lastDc[1], lastDc[2]);
      const lastX = dashStartX + numShortDashes * (dashWidth + dashGap);
      doc.line(lastX, yPos, lastX + stretchedWidth, yPos);
      yPos += 8;
    }

    // Title: ATTESTATION DE CESSION DE TERRAIN
    const titleText = 'ATTESTATION DE CESSION DE TERRAIN';
    const nText = `N° ${parcelle.plot_number || '..........'}`;
    
    const titleBorderColor = template?.title_border_color;
    
    if (titleBorderColor) {
      // Draw title + N° on a single line inside a rounded border
      const fullTitle = `ATTESTATION DE CESSION DE TERRAIN   ${nText}`;
      doc.setFont('helvetica', 'bold');

      const boxPaddingX = 12;
      const boxPaddingY = 3.5;
      // Ensure box doesn't overlap logos: keep inside logo boundaries with gap
      const logoGap = hasLogos ? logoSize + 8 : 0;
      const maxBoxW = pageWidth - 2 * margin - 2 * logoGap;
      const maxTextW = maxBoxW - boxPaddingX * 2;

      // Dynamically shrink font size to fit text within the available width
      let titleFontSize = 13;
      doc.setFontSize(titleFontSize);
      while (doc.getTextWidth(fullTitle) > maxTextW && titleFontSize > 8) {
        titleFontSize -= 0.5;
        doc.setFontSize(titleFontSize);
      }

      const fullW = doc.getTextWidth(fullTitle);
      const boxW = Math.min(fullW + boxPaddingX * 2, maxBoxW);
      const boxH = boxPaddingY * 2 + titleFontSize * 0.5;
      const boxX = (pageWidth - boxW) / 2;
      const boxY = yPos - 2;

      const bc = hexToRgb(titleBorderColor, 0);
      const titleBgColor = (template as any)?.title_bg_color;
      if (titleBgColor) {
        const bg = hexToRgb(titleBgColor, 255);
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.setDrawColor(bc[0], bc[1], bc[2]);
        doc.setLineWidth(1.2);
        doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'FD');
      } else {
        doc.setDrawColor(bc[0], bc[1], bc[2]);
        doc.setLineWidth(1.2);
        doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'S');
      }

      doc.setTextColor(...textColor);
      doc.text(fullTitle, pageWidth / 2, boxY + boxH / 2 + titleFontSize * 0.18, { align: 'center' });

      // Place logos on the SAME LINE as the title border, vertically centered
      const logoY = boxY + (boxH - logoSize) / 2;
      if (leftLogoUrl) {
        try {
          const logoBase64 = await loadImageAsBase64(leftLogoUrl);
          if (logoBase64) doc.addImage(logoBase64, 'PNG', leftLogoX, logoY, logoSize, logoSize);
        } catch {}
      }
      if (rightLogoUrl) {
        try {
          const logoBase64 = await loadImageAsBase64(rightLogoUrl);
          if (logoBase64) doc.addImage(logoBase64, 'PNG', rightLogoX, logoY, logoSize, logoSize);
        } catch {}
      }

      yPos = Math.max(boxY + boxH, logoY + logoSize) + 6;
    } else {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      const titleStartY = yPos;
      doc.text(titleText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 2;
      const titleWidth = doc.getTextWidth(titleText);
      doc.setDrawColor(...textColor);
      doc.setLineWidth(0.8);
      doc.line(pageWidth / 2 - titleWidth / 2, yPos, pageWidth / 2 + titleWidth / 2, yPos);
      yPos += 6;

      doc.setFontSize(11);
      doc.text(nText, pageWidth / 2, yPos, { align: 'center' });
      const nWidth = doc.getTextWidth(nText);
      yPos += 1.5;
      doc.line(pageWidth / 2 - nWidth / 2, yPos, pageWidth / 2 + nWidth / 2, yPos);

      // Place logos aligned with the title block (vertically centered)
      const titleBlockHeight = yPos - titleStartY + 4;
      const logoY = titleStartY - 4 + (titleBlockHeight - logoSize) / 2;
      if (leftLogoUrl) {
        try {
          const logoBase64 = await loadImageAsBase64(leftLogoUrl);
          if (logoBase64) doc.addImage(logoBase64, 'PNG', leftLogoX, logoY, logoSize, logoSize);
        } catch {}
      }
      if (rightLogoUrl) {
        try {
          const logoBase64 = await loadImageAsBase64(rightLogoUrl);
          if (logoBase64) doc.addImage(logoBase64, 'PNG', rightLogoX, logoY, logoSize, logoSize);
        } catch {}
      }

      yPos = Math.max(yPos + 10, logoY + logoSize + 6);
    }

    doc.setLineWidth(0.2);

  } else {
    // === ATTRIBUTION HEADER: Village logos + REPUBLIQUE + banner ===
    let headerLeftX = margin;
    const logoSize = cl >= 4 ? 18 : cl >= 2 ? 22 : 25;
    const logoStartY = Math.max(yPos - 3, headerLogoMinY);
    const logoBottomY = logoStartY + logoSize;
    const logoBannerGap = 6;
    const leftLogoX = headerLogoInsetX;
    const rightLogoX = pageWidth - headerLogoInsetX - logoSize;
    let hasVillageLogos = false;
    const villageLogoUrl = template?.village_logo_url;
    const rightLogoUrl = template?.right_logo_url;
    if (villageLogoUrl || rightLogoUrl) {
      // Left logo
      if (villageLogoUrl) {
        try {
          const logoBase64 = await loadImageAsBase64(villageLogoUrl);
          if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', leftLogoX, logoStartY, logoSize, logoSize);
            headerLeftX = leftLogoX + logoSize + 4;
            hasVillageLogos = true;
          }
        } catch {}
      }
      // Right logo (use right_logo_url if set, otherwise duplicate left logo)
      const actualRightLogoUrl = rightLogoUrl || villageLogoUrl;
      if (actualRightLogoUrl) {
        try {
          const rLogoBase64 = await loadImageAsBase64(actualRightLogoUrl);
          if (rLogoBase64) {
            doc.addImage(rLogoBase64, 'PNG', rightLogoX, logoStartY, logoSize, logoSize);
            hasVillageLogos = true;
          }
        } catch {}
      }
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text("REPUBLIQUE DE COTE D'IVOIRE", pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    if (commune) {
      doc.text(commune.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }
    if (village) {
      doc.text(`VILLAGE DE ${village.replace(/^Village de /i, '').trim().toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
    }
    doc.setFont('helvetica', 'normal');

    const bannerTopY = Math.max(
      yPos + 2,
      hasVillageLogos ? logoBottomY + 3 : yPos + 2
    );
    const bannerHeight = cl >= 4 ? 18 : cl >= 2 ? 20 : 24;
    const bannerColor1 = template?.banner_color_1 || '#003399';
    const bannerColor2 = template?.banner_color_2 || null;
    const useBannerGradient = template?.banner_gradient && bannerColor2;

    const bannerX = headerBannerInsetX;
    const bannerW = pageWidth - 2 * headerBannerInsetX;

    if (useBannerGradient) {
      const c1 = hexToRgb(bannerColor1, 0);
      const c2 = hexToRgb(bannerColor2!, 0);
      const steps = 40;
      const stripW = bannerW / steps;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        doc.setFillColor(r, g, b);
        doc.rect(bannerX + i * stripW, bannerTopY, stripW + 0.5, bannerHeight, 'F');
      }
    } else {
      const banner = hexToRgb(bannerColor1, 0);
      doc.setFillColor(banner[0], banner[1], banner[2]);
      doc.rect(bannerX, bannerTopY, bannerW, bannerHeight, 'F');
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`ATTESTATION D'ATTRIBUTION N°${parcelle.plot_number}`, pageWidth / 2, bannerTopY + 7, { align: 'center' });
    doc.setFontSize(8);
    doc.text(lotOriginName.toUpperCase(), pageWidth / 2, bannerTopY + 13, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    if (arreteApprobation) {
      doc.text(arreteApprobation, pageWidth / 2, bannerTopY + 19, { align: 'center' });
    }

    yPos = bannerTopY + bannerHeight + 6;
  }

  doc.setTextColor(...textColor);

  // Draw watermark in body zone only (between header and footer)
  watermarkBodyTopY = yPos;
  const watermarkBodyBottomY = pageHeight - bottomMargin;
  await drawWatermark(watermarkBodyTopY, watermarkBodyBottomY);
  // Reset text color after watermark
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);

  const templateContent = template?.content || '';
  let renderedTemplateContent = '';

  if (templateContent) {
    const variableData: Record<string, string> = {
      '{numero_lot}': parcelle.plot_number,
      '{ilot}': ilotName || '',
      '{nom_lotissement}': lotOriginName,
      '{superficie}': parcelle.area > 0 ? parcelle.area.toLocaleString('fr-FR') : '___',
      '{district}': district,
      '{commune}': commune,
      '{village}': village.replace(/^Village de /i, '').trim(),
      '{chef_village_name}': isCessionTemplate ? '' : chef,
      '{chef_village_titre}': isCessionTemplate ? '' : chefTitre,
      '{arrete_approbation}': arreteApprobation,
      '{beneficiaire_nom}': acquereur.name,
      '{beneficiaire_cni}': acquereur.cni_number || '___',
      '{beneficiaire_profession}': acquereur.profession || '___',
      '{beneficiaire_telephone}': formatAttestationPhone(acquereur.phone) || '___',
      '{beneficiaire_email}': acquereur.email || '___',
      '{beneficiaire_adresse}': acquereur.address || '___',
      '{beneficiaire_date_naissance}': acquereur.birth_date ? formatDate(acquereur.birth_date) : '___',
      '{beneficiaire_lieu_naissance}': acquereur.birth_place || '___',
      '{date_vente}': formatDate(saleDate),
      '{ville}': lotissement.city || agency?.city || '___',
      '{nom_agence}': agency?.name || '___',
      '{ancien_beneficiaire_nom}': ancienBeneficiaire?.nom || '',
      '{ancien_beneficiaire_cni}': ancienBeneficiaire?.cni_number || '',
      '{ancien_beneficiaire_telephone}': ancienBeneficiaire?.telephone || '',
      '{cedant_nom}': ancienBeneficiaire?.nom || '___',
      '{cedant_cni}': ancienBeneficiaire?.cni_number || '___',
      '{cedant_telephone}': formatAttestationPhone(ancienBeneficiaire?.telephone) || '___',
    };

    const finalContent = buildAttestationTemplateContent(templateContent, variableData, {
      ancienBeneficiaire,
    });
    renderedTemplateContent = finalContent;

    const lines = finalContent.split('\n');
    const baseFontSize = bodyFontSize;
    const lineSpacing = bodyLineHeight;

    // Find the signature line index (last line with exactly two **bold** labels) so we can skip
    // it during text rendering — it will be drawn separately by the dedicated signature block below.
    let signatureLineIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = [...lines[i].matchAll(/\*\*([^*\n]+?)\*\*/g)];
      if (m.length === 2) { signatureLineIndex = i; break; }
    }

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      if (lineIdx === signatureLineIndex) continue;
      const line = lines[lineIdx];
      const trimmed = line.trim();
      if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) continue;
      if (isCessionTemplate && /^N°[\.\s…]+$/i.test(trimmed.replace(/\*\*/g, ''))) continue;

      // Only filter pure signature labels (standalone lines that are JUST a signature heading),
      // never filter content lines that happen to mention these keywords.
      const cleanedLine = trimmed.replace(/^\#{1,4}\s*/, '').replace(/\*\*/g, '').replace(/_/g, '').toUpperCase().trim();
      if (cleanedLine === 'LE CHEF DU VILLAGE') continue;
      if (cleanedLine === 'SIGNATURE ET CACHET' || cleanedLine === 'SIGNATURE ET CACHET DU CHEF' || cleanedLine === 'CACHET ET SIGNATURE') continue;

      if (trimmed === '---') {
        ensureSpace(6);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        continue;
      }

      if (!trimmed) {
        yPos += isAttributionTemplate ? (cl >= 4 ? 0.5 : cl >= 2 ? 1 : 1.5) : (cl >= 4 ? 1 : cl >= 2 ? 2 : 3);
        continue;
      }

      if (trimmed.startsWith('### ')) {
        doc.setFontSize(headingFontSize);
        doc.setFont('helvetica', 'bold');
        writeWrappedLines(trimmed.substring(4), { align: 'center', x: pageWidth / 2, width: contentWidth - 10, lineHeight: 5, extraAfter: 2 });
        continue;
      }

      doc.setFontSize(baseFontSize);
      const plainText = trimmed.replace(/\*\*/g, '').trim();
      const isFaitA = plainText.toLowerCase().startsWith('fait à');
      const isCentered = !isFaitA && /^attestons/i.test(plainText);

      if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
        const textLine = trimmed.replace(/\*\*/g, '');
        doc.setFont('helvetica', isFaitA ? 'italic' : 'bold');
        writeWrappedLines(textLine, {
          align: isFaitA ? 'center' : isCentered ? 'center' : 'left',
          x: isFaitA ? pageWidth - margin - 30 : isCentered ? pageWidth / 2 : margin,
          width: isFaitA ? 60 : contentWidth,
          lineHeight: lineSpacing,
          extraAfter: 2,
        });
        doc.setFont('helvetica', 'normal');
        continue;
      }

      if (/^_[^_]+_$/.test(trimmed)) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        writeWrappedLines(trimmed.replace(/_/g, ''), { align: 'center', x: pageWidth / 2, width: contentWidth - 20, lineHeight: 4, extraAfter: 1 });
        doc.setFont('helvetica', 'normal');
        continue;
      }

      if (trimmed.includes('**')) {
        doc.setFontSize(baseFontSize);
        writeMixedMarkdownLine(trimmed, lineSpacing);
        continue;
      }

      doc.setFont('helvetica', 'normal');
      writeWrappedLines(trimmed, {
        align: isFaitA ? 'center' : isCentered ? 'center' : 'left',
        x: isFaitA ? pageWidth - margin - 30 : isCentered ? pageWidth / 2 : margin,
        width: isFaitA ? 60 : contentWidth,
        lineHeight: lineSpacing,
        extraAfter: 1.5,
      });
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const villageName2 = village.replace(/^Village de /i, '').trim() || '____________________';

    writeMixedMarkdownLine(`Je soussigné **${chef}** Chef du village de **${villageName2}** certifie`, 5);
    yPos += 2;
    writeMixedMarkdownLine(`Mme/Mlle/M **${acquereur.name}**`, 5);
    yPos += 2;

    if (acquereur.birth_date || acquereur.birth_place) {
      const birthParts = [];
      if (acquereur.birth_date) birthParts.push(formatDate(acquereur.birth_date));
      if (acquereur.birth_place) birthParts.push(`à ${acquereur.birth_place}`);
      writeWrappedLines(`Né(e) le : ${birthParts.join(' ')}`, { lineHeight: 5, extraAfter: 1 });
    }
    if (acquereur.address) {
      writeWrappedLines(`Adresse : ${acquereur.address}`, { lineHeight: 5, extraAfter: 1 });
    }
    if (acquereur.phone) {
      writeWrappedLines(`Tél : ${acquereur.phone}`, { lineHeight: 5, extraAfter: 1 });
    }
    if (acquereur.cni_number) {
      writeWrappedLines(`CNI N° : ${acquereur.cni_number}`, { lineHeight: 5, extraAfter: 2 });
    }

    writeMixedMarkdownLine(
      `Est attributaire du **Lot ${parcelle.plot_number}**${ilotName ? ` ilot **${ilotName}**` : ''} du lotissement **${lotOriginName.toUpperCase()}**, sise dans la commune de ${commune || '___'} suivant le plan d'urbanisation.`,
      5
    );
    yPos += 3;

    ensureSpace(8);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
    yPos += 5;

    writeWrappedLines(`Les lots cédés par le Chef ${chef} sont incontestables et irrévocables.`, { lineHeight: 5, extraAfter: 2 });
    writeWrappedLines(
      `Par conséquent Mme/Mlle/M ${acquereur.name} est autorisé(e) à engager la procédure en vigueur en Côte d'Ivoire pour user en toute quiétude de son droit de propriété.`,
      { lineHeight: 5, extraAfter: 2 }
    );
    writeWrappedLines(`En foi de quoi, nous lui délivrons cette attestation pour servir et valoir ce que de droit.`, { lineHeight: 5, extraAfter: 5 });

    const city = lotissement.city || agency?.city || '____________________';
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    writeWrappedLines(`Fait à ${city}, le ${formatDate(saleDate)}`, { align: 'right', x: pageWidth - margin, width: 90, lineHeight: 6, extraAfter: 2 });
  }

  const rightBlockCenter = pageWidth - margin - 30;
  const templateHasFaitA = renderedTemplateContent.toLowerCase().includes('fait à');
  if (!templateContent && !templateHasFaitA) {
    ensureSpace(30);
    yPos += 5;
    const city = lotissement.city || agency?.city || '____________________';
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...textColor);
    writeWrappedLines(`Fait à ${city}, le ${formatDate(saleDate)}`, { align: 'center', x: rightBlockCenter, width: 90, lineHeight: 6, extraAfter: 1 });
  }

  // Detect THE signature line in the template: the LAST line containing exactly two **bold** labels.
  // We scan from the bottom to prefer the actual signature row over any earlier bold pair
  // (e.g. a line like **{nom_agence}**   **{nom_lotissement}** used as a header).
  let leftLabel: string | null = null;
  let rightLabel: string | null = null;
  if (renderedTemplateContent) {
    const lines = renderedTemplateContent.split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const matches = [...lines[i].matchAll(/\*\*([^*\n]+?)\*\*/g)];
      if (matches.length === 2) {
        leftLabel = matches[0][1].trim();
        rightLabel = matches[1][1].trim();
        break;
      }
    }
  }
  const isCessionSignatures = !!(leftLabel && rightLabel);

  if (isCessionSignatures) {

    ensureSpace(cl >= 3 ? 25 : 45);
    const leftBlockCenter = margin + 30;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(leftLabel, leftBlockCenter, yPos, { align: 'center' });
    doc.text(rightLabel, rightBlockCenter, yPos, { align: 'center' });
    yPos += cl >= 3 ? 10 : 15;

    // Signature lines
    doc.setDrawColor(150, 150, 150);
    doc.line(leftBlockCenter - 25, yPos, leftBlockCenter + 25, yPos);
    doc.line(rightBlockCenter - 25, yPos, rightBlockCenter + 25, yPos);
    yPos += cl >= 3 ? 6 : 12;
  } else if (!templateContent) {
    ensureSpace(cl >= 3 ? 25 : 45);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('LE CHEF DU VILLAGE', rightBlockCenter, yPos, { align: 'center' });
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    writeWrappedLines(chef, { align: 'center', x: rightBlockCenter, width: 60, lineHeight: 4.5, extraAfter: 3 });

    const chefImageUrl = chefImages?.stamp_url || chefImages?.signature_url;
    if (chefImageUrl) {
      try {
        const response = await fetch(chefImageUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });

        if (base64) {
          ensureSpace(32);
          const imgWidth = 45;
          const imgHeight = 28;
          doc.addImage(base64, 'PNG', rightBlockCenter - imgWidth / 2, yPos, imgWidth, imgHeight);
          yPos += 30;
        }
      } catch {
        yPos += 12;
      }
    } else {
      ensureSpace(14);
      doc.setDrawColor(150, 150, 150);
      doc.line(rightBlockCenter - 25, yPos, rightBlockCenter + 25, yPos);
      yPos += 12;
    }
  }

  return doc;
};

// Helper to download PDF
export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};
