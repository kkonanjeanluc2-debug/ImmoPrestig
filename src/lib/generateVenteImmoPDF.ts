import jsPDF from "jspdf";
import { formatAmountWithCurrency, numberToWordsPDF, formatAmountForPDF } from "./pdfFormat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
 * Adds agency header with logo and contact info
 */
const addAgencyHeader = (doc: jsPDF, agency: AgencyData, yPos: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = yPos;

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
export const generatePromesseVenteImmo = (
  vente: VenteImmobiliereData,
  agency: AgencyData,
  validityDays: number = 90
): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = addAgencyHeader(doc, agency, 20);

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
  doc.text("ENTRE LES SOUSSIGNES :", margin, yPos);
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
    `Ci-apres denomme "LE VENDEUR"`,
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
    vente.acquereur.cni_number ? `CNI N : ${vente.acquereur.cni_number}` : null,
    vente.acquereur.birth_date ? `Ne(e) le : ${format(new Date(vente.acquereur.birth_date), "dd MMMM yyyy", { locale: fr })}` : null,
    vente.acquereur.birth_place ? `A : ${vente.acquereur.birth_place}` : null,
    vente.acquereur.profession ? `Profession : ${vente.acquereur.profession}` : null,
    vente.acquereur.address ? `Domicilie(e) a : ${vente.acquereur.address}` : null,
    vente.acquereur.phone ? `Tel : ${vente.acquereur.phone}` : null,
    `Ci-apres denomme "L'ACQUEREUR"`,
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
  const objetText = `Le Vendeur s'engage a vendre a l'Acquereur, qui accepte, le bien immobilier suivant :`;
  doc.text(objetText, margin, yPos);
  yPos += 8;

  const bienLines = [
    `- Designation : ${vente.bien.title}`,
    `- Type : ${vente.bien.property_type.charAt(0).toUpperCase() + vente.bien.property_type.slice(1)}`,
    `- Adresse : ${vente.bien.address}${vente.bien.city ? `, ${vente.bien.city}` : ""}`,
    vente.bien.area ? `- Superficie : ${vente.bien.area} m2` : null,
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
  const prixText = `Le prix de vente est fixe a la somme de ${formatAmountWithCurrency(vente.total_price)} (${numberToWordsPDF(vente.total_price)} francs CFA).`;
  const prixLines = doc.splitTextToSize(prixText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, prixLines.length * 6 + 10);
  doc.text(prixLines, margin, yPos);
  yPos += prixLines.length * 6 + 5;

  // Article 3 - Modalites
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3 - MODALITES DE PAIEMENT", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  if (vente.payment_type === "comptant") {
    doc.text("Le paiement sera effectue au comptant lors de la signature de l'acte de vente.", margin, yPos);
    yPos += 6;
  } else {
    const acompte = vente.down_payment || 0;
    const modalitesLines = [
      `- Acompte verse ce jour : ${formatAmountWithCurrency(acompte)}`,
      `- Solde : ${formatAmountWithCurrency(vente.total_price - acompte)}`,
      vente.monthly_payment ? `- Mensualite : ${formatAmountWithCurrency(vente.monthly_payment)}` : null,
      vente.total_installments ? `- Nombre d'echeances : ${vente.total_installments}` : null,
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
  doc.text("ARTICLE 4 - DUREE DE VALIDITE", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const dateSignature = new Date(vente.sale_date);
  const dateExpiration = new Date(dateSignature);
  dateExpiration.setDate(dateExpiration.getDate() + validityDays);

  const validiteText = `Cette promesse de vente est valable pour une duree de ${validityDays} jours a compter de sa signature, soit jusqu'au ${format(dateExpiration, "dd MMMM yyyy", { locale: fr })}.`;
  const validiteLines = doc.splitTextToSize(validiteText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, validiteLines.length * 6 + 20);
  doc.text(validiteLines, margin, yPos);
  yPos += validiteLines.length * 6 + 15;

  // Signatures - need space for signature block
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.text("Fait a _________________, le " + format(dateSignature, "dd MMMM yyyy", { locale: fr }), margin, yPos);
  yPos += 15;

  doc.text("LE VENDEUR", margin + 10, yPos);
  doc.text("L'ACQUEREUR", pageWidth - margin - 40, yPos);
  yPos += 25;

  doc.text("Signature :", margin + 10, yPos);
  doc.text("Signature :", pageWidth - margin - 40, yPos);

  return doc;
};

/**
 * Generates a Receipt PDF for a payment installment
 */
export const generateRecuVenteImmo = (
  echeance: {
    amount: number;
    paid_date: string;
    receipt_number?: string | null;
    payment_method?: string | null;
  },
  vente: VenteImmobiliereData,
  agency: AgencyData
): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = addAgencyHeader(doc, agency, 20);

  // Document title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RECU DE PAIEMENT", pageWidth / 2, yPos, { align: "center" });
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
  doc.text("Recu de :", margin, yPos);
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
  doc.text(`Situe a : ${vente.bien.address}`, margin, yPos);
  yPos += 10;

  if (echeance.payment_method) {
    const methodLabels: Record<string, string> = {
      especes: "Especes",
      virement: "Virement bancaire",
      cheque: "Cheque",
      mobile_money: "Mobile Money",
    };
    doc.text(`Mode de paiement : ${methodLabels[echeance.payment_method] || echeance.payment_method}`, margin, yPos);
    yPos += 10;
  }

  // Signature
  yPos += 20;
  doc.setFont("helvetica", "bold");
  doc.text("Signature du recepteur :", pageWidth - margin - 60, yPos);

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
export const generateContratReservationImmo = (
  reservation: ReservationData,
  agency: AgencyData,
  validityDays: number = 30
): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = addAgencyHeader(doc, agency, 20);

  // Document title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRAT DE RESERVATION", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref: CR-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Parties
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ENTRE LES SOUSSIGNES :", margin, yPos);
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
    `Ci-apres denomme "LE RESERVANT"`,
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
    reservation.acquereur.cni_number ? `CNI N : ${reservation.acquereur.cni_number}` : null,
    reservation.acquereur.birth_date ? `Ne(e) le : ${format(new Date(reservation.acquereur.birth_date), "dd MMMM yyyy", { locale: fr })}` : null,
    reservation.acquereur.birth_place ? `A : ${reservation.acquereur.birth_place}` : null,
    reservation.acquereur.profession ? `Profession : ${reservation.acquereur.profession}` : null,
    reservation.acquereur.address ? `Domicilie(e) a : ${reservation.acquereur.address}` : null,
    reservation.acquereur.phone ? `Tel : ${reservation.acquereur.phone}` : null,
    `Ci-apres denomme "LE RESERVATAIRE"`,
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
  doc.text("ARTICLE 1 - OBJET DE LA RESERVATION", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const objetText = `Le Reservant s'engage a reserver au profit du Reservataire le bien immobilier suivant :`;
  doc.text(objetText, margin, yPos);
  yPos += 8;

  const bienLines = [
    `- Designation : ${reservation.bien.title}`,
    `- Type : ${reservation.bien.property_type.charAt(0).toUpperCase() + reservation.bien.property_type.slice(1)}`,
    `- Adresse : ${reservation.bien.address}${reservation.bien.city ? `, ${reservation.bien.city}` : ""}`,
    reservation.bien.area ? `- Superficie : ${reservation.bien.area} m2` : null,
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
  const prixText = `Le prix de vente du bien est fixe a la somme de ${formatAmountWithCurrency(reservation.bien.price)} (${numberToWordsPDF(reservation.bien.price)} francs CFA).`;
  const prixLines = doc.splitTextToSize(prixText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, prixLines.length * 6 + 10);
  doc.text(prixLines, margin, yPos);
  yPos += prixLines.length * 6 + 5;

  // Article 3 - Depot de garantie
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3 - DEPOT DE GARANTIE", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const depositText = `En contrepartie de cette reservation, le Reservataire verse ce jour au Reservant la somme de ${formatAmountWithCurrency(reservation.deposit_amount)} (${numberToWordsPDF(reservation.deposit_amount)} francs CFA) a titre de depot de garantie.`;
  const depositLines = doc.splitTextToSize(depositText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, depositLines.length * 6 + 10);
  doc.text(depositLines, margin, yPos);
  yPos += depositLines.length * 6 + 3;

  if (reservation.payment_method) {
    const methodLabels: Record<string, string> = {
      especes: "Especes",
      virement: "Virement bancaire",
      cheque: "Cheque",
      mobile_money: "Mobile Money",
    };
    yPos = checkPageBreak(doc, yPos, 15);
    doc.text(`Mode de paiement : ${methodLabels[reservation.payment_method] || reservation.payment_method}`, margin, yPos);
    yPos += 8;
  }

  const conditionsDepot = [
    "Ce depot de garantie sera :",
    "- Impute sur le prix de vente en cas de realisation de la vente",
    "- Restitue au Reservataire en cas de non-realisation de la vente du fait du Reservant",
    "- Acquis au Reservant en cas de desistement du Reservataire sans motif legitime",
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
  doc.text("ARTICLE 4 - DUREE DE LA RESERVATION", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const dateReservation = new Date(reservation.reservation_date);
  const dateExpiration = new Date(dateReservation);
  dateExpiration.setDate(dateExpiration.getDate() + validityDays);

  const dureeText = `La presente reservation est consentie pour une duree de ${validityDays} jours a compter de ce jour, soit jusqu'au ${format(dateExpiration, "dd MMMM yyyy", { locale: fr })} inclus.`;
  const dureeLines = doc.splitTextToSize(dureeText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, dureeLines.length * 6 + 15);
  doc.text(dureeLines, margin, yPos);
  yPos += dureeLines.length * 6 + 3;

  yPos = checkPageBreak(doc, yPos, 15);
  doc.text("Passe ce delai, la reservation sera caduque de plein droit.", margin, yPos);
  yPos += 10;

  // Article 5 - Conditions
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 5 - CONDITIONS PARTICULIERES", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  if (reservation.notes) {
    const notesLines = doc.splitTextToSize(reservation.notes, pageWidth - 2 * margin);
    yPos = checkPageBreak(doc, yPos, notesLines.length * 6 + 10);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 6;
  } else {
    doc.text("Neant", margin, yPos);
    yPos += 6;
  }
  yPos += 10;

  // Signatures - need space for signature block
  yPos = checkPageBreak(doc, yPos, 60);
  doc.setFont("helvetica", "bold");
  doc.text("Fait a _________________, le " + format(dateReservation, "dd MMMM yyyy", { locale: fr }), margin, yPos);
  yPos += 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("En deux exemplaires originaux", margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LE RESERVANT", margin + 10, yPos);
  doc.text("LE RESERVATAIRE", pageWidth - margin - 45, yPos);
  yPos += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Lu et approuve)", margin + 10, yPos);
  doc.text("(Lu et approuve)", pageWidth - margin - 45, yPos);
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
export const generateContratVenteImmo = (
  vente: VenteImmobiliereData,
  agency: AgencyData
): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  
  // Add agency header
  let yPos = addAgencyHeader(doc, agency, 20);

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
  doc.text("ENTRE LES SOUSSIGNES :", margin, yPos);
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
    `Ci-apres denomme "LE VENDEUR"`,
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
    vente.acquereur.cni_number ? `CNI N : ${vente.acquereur.cni_number}` : null,
    vente.acquereur.birth_date ? `Ne(e) le : ${format(new Date(vente.acquereur.birth_date), "dd MMMM yyyy", { locale: fr })}` : null,
    vente.acquereur.birth_place ? `A : ${vente.acquereur.birth_place}` : null,
    vente.acquereur.profession ? `Profession : ${vente.acquereur.profession}` : null,
    vente.acquereur.address ? `Domicilie(e) a : ${vente.acquereur.address}` : null,
    vente.acquereur.phone ? `Tel : ${vente.acquereur.phone}` : null,
    `Ci-apres denomme "L'ACQUEREUR"`,
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
  const objetText = `Par le present contrat, le Vendeur cede a l'Acquereur, qui accepte, la pleine propriete du bien immobilier suivant :`;
  const objetLines = doc.splitTextToSize(objetText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, objetLines.length * 6 + 10);
  doc.text(objetLines, margin, yPos);
  yPos += objetLines.length * 6 + 3;

  const bienLines = [
    `- Designation : ${vente.bien.title}`,
    `- Type : ${vente.bien.property_type.charAt(0).toUpperCase() + vente.bien.property_type.slice(1)}`,
    `- Adresse : ${vente.bien.address}${vente.bien.city ? `, ${vente.bien.city}` : ""}`,
    vente.bien.area ? `- Superficie : ${vente.bien.area} m2` : null,
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
  const prixText = `La presente vente est consentie et acceptee moyennant le prix de ${formatAmountWithCurrency(vente.total_price)} (${numberToWordsPDF(vente.total_price)} francs CFA).`;
  const prixLines = doc.splitTextToSize(prixText, pageWidth - 2 * margin);
  yPos = checkPageBreak(doc, yPos, prixLines.length * 6 + 10);
  doc.text(prixLines, margin, yPos);
  yPos += prixLines.length * 6 + 5;

  // Article 3 - Modalites de paiement
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 3 - MODALITES DE PAIEMENT", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  
  if (vente.payment_type === "comptant") {
    doc.text("Le paiement du prix est effectue comptant ce jour.", margin, yPos);
    yPos += 6;
    yPos = checkPageBreak(doc, yPos, 15);
    doc.text("Le Vendeur reconnait avoir recu la totalite du prix et en delivre quittance.", margin, yPos);
    yPos += 10;
  } else {
    const acompte = vente.down_payment || 0;
    doc.text("Le paiement du prix est effectue comme suit :", margin, yPos);
    yPos += 8;
    
    const modalitesLines = [
      `- Acompte verse : ${formatAmountWithCurrency(acompte)}`,
      `- Solde restant : ${formatAmountWithCurrency(vente.total_price - acompte)}`,
      vente.monthly_payment ? `- Mensualite : ${formatAmountWithCurrency(vente.monthly_payment)}` : null,
      vente.total_installments ? `- Nombre d'echeances : ${vente.total_installments}` : null,
    ].filter(Boolean) as string[];

    modalitesLines.forEach((line) => {
      yPos = checkPageBreak(doc, yPos, 10);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
    yPos += 5;
    
    yPos = checkPageBreak(doc, yPos, 15);
    doc.text("L'Acquereur s'engage a regler les echeances aux dates convenues.", margin, yPos);
    yPos += 10;
  }

  // Article 4 - Transfert de propriete
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 4 - TRANSFERT DE PROPRIETE", margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  const transfertText = `Le transfert de propriete sera effectif a compter de la signature du present acte. L'Acquereur aura la jouissance du bien a compter de ce jour.`;
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
  const garantiesText = `Le Vendeur garantit l'Acquereur contre tout trouble de jouissance et toute eviction. Le bien est vendu libre de toute hypotheque ou charge.`;
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
  doc.text("Tous les frais afferents a la presente vente sont a la charge de l'Acquereur.", margin, yPos);
  yPos += 15;

  // Signatures - need space for signature block
  yPos = checkPageBreak(doc, yPos, 60);
  const dateVente = new Date(vente.sale_date);
  doc.setFont("helvetica", "bold");
  doc.text("Fait a _________________, le " + format(dateVente, "dd MMMM yyyy", { locale: fr }), margin, yPos);
  yPos += 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("En deux exemplaires originaux", margin, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LE VENDEUR", margin + 10, yPos);
  doc.text("L'ACQUEREUR", pageWidth - margin - 40, yPos);
  yPos += 5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("(Lu et approuve)", margin + 10, yPos);
  doc.text("(Lu et approuve)", pageWidth - margin - 40, yPos);
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Signature :", margin + 10, yPos);
  doc.text("Signature :", pageWidth - margin - 40, yPos);

  return doc;
};
