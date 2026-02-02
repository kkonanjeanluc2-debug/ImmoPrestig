import jsPDF from "jspdf";
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
export const generateFicheReservation = async (
  parcelle: ParcelleInfo,
  lotissement: LotissementInfo,
  acquereur: AcquereurInfo,
  agency: AgencyInfo | null,
  reservationDate: string = new Date().toISOString(),
  depositPercentage: number = 30
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(doc, agency, "FICHE DE RÉSERVATION");

  // Reference number
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const refNumber = `REF-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Référence : ${refNumber}`, pageWidth - margin, yPos, { align: "right" });
  doc.text(`Date : ${formatDate(reservationDate)}`, pageWidth - margin, yPos + 5, { align: "right" });
  
  yPos += 15;

  // Lotissement section
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("LOTISSEMENT", margin + 5, yPos + 5.5);
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(`Nom : ${lotissement.name}`, margin, yPos);
  yPos += 6;
  doc.text(`Localisation : ${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}`, margin, yPos);
  
  yPos += 15;

  // Parcelle section
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("PARCELLE RÉSERVÉE", margin + 5, yPos + 5.5);
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(`Numéro de lot : ${parcelle.plot_number}`, margin, yPos);
  yPos += 6;
  doc.text(`Superficie : ${formatAmountForPDF(parcelle.area)} m²`, margin, yPos);
  yPos += 6;
  doc.text(`Prix : ${formatAmountWithCurrency(parcelle.price)}`, margin, yPos);
  
  yPos += 15;

  // Acquéreur section
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("RÉSERVATAIRE", margin + 5, yPos + 5.5);
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text(`Nom et prénoms : ${acquereur.name}`, margin, yPos);
  yPos += 6;
  if (acquereur.birth_date || acquereur.birth_place) {
    const birthInfo = [];
    if (acquereur.birth_date) birthInfo.push(`né(e) le ${formatDate(acquereur.birth_date)}`);
    if (acquereur.birth_place) birthInfo.push(`à ${acquereur.birth_place}`);
    doc.text(birthInfo.join(" "), margin, yPos);
    yPos += 6;
  }
  if (acquereur.profession) {
    doc.text(`Profession : ${acquereur.profession}`, margin, yPos);
    yPos += 6;
  }
  if (acquereur.cni_number) {
    doc.text(`N° CNI : ${acquereur.cni_number}`, margin, yPos);
    yPos += 6;
  }
  if (acquereur.phone) {
    doc.text(`Téléphone : ${acquereur.phone}`, margin, yPos);
    yPos += 6;
  }
  if (acquereur.email) {
    doc.text(`Email : ${acquereur.email}`, margin, yPos);
    yPos += 6;
  }
  if (acquereur.address) {
    doc.text(`Adresse : ${acquereur.address}`, margin, yPos);
    yPos += 6;
  }

  yPos += 15;

  // Conditions
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("CONDITIONS DE LA RÉSERVATION", margin + 5, yPos + 5.5);
  
  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  
  const conditions = [
    "1. La présente réservation est valable pour une durée de trente (30) jours à compter de la date de signature.",
    `2. Le réservataire s'engage à verser un acompte de ${depositPercentage}% du prix total dans les quinze (15) jours suivant la signature.`,
    "3. En cas de non-respect des délais de paiement, la réservation sera annulée de plein droit.",
    "4. Les frais de notaire et d'enregistrement sont à la charge de l'acquéreur.",
    "5. La parcelle réservée ne peut faire l'objet d'aucune cession ou sous-location."
  ];
  
  conditions.forEach(condition => {
    const splitLines = doc.splitTextToSize(condition, maxWidth);
    splitLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 2;
  });

  yPos += 20;

  // Signatures
  const colWidth = (maxWidth - 20) / 2;
  
  doc.setFontSize(10);
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
  const doc = new jsPDF();
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
  
  let article2 = `La presente vente est consentie et acceptee moyennant le prix principal de ${formatAmountWithCurrency(vente.total_price)} (${numberToWordsPDF(vente.total_price)} francs CFA).`;
  
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
  depositAmount: number = 0
): Promise<jsPDF> => {
  const doc = new jsPDF();
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
  const article2 = `La vente sera consentie moyennant le prix de ${formatAmountWithCurrency(parcelle.price)} (${numberToWordsPDF(parcelle.price)} francs CFA).\n\nA titre de depot de garantie et en contrepartie de l'immobilisation du bien, le Beneficiaire verse ce jour au Promettant la somme de ${formatAmountWithCurrency(calculatedDeposit)} (${numberToWordsPDF(calculatedDeposit)} francs CFA), representant ${depositPercentage}% du prix de vente.\n\nCette somme sera imputee sur le prix de vente lors de la signature de l'acte definitif.`;

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
  const doc = new jsPDF();
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

// Helper to download PDF
export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};
