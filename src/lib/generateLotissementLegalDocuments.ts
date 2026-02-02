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

interface LotissementInfo {
  name: string;
  location: string;
  city?: string | null;
  total_area?: number | null;
  total_plots?: number | null;
}

export interface PVFamilleData {
  familyName: string;
  representativeName: string;
  representativeRole: string;
  members: { name: string; role: string; cniNumber?: string }[];
  landDescription: string;
  landArea: number;
  landLocation: string;
  decisions: string[];
  witnesses: { name: string; cniNumber?: string }[];
  meetingDate: string;
  meetingPlace: string;
}

export interface ConventionData {
  partiesVendeur: string;
  partiesAcquereur: string;
  landDescription: string;
  landArea: number;
  price: number;
  paymentTerms: string;
  conditions: string[];
  signatureDate: string;
}

export interface ContratPrefinancementData {
  investorName: string;
  investorAddress: string;
  investorCni: string;
  investorPhone: string;
  investmentAmount: number;
  investmentPurpose: string;
  returnPercentage: number;
  duration: string;
  paymentSchedule: string;
  guarantees: string[];
  contractDate: string;
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

const addHeader = async (
  doc: jsPDF,
  agency: AgencyInfo | null,
  title: string,
  subtitle?: string
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  if (agency) {
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
    if (agency.phone) contactParts.push(`Tel: ${agency.phone}`);
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

  if (subtitle) {
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
  }

  return yPos + 15;
};

const addFooter = (doc: jsPDF, agency: AgencyInfo | null, pageNum: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...lightGray);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  doc.text(`Page ${pageNum}/${totalPages}`, margin, pageHeight - 10);

  if (agency) {
    doc.text(
      `${agency.name} - Document genere le ${formatDate(new Date().toISOString())}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
};

const margin = 20;

const checkPageBreak = (doc: jsPDF, yPos: number, neededSpace: number = 40): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (yPos + neededSpace > pageHeight - 30) {
    doc.addPage();
    return margin;
  }
  return yPos;
};

// ========================================
// PV DE FAMILLE
// ========================================
export const generatePVFamille = async (
  data: PVFamilleData,
  lotissement: LotissementInfo,
  agency: AgencyInfo | null
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(
    doc,
    agency,
    "PROCES-VERBAL DE REUNION DE FAMILLE",
    `Lotissement ${lotissement.name}`
  );

  // Date et lieu
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const intro = `L'an ${new Date(data.meetingDate).getFullYear()}, le ${formatDate(data.meetingDate)}, a ${data.meetingPlace}, s'est tenue une reunion de famille sous la presidence de ${data.representativeName}, ${data.representativeRole} de la famille ${data.familyName}.`;

  const introLines = doc.splitTextToSize(intro, maxWidth);
  introLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Membres présents
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("MEMBRES PRESENTS", margin + 5, yPos + 5.5);

  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  data.members.forEach((member) => {
    yPos = checkPageBreak(doc, yPos, 10);
    const memberText = `- ${member.name}, ${member.role}${member.cniNumber ? ` (CNI: ${member.cniNumber})` : ""}`;
    doc.text(memberText, margin, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Description du terrain
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("OBJET DE LA REUNION", margin + 5, yPos + 5.5);

  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const landDesc = `La reunion a pour objet la gestion du terrain familial decrit comme suit :\n\nDescription : ${data.landDescription}\nSuperficie : ${formatAmountForPDF(data.landArea)} m²\nLocalisation : ${data.landLocation}`;

  const landLines = doc.splitTextToSize(landDesc, maxWidth);
  landLines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Décisions prises
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("DECISIONS PRISES A L'UNANIMITE", margin + 5, yPos + 5.5);

  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  data.decisions.forEach((decision, index) => {
    yPos = checkPageBreak(doc, yPos, 15);
    const decisionText = `${index + 1}. ${decision}`;
    const decisionLines = doc.splitTextToSize(decisionText, maxWidth);
    decisionLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 3;
  });

  yPos += 10;

  // Témoins
  if (data.witnesses.length > 0) {
    yPos = checkPageBreak(doc, yPos, 40);
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, yPos, maxWidth, 8, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("TEMOINS", margin + 5, yPos + 5.5);

    yPos += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);

    data.witnesses.forEach((witness) => {
      const witnessText = `- ${witness.name}${witness.cniNumber ? ` (CNI: ${witness.cniNumber})` : ""}`;
      doc.text(witnessText, margin, yPos);
      yPos += 6;
    });
  }

  yPos += 15;

  // Signatures
  yPos = checkPageBreak(doc, yPos, 60);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("SIGNATURES DES MEMBRES", margin, yPos);

  yPos += 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  // Grille de signatures (2 colonnes)
  const colWidth = (maxWidth - 20) / 2;
  let xPos = margin;
  let signatureCount = 0;

  data.members.forEach((member) => {
    if (signatureCount % 2 === 0 && signatureCount > 0) {
      yPos += 25;
      xPos = margin;
    }
    if (signatureCount % 2 === 0) {
      yPos = checkPageBreak(doc, yPos, 30);
    }

    doc.text(member.name, xPos, yPos);
    doc.text(`(${member.role})`, xPos, yPos + 5);
    doc.setDrawColor(150, 150, 150);
    doc.line(xPos, yPos + 20, xPos + colWidth - 10, yPos + 20);

    xPos = margin + colWidth + 20;
    signatureCount++;
  });

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, agency, i, totalPages);
  }

  return doc;
};

// ========================================
// CONVENTION
// ========================================
export const generateConvention = async (
  data: ConventionData,
  lotissement: LotissementInfo,
  agency: AgencyInfo | null
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(
    doc,
    agency,
    "CONVENTION DE CESSION DE DROITS FONCIERS",
    `Lotissement ${lotissement.name}`
  );

  // Préambule
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const preambule = `Entre les soussignes,

D'une part :
${data.partiesVendeur}
Ci-apres denomme "LE CEDANT"

D'autre part :
${data.partiesAcquereur}
Ci-apres denomme "LE CESSIONNAIRE"

Il a ete convenu et arrete ce qui suit :`;

  const preambuleLines = doc.splitTextToSize(preambule, maxWidth);
  preambuleLines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 1 - Objet
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 1 : OBJET DE LA CONVENTION", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article1 = `Le Cedant cede au Cessionnaire, qui accepte, les droits coutumiers et/ou de propriete sur le terrain decrit comme suit :

Description : ${data.landDescription}
Superficie : ${formatAmountForPDF(data.landArea)} m²
Localisation : ${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}`;

  const article1Lines = doc.splitTextToSize(article1, maxWidth);
  article1Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 2 - Prix
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 2 : PRIX ET MODALITES DE PAIEMENT", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article2 = `La presente cession est consentie et acceptee moyennant le prix de ${formatAmountWithCurrency(data.price)} (${numberToWordsPDF(data.price)} francs CFA).

${data.paymentTerms}`;

  const article2Lines = doc.splitTextToSize(article2, maxWidth);
  article2Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 3 - Garanties
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 3 : GARANTIES DU CEDANT", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article3 = `Le Cedant declare et garantit :
- Etre le seul et unique proprietaire ou detenteur des droits sur le terrain objet de la presente convention
- Que le terrain est libre de toute hypotheque, servitude ou charge quelconque
- Garantir le Cessionnaire contre toute eviction et troubles de jouissance
- Que le terrain n'a fait l'objet d'aucune cession anterieure`;

  const article3Lines = doc.splitTextToSize(article3, maxWidth);
  article3Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 4 - Conditions
  if (data.conditions.length > 0) {
    yPos = checkPageBreak(doc, yPos, 40);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("ARTICLE 4 : CONDITIONS PARTICULIERES", margin, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);

    data.conditions.forEach((condition, index) => {
      yPos = checkPageBreak(doc, yPos, 15);
      const conditionText = `${index + 1}. ${condition}`;
      const conditionLines = doc.splitTextToSize(conditionText, maxWidth);
      conditionLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += 5;
      });
      yPos += 2;
    });
  }

  yPos += 10;

  // Article 5 - Litiges
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 5 : REGLEMENT DES LITIGES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article5 = `Tout differend relatif a l'interpretation ou a l'execution de la presente convention sera regle a l'amiable. A defaut, les parties conviennent de soumettre le litige aux juridictions competentes d'Abidjan, Cote d'Ivoire.`;

  const article5Lines = doc.splitTextToSize(article5, maxWidth);
  article5Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Clause finale
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "italic");
  const clauseFinale = `Fait a ${lotissement.city || "Abidjan"}, le ${formatDate(data.signatureDate)}, en deux (02) exemplaires originaux.`;
  doc.text(clauseFinale, margin, yPos);

  yPos += 20;

  // Signatures
  yPos = checkPageBreak(doc, yPos, 50);
  const colWidth = (maxWidth - 20) / 2;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("LE CEDANT", margin, yPos);
  doc.text("LE CESSIONNAIRE", margin + colWidth + 20, yPos);

  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("(Signature precedee de", margin, yPos);
  doc.text("(Signature precedee de", margin + colWidth + 20, yPos);
  yPos += 4;
  doc.text('"Lu et approuve")', margin, yPos);
  doc.text('"Lu et approuve")', margin + colWidth + 20, yPos);

  yPos += 25;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, yPos, margin + colWidth, yPos);
  doc.line(margin + colWidth + 20, yPos, pageWidth - margin, yPos);

  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, agency, i, totalPages);
  }

  return doc;
};

// ========================================
// CONTRAT DE PREFINANCEMENT
// ========================================
export const generateContratPrefinancement = async (
  data: ContratPrefinancementData,
  lotissement: LotissementInfo,
  agency: AgencyInfo | null
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(
    doc,
    agency,
    "CONTRAT DE PREFINANCEMENT",
    `Projet : ${lotissement.name}`
  );

  // Préambule
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const preambule = `Entre les soussignes,

D'une part :
${agency?.name || "Le Promoteur"}, ${agency?.address ? `sis a ${agency.address}` : ""} ${agency?.city || ""}${agency?.siret ? `, RCCM : ${agency.siret}` : ""}, represente par son responsable dument habilite,
Ci-apres denomme "LE PROMOTEUR"

D'autre part :
${data.investorName}, demeurant a ${data.investorAddress}, CNI N° ${data.investorCni}, Tel: ${data.investorPhone},
Ci-apres denomme "L'INVESTISSEUR"

Il a ete convenu ce qui suit :`;

  const preambuleLines = doc.splitTextToSize(preambule, maxWidth);
  preambuleLines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 1 - Objet
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 1 : OBJET DU CONTRAT", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article1 = `Le present contrat a pour objet de definir les conditions dans lesquelles l'Investisseur participe au prefinancement du projet immobilier "${lotissement.name}" situe a ${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}.

Destination des fonds : ${data.investmentPurpose}`;

  const article1Lines = doc.splitTextToSize(article1, maxWidth);
  article1Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 2 - Montant
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 2 : MONTANT DE L'INVESTISSEMENT", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article2 = `L'Investisseur s'engage a verser au Promoteur la somme de ${formatAmountWithCurrency(data.investmentAmount)} (${numberToWordsPDF(data.investmentAmount)} francs CFA) a titre de prefinancement du projet.`;

  const article2Lines = doc.splitTextToSize(article2, maxWidth);
  article2Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 3 - Durée et rendement
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 3 : DUREE ET RENDEMENT", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article3 = `3.1 Duree : Le present contrat est conclu pour une duree de ${data.duration}.

3.2 Rendement : En contrepartie de son investissement, l'Investisseur beneficiera d'un rendement de ${data.returnPercentage}% sur le montant investi.

3.3 Calendrier de remboursement : ${data.paymentSchedule}`;

  const article3Lines = doc.splitTextToSize(article3, maxWidth);
  article3Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 4 - Garanties
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 4 : GARANTIES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le Promoteur offre les garanties suivantes a l'Investisseur :", margin, yPos);
  yPos += 7;

  data.guarantees.forEach((guarantee, index) => {
    yPos = checkPageBreak(doc, yPos, 12);
    const guaranteeText = `${index + 1}. ${guarantee}`;
    const guaranteeLines = doc.splitTextToSize(guaranteeText, maxWidth);
    guaranteeLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
    yPos += 2;
  });

  yPos += 10;

  // Article 5 - Obligations
  yPos = checkPageBreak(doc, yPos, 60);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 5 : OBLIGATIONS DES PARTIES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article5 = `5.1 Obligations du Promoteur :
- Utiliser les fonds exclusivement pour le projet designe
- Fournir des rapports d'avancement trimestriels
- Rembourser l'investissement selon le calendrier convenu
- Informer l'Investisseur de tout evenement affectant le projet

5.2 Obligations de l'Investisseur :
- Verser les fonds selon le calendrier convenu
- Ne pas ceder ses droits sans l'accord prealable du Promoteur
- Respecter la confidentialite des informations relatives au projet`;

  const article5Lines = doc.splitTextToSize(article5, maxWidth);
  article5Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Article 6 - Résiliation
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 6 : RESILIATION", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article6 = `En cas de manquement grave de l'une des parties a ses obligations, l'autre partie pourra resilier le present contrat apres mise en demeure restee sans effet pendant quinze (15) jours.`;

  const article6Lines = doc.splitTextToSize(article6, maxWidth);
  article6Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // Clause finale
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "italic");
  const clauseFinale = `Fait a ${lotissement.city || "Abidjan"}, le ${formatDate(data.contractDate)}, en deux (02) exemplaires originaux.`;
  doc.text(clauseFinale, margin, yPos);

  yPos += 20;

  // Signatures
  yPos = checkPageBreak(doc, yPos, 50);
  const colWidth = (maxWidth - 20) / 2;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("LE PROMOTEUR", margin, yPos);
  doc.text("L'INVESTISSEUR", margin + colWidth + 20, yPos);

  yPos += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("(Signature et cachet)", margin, yPos);
  doc.text("(Signature precedee de", margin + colWidth + 20, yPos);
  yPos += 4;
  doc.text("", margin, yPos);
  doc.text('"Lu et approuve")', margin + colWidth + 20, yPos);

  yPos += 25;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, yPos, margin + colWidth, yPos);
  doc.line(margin + colWidth + 20, yPos, pageWidth - margin, yPos);

  // Add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, agency, i, totalPages);
  }

  return doc;
};

// Default templates
export const getDefaultPVFamilleData = (lotissement: LotissementInfo): PVFamilleData => ({
  familyName: "",
  representativeName: "",
  representativeRole: "Chef de famille",
  members: [
    { name: "", role: "Chef de famille" },
    { name: "", role: "Membre" },
  ],
  landDescription: `Terrain situe dans le lotissement ${lotissement.name}`,
  landArea: lotissement.total_area || 0,
  landLocation: `${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}`,
  decisions: [
    "Autoriser la vente du terrain familial decrit ci-dessus",
    "Designer le representant pour toutes les demarches administratives",
    "Repartir equitablement le produit de la vente entre les membres de la famille",
  ],
  witnesses: [{ name: "", cniNumber: "" }],
  meetingDate: new Date().toISOString().split("T")[0],
  meetingPlace: lotissement.city || "Abidjan",
});

export const getDefaultConventionData = (lotissement: LotissementInfo): ConventionData => ({
  partiesVendeur: "",
  partiesAcquereur: "",
  landDescription: `Terrain situe dans le lotissement ${lotissement.name}`,
  landArea: 0,
  price: 0,
  paymentTerms: "Le paiement sera effectue en une seule fois a la signature de la presente convention.",
  conditions: [
    "Le Cessionnaire prendra possession du terrain a compter de la signature de la presente convention",
    "Les frais d'enregistrement et de mutation sont a la charge du Cessionnaire",
    "Le Cedant s'engage a fournir tous les documents necessaires a la regularisation fonciere",
  ],
  signatureDate: new Date().toISOString().split("T")[0],
});

export const getDefaultContratPrefinancementData = (lotissement: LotissementInfo): ContratPrefinancementData => ({
  investorName: "",
  investorAddress: "",
  investorCni: "",
  investorPhone: "",
  investmentAmount: 0,
  investmentPurpose: `Amenagement et viabilisation du lotissement ${lotissement.name}`,
  returnPercentage: 15,
  duration: "12 mois",
  paymentSchedule: "Remboursement du capital et des interets a l'echeance du contrat",
  guarantees: [
    "Attribution d'une parcelle au choix de l'Investisseur en cas de defaut de remboursement",
    "Hypotheque sur les terrains du projet",
    "Caution personnelle du gerant du Promoteur",
  ],
  contractDate: new Date().toISOString().split("T")[0],
});
