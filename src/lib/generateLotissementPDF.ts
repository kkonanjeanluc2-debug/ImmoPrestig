import jsPDF from "jspdf";
import { createPDFDocument, PDF_FONT } from "@/lib/pdfFont";
import { formatAmountForPDF, formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

interface AgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string | null;
  siret?: string | null;
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
  lotissement_origin_name?: string;
  arrete_approbation?: string;
  content?: string;
  banner_color_1?: string | null;
  banner_color_2?: string | null;
  banner_gradient?: boolean;
  doc_bg_color_1?: string | null;
  doc_bg_color_2?: string | null;
  doc_bg_gradient?: boolean;
}

export interface AttestationChefImages {
  stamp_url?: string | null;
  signature_url?: string | null;
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
  chefImages?: AttestationChefImages | null
): Promise<jsPDF> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 15;

  // ===== FOND DU DOCUMENT =====
  const docBgColor1 = template?.doc_bg_color_1;
  if (docBgColor1) {
    const hexToRgbBg = (hex: string): [number, number, number] => {
      const h = hex.replace("#", "");
      return [
        parseInt(h.substring(0, 2), 16) || 255,
        parseInt(h.substring(2, 4), 16) || 255,
        parseInt(h.substring(4, 6), 16) || 255,
      ];
    };
    const docBgColor2 = template?.doc_bg_color_2;
    const docBgGradient = template?.doc_bg_gradient && docBgColor2;
    
    if (docBgGradient) {
      const c1 = hexToRgbBg(docBgColor1);
      const c2 = hexToRgbBg(docBgColor2!);
      const steps = 60;
      const stripH = pageHeight / steps;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        doc.setFillColor(r, g, b);
        doc.rect(0, i * stripH, pageWidth, stripH + 0.5, "F");
      }
    } else {
      const bg = hexToRgbBg(docBgColor1);
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    }
  }

  const district = template?.district || "";
  const commune = template?.commune || "";
  const village = template?.village || villageName || lotissement.location || "";
  const chef = chefVillageName || "____________________";
  const chefTitre = chefVillageTitre || "";
  const lotOriginName = template?.lotissement_origin_name || lotissement.name;
  const arreteApprobation = template?.arrete_approbation || "";

  // ===== EN-TÊTE OFFICIEL =====
  // Ligne 1: District / République
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  if (district) {
    doc.text(district.toUpperCase(), margin, yPos);
  }
  doc.text("RÉPUBLIQUE DE CÔTE D'IVOIRE", pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  // Ligne 2: Commune / Devise
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (commune) {
    doc.text(commune.toUpperCase(), margin, yPos);
  }
  doc.text("Union - Discipline - Travail", pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  // Village
  if (village) {
    doc.text(village.toUpperCase(), margin, yPos);
  }
  yPos += 10;

  // ===== BANDEAU BLEU : TITRE =====
  const bannerHeight = 28;
  const bannerColor1 = template?.banner_color_1 || "#003399";
  const bannerColor2 = template?.banner_color_2 || null;
  const useGradient = template?.banner_gradient && bannerColor2;
  
  const hexToRgbLocal = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.substring(0, 2), 16) || 0,
      parseInt(h.substring(2, 4), 16) || 0,
      parseInt(h.substring(4, 6), 16) || 0,
    ];
  };

  if (useGradient) {
    // Simulate gradient with thin vertical strips
    const bannerX = margin - 5;
    const bannerW = pageWidth - 2 * (margin - 5);
    const c1 = hexToRgbLocal(bannerColor1);
    const c2 = hexToRgbLocal(bannerColor2!);
    const steps = 40;
    const stripW = bannerW / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      doc.setFillColor(r, g, b);
      doc.rect(bannerX + i * stripW, yPos - 5, stripW + 0.5, bannerHeight, "F");
    }
  } else {
    const bc = hexToRgbLocal(bannerColor1);
    doc.setFillColor(bc[0], bc[1], bc[2]);
    doc.rect(margin - 5, yPos - 5, pageWidth - 2 * (margin - 5), bannerHeight, "F");
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`ATTESTATION D'ATTRIBUTION N°${parcelle.plot_number}`, pageWidth / 2, yPos + 3, { align: "center" });
  
  doc.setFontSize(9);
  doc.text(`${lotOriginName.toUpperCase()}`, pageWidth / 2, yPos + 10, { align: "center" });
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (arreteApprobation) {
    doc.text(arreteApprobation, pageWidth / 2, yPos + 17, { align: "center" });
  }
  
  yPos += bannerHeight + 10;
  doc.setTextColor(...textColor);

  // ===== RENDER TEMPLATE CONTENT =====
  const templateContent = template?.content || "";
  
  if (templateContent) {
    // Build variable replacement map
    const variableData: Record<string, string> = {
      "{numero_lot}": parcelle.plot_number,
      "{ilot}": ilotName || "",
      "{nom_lotissement}": lotOriginName,
      "{superficie}": parcelle.area > 0 ? parcelle.area.toLocaleString("fr-FR") : "___",
      "{district}": district,
      "{commune}": commune,
      "{village}": village.replace(/^Village de /i, "").trim(),
      "{chef_village_name}": chef,
      "{chef_village_titre}": chefTitre,
      "{arrete_approbation}": arreteApprobation,
      "{beneficiaire_nom}": acquereur.name,
      "{beneficiaire_cni}": acquereur.cni_number || "___",
      "{beneficiaire_profession}": acquereur.profession || "___",
      "{beneficiaire_telephone}": acquereur.phone || "___",
      "{beneficiaire_email}": acquereur.email || "___",
      "{beneficiaire_adresse}": acquereur.address || "___",
      "{date_vente}": formatDate(saleDate),
      "{ville}": lotissement.city || agency?.city || "___",
      "{nom_agence}": agency?.name || "___",
    };

    // Replace variables
    let rendered = templateContent;
    for (const [key, value] of Object.entries(variableData)) {
      rendered = rendered.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || '____________________');
    }

    // Render Markdown lines to PDF
    const lines = rendered.split("\n");
    const maxWidth = pageWidth - 2 * margin;

    // Use smaller font sizes to fit on single page
    const baseFontSize = 9;
    const headingFontSize = 10;
    const lineSpacing = 4.5;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip headings that duplicate the banner (# and ##)
      if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) continue;
      // Skip signature block lines that are handled separately below
      const cleanedLine = trimmed.replace(/^\#{1,4}\s*/, "").replace(/\*\*/g, "").replace(/_/g, "").toUpperCase().trim();
      if (cleanedLine === "LE CHEF DU VILLAGE") continue;
      if (cleanedLine.includes("LE CHEF DU VILLAGE")) continue;
      if (chef && cleanedLine === chef.toUpperCase()) continue;
      if (cleanedLine === "SIGNATURE ET CACHET" || cleanedLine === "SIGNATURE ET CACHET DU CHEF" || cleanedLine === "CACHET ET SIGNATURE") continue;
      if (/^SIGNATURE/i.test(cleanedLine)) continue;

      if (trimmed === "---") {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        continue;
      }

      if (trimmed === "") {
        yPos += 3;
        continue;
      }

      if (trimmed.startsWith("### ")) {
        doc.setFontSize(headingFontSize);
        doc.setFont("helvetica", "bold");
        doc.text(trimmed.substring(4), pageWidth / 2, yPos, { align: "center" });
        yPos += 7;
        continue;
      }

      // Process inline bold **text** and italic _text_
      doc.setFontSize(baseFontSize);
      const plainText = trimmed.replace(/\*\*/g, "").trim();
      const isFaitA = plainText.toLowerCase().startsWith("fait à");
      const isCentered = !isFaitA && (plainText.startsWith("Attestons") || plainText.startsWith("attestons"));
      
      // Check if entire line is bold
      if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
        const text = trimmed.replace(/\*\*/g, "");
        doc.setFont("helvetica", isFaitA ? "italic" : "bold");
        const splitLines = doc.splitTextToSize(text, maxWidth);
        if (isFaitA) {
          const rightBlockCenter = pageWidth - margin - 30;
          doc.text(splitLines, rightBlockCenter, yPos, { align: "center" });
        } else if (isCentered) {
          doc.text(splitLines, pageWidth / 2, yPos, { align: "center" });
        } else {
          doc.text(splitLines, margin, yPos);
        }
        yPos += splitLines.length * lineSpacing + 2;
        doc.setFont("helvetica", "normal");
        continue;
      }

      // Check if line is italic
      if (/^_[^_]+_$/.test(trimmed)) {
        const text = trimmed.replace(/_/g, "");
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(text, pageWidth / 2, yPos, { align: "center" });
        yPos += 5;
        doc.setFont("helvetica", "normal");
        continue;
      }

      // Mixed content with bold segments
      if (trimmed.includes("**")) {
        let x = margin;
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/);
        for (const part of parts) {
          if (part.startsWith("**") && part.endsWith("**")) {
            doc.setFont("helvetica", "bold");
            const text = part.replace(/\*\*/g, "");
            doc.text(text, x, yPos);
            x += doc.getTextWidth(text);
          } else if (part) {
            doc.setFont("helvetica", "normal");
            doc.text(part, x, yPos);
            x += doc.getTextWidth(part);
          }
        }
        doc.setFont("helvetica", "normal");
        yPos += 5;
        continue;
      }

      // Plain text
      doc.setFont("helvetica", "normal");
      const splitLines = doc.splitTextToSize(trimmed, maxWidth);
      doc.text(splitLines, margin, yPos);
      yPos += splitLines.length * lineSpacing + 1.5;
    }
  } else {
    // Fallback: hardcoded body if no template content
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Nous soussignés,", pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    doc.setFont("helvetica", "bold");
    const villageName2 = village.replace(/^Village de /i, "").trim() || "____________________";
    let chefLine = `Monsieur ${chef}, Chef du village de ${villageName2},`;
    if (chefTitre) chefLine += `\n${chefTitre}`;
    const chefLines = doc.splitTextToSize(chefLine, pageWidth - 2 * margin);
    doc.text(chefLines, pageWidth / 2, yPos, { align: "center" });
    yPos += chefLines.length * 5 + 5;

    doc.setFontSize(11);
    doc.text("Attestons que :", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("M / Mme / Mlle :", margin, yPos);
    doc.setFont("helvetica", "bold");
    doc.text(acquereur.name, margin + 35, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 8;

    if (acquereur.cni_number) {
      doc.text("Type de pièce : CNI", margin, yPos);
      doc.text(`N° : ${acquereur.cni_number}`, pageWidth / 2, yPos);
      yPos += 8;
    }
    if (acquereur.profession) {
      doc.text(`Profession : ${acquereur.profession}`, margin, yPos);
      yPos += 8;
    }
    if (acquereur.phone || acquereur.email) {
      const contactParts = [acquereur.phone, acquereur.email].filter(Boolean);
      doc.text(`Contact : ${contactParts.join(" / ")}`, margin, yPos);
      yPos += 8;
    }
    if (acquereur.address) {
      doc.text(`Domicile : ${acquereur.address}`, margin, yPos);
      yPos += 8;
    }
    yPos += 5;

    doc.text("Est Attributaire du Lot : ", margin, yPos);
    const lotNumX = margin + doc.getTextWidth("Est Attributaire du Lot : ");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(parcelle.plot_number, lotNumX, yPos);
    let nextX = lotNumX + doc.getTextWidth(parcelle.plot_number) + 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (ilotName) {
      const ilotText = `Îlot ${ilotName}`;
      doc.text(ilotText, nextX, yPos);
    }
    doc.text(`du lotissement ${lotOriginName.toUpperCase()}`, margin, yPos + 6);
    yPos += 12;

    if (parcelle.area > 0) {
      doc.text(`Superficie : ${parcelle.area.toLocaleString("fr-FR")} m²`, margin, yPos);
      yPos += 8;
    }
    yPos += 5;

    doc.setFontSize(9);
    const legalText = `En foi de quoi, la présente Attestation qui annule toutes attestations antérieures sur ledit lot est délivrée en vue des formalités domaniales.`;
    const legalLines = doc.splitTextToSize(legalText, pageWidth - 2 * margin);
    doc.text(legalLines, margin, yPos);
    yPos += legalLines.length * 5 + 15;

    const city = lotissement.city || agency?.city || "____________________";
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Fait à ${city}, le ${formatDate(saleDate)}`, pageWidth - margin, yPos, { align: "right" });
  }

  // ===== BLOC SIGNATURE (aligné à droite) =====
  const rightBlockCenter = pageWidth - margin - 30;
  
  // "Fait à..." line - right aligned (only if not already in template content)
  const templateHasFaitA = templateContent && templateContent.toLowerCase().includes("fait à");
  if (!templateHasFaitA) {
    yPos += 5;
    const city = lotissement.city || agency?.city || "____________________";
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...textColor);
    doc.text(`Fait à ${city}, le ${formatDate(saleDate)}`, rightBlockCenter, yPos, { align: "center" });
    yPos += 6;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("LE CHEF DU VILLAGE", rightBlockCenter, yPos, { align: "center" });
  yPos += 5;
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(chef, rightBlockCenter, yPos, { align: "center" });
  yPos += 8;

  // Chef stamp and signature image
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
        const imgWidth = 45;
        const imgHeight = 28;
        doc.addImage(base64, "PNG", rightBlockCenter - imgWidth / 2, yPos, imgWidth, imgHeight);
        yPos += 30;
      }
    } catch {
      yPos += 12;
    }
  } else {
    doc.setDrawColor(150, 150, 150);
    doc.line(rightBlockCenter - 25, yPos, rightBlockCenter + 25, yPos);
    yPos += 12;
  }

  // No footer for attestation villageoise

  return doc;
};

// Helper to download PDF
export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};
