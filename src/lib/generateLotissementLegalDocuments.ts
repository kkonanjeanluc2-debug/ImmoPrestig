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
  proprietaireName: string;
  proprietaireAddress: string;
  proprietaireCni: string;
  lotisseurName: string;
  lotisseurRccm: string;
  lotisseurAddress: string;
  terrainLocalisation: string;
  terrainSuperficie: string;
  arreteReference: string;
  arreteDate: string;
  engagementsLotisseur: string[];
  engagementsProprietaire: string[];
  repartitionProprietaire: number;
  repartitionLotisseur: number;
  duree: string;
  nombreExemplaires: number;
  signatureDate: string;
  lieuSignature: string;
}

export interface ContratPrefinancementData {
  lotisseurName: string;
  lotisseurAddress: string;
  lotisseurCni: string;
  lotisseurRccm: string;
  prefinanceurName: string;
  prefinanceurRccm: string;
  prefinanceurAddress: string;
  terrainLocalisation: string;
  terrainSuperficie: string;
  arreteReference: string;
  arreteDate: string;
  engagementsPrefinanceur: string[];
  engagementsLotisseur: string[];
  remunerationType: "lots" | "remboursement";
  remunerationLotsQuantity: string;
  remunerationInterestRate: number;
  duree: string;
  nombreExemplaires: number;
  signatureDate: string;
  lieuSignature: string;
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
    "CONVENTION DE LOTISSEMENT",
    `Lotissement ${lotissement.name}`
  );

  // ENTRE
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("ENTRE :", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  const partieProprietaire = `Le proprietaire foncier : ${data.proprietaireName}${data.proprietaireAddress ? `, demeurant a ${data.proprietaireAddress}` : ""}${data.proprietaireCni ? `, CNI N° ${data.proprietaireCni}` : ""}, ci-apres denomme Le Proprietaire.`;
  const propLines = doc.splitTextToSize(partieProprietaire, maxWidth);
  propLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("ET", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  const partieLotisseur = `Le lotisseur / amenageur : ${data.lotisseurName}${data.lotisseurRccm ? `, RCCM : ${data.lotisseurRccm}` : ""}${data.lotisseurAddress ? `, sis a ${data.lotisseurAddress}` : ""}, ci-apres denomme Le Lotisseur.`;
  const lotLines = doc.splitTextToSize(partieLotisseur, maxWidth);
  lotLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 1 – OBJET
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 1 - OBJET", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const arreteClause = data.arreteReference ? `, conformement au plan de lotissement approuve par arrete n° ${data.arreteReference} du ${data.arreteDate ? formatDate(data.arreteDate) : "[date]"}` : "";
  const article1 = `La presente convention a pour objet de definir les droits et obligations des parties dans le cadre de l'operation de lotissement du terrain sis a ${data.terrainLocalisation}, d'une superficie de ${data.terrainSuperficie} hectares${arreteClause}.`;
  const art1Lines = doc.splitTextToSize(article1, maxWidth);
  art1Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 2 – BASE LÉGALE
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 2 - BASE LEGALE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article2 = `Le lotissement est regi par :
- La Loi n° 2020-624 du 14 aout 2020 instituant Code de l'Urbanisme et du Domaine Foncier Urbain.
- Le Decret n° 2021-784 du 08 decembre 2021 portant organisation des procedures d'elaboration, d'approbation et d'application des plans de lotissement.
- Les arretes et reglements locaux en vigueur.`;
  const art2Lines = doc.splitTextToSize(article2, maxWidth);
  art2Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 3 – ENGAGEMENTS DU LOTISSEUR
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 3 - ENGAGEMENTS DU LOTISSEUR", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le Lotisseur s'engage a :", margin, yPos);
  yPos += 6;

  data.engagementsLotisseur.forEach((eng) => {
    yPos = checkPageBreak(doc, yPos, 10);
    const engLines = doc.splitTextToSize(`- ${eng}`, maxWidth);
    engLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  });

  yPos += 10;

  // ARTICLE 4 – ENGAGEMENTS DU PROPRIÉTAIRE
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 4 - ENGAGEMENTS DU PROPRIETAIRE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le Proprietaire s'engage a :", margin, yPos);
  yPos += 6;

  data.engagementsProprietaire.forEach((eng) => {
    yPos = checkPageBreak(doc, yPos, 10);
    const engLines = doc.splitTextToSize(`- ${eng}`, maxWidth);
    engLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  });

  yPos += 10;

  // ARTICLE 5 – CESSION DES LOTS
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 5 - CESSION DES LOTS", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article5 = `La repartition des lots se fera comme suit :
- ${data.repartitionProprietaire}% des lots reviennent au Proprietaire.
- ${data.repartitionLotisseur}% des lots reviennent au Lotisseur pour commercialisation.

Un proces-verbal de repartition sera etabli et annexe a la presente convention.`;
  const art5Lines = doc.splitTextToSize(article5, maxWidth);
  art5Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 6 – DURÉE
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 6 - DUREE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article6 = `La presente convention est conclue pour une duree de ${data.duree}, correspondant au delai de realisation des travaux et de livraison des lots.`;
  const art6Lines = doc.splitTextToSize(article6, maxWidth);
  art6Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 7 – SANCTIONS
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 7 - SANCTIONS", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article7 = `En cas de non-respect des engagements, la partie defaillante pourra etre poursuivie conformement aux dispositions legales et reglementaires en vigueur.`;
  const art7Lines = doc.splitTextToSize(article7, maxWidth);
  art7Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 8 – RÈGLEMENT DES LITIGES
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 8 - REGLEMENT DES LITIGES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article8 = `Tout litige ne de l'interpretation ou de l'execution de la presente convention sera regle a l'amiable. A defaut, il sera porte devant les juridictions competentes d'Abidjan.`;
  const art8Lines = doc.splitTextToSize(article8, maxWidth);
  art8Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 9 – DISPOSITIONS FINALES
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 9 - DISPOSITIONS FINALES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article9 = `La presente convention prend effet a compter de sa signature par les parties. Elle sera deposee aupres de la Direction de l'Urbanisme et publiee conformement aux textes en vigueur.`;
  const art9Lines = doc.splitTextToSize(article9, maxWidth);
  art9Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 15;

  // Clause finale
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "italic");
  const clauseFinale = `Fait a ${data.lieuSignature || lotissement.city || "Abidjan"}, le ${formatDate(data.signatureDate)}`;
  doc.text(clauseFinale, margin, yPos);
  yPos += 5;
  doc.text(`En ${data.nombreExemplaires} exemplaires originaux.`, margin, yPos);

  yPos += 20;

  // Signatures
  yPos = checkPageBreak(doc, yPos, 50);
  const colWidth = (maxWidth - 20) / 2;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("Le Proprietaire", margin, yPos);
  doc.text("Le Lotisseur", margin + colWidth + 20, yPos);

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
    `Lotissement ${lotissement.name}`
  );

  // ENTRE
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("ENTRE :", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  const partieLotisseur = `Le Lotisseur : ${data.lotisseurName}${data.lotisseurAddress ? `, demeurant a ${data.lotisseurAddress}` : ""}${data.lotisseurCni ? `, CNI N° ${data.lotisseurCni}` : ""}${data.lotisseurRccm ? `, RCCM : ${data.lotisseurRccm}` : ""}, ci-apres denomme Le Lotisseur.`;
  const lotLines = doc.splitTextToSize(partieLotisseur, maxWidth);
  lotLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("ET", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  const partiePrefinanceur = `Le prefinanceur / promoteur : ${data.prefinanceurName}${data.prefinanceurRccm ? `, RCCM : ${data.prefinanceurRccm}` : ""}${data.prefinanceurAddress ? `, sis a ${data.prefinanceurAddress}` : ""}, ci-apres denomme Le Prefinanceur.`;
  const prefLines = doc.splitTextToSize(partiePrefinanceur, maxWidth);
  prefLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 1 – OBJET
  yPos = checkPageBreak(doc, yPos, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 1 - OBJET", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const arreteClause = data.arreteReference ? `, conformement au plan de lotissement approuve par arrete n° ${data.arreteReference}${data.arreteDate ? ` du ${formatDate(data.arreteDate)}` : ""}` : "";
  const article1 = `La presente convention a pour objet de definir les modalites de prefinancement des travaux de lotissement du terrain sis a ${data.terrainLocalisation}, d'une superficie de ${data.terrainSuperficie} hectares${arreteClause}.`;
  const art1Lines = doc.splitTextToSize(article1, maxWidth);
  art1Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 2 – BASE LÉGALE
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 2 - BASE LEGALE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article2 = `Le contrat est regi par :
- La Loi n° 2020-624 du 14 aout 2020 instituant Code de l'Urbanisme et du Domaine Foncier Urbain.
- Le Decret n° 2021-784 du 08 decembre 2021 portant organisation des procedures d'elaboration, d'approbation et d'application des plans de lotissement.
- Les dispositions du Code civil relatives aux contrats et obligations.`;
  const art2Lines = doc.splitTextToSize(article2, maxWidth);
  art2Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 3 – ENGAGEMENTS DU PRÉFINANCEUR
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 3 - ENGAGEMENTS DU PREFINANCEUR", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le Prefinanceur s'engage a :", margin, yPos);
  yPos += 6;

  data.engagementsPrefinanceur.forEach((eng) => {
    yPos = checkPageBreak(doc, yPos, 10);
    const engLines = doc.splitTextToSize(`- ${eng}`, maxWidth);
    engLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  });

  yPos += 10;

  // ARTICLE 4 – ENGAGEMENTS DU PROPRIÉTAIRE
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 4 - ENGAGEMENTS DU LOTISSEUR", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le Lotisseur s'engage a :", margin, yPos);
  yPos += 6;

  data.engagementsLotisseur.forEach((eng) => {
    yPos = checkPageBreak(doc, yPos, 10);
    const engLines = doc.splitTextToSize(`- ${eng}`, maxWidth);
    engLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 5;
    });
  });

  yPos += 10;

  // ARTICLE 5 – MODALITÉS DE RÉMUNÉRATION
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 5 - MODALITES DE REMUNERATION", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  let article5Text = "La remuneration du Prefinanceur se fera par :\n\n";
  if (data.remunerationType === "lots") {
    article5Text += `- Attribution de ${data.remunerationLotsQuantity} de lots viabilises.`;
  } else {
    article5Text += `- Remboursement du capital investi majore d'un interet de ${data.remunerationInterestRate}%, payable a la livraison des lots.`;
  }
  article5Text += "\n\nUn proces-verbal de repartition ou un echeancier de remboursement sera annexe au present contrat.";

  const art5Lines = doc.splitTextToSize(article5Text, maxWidth);
  art5Lines.forEach((line: string) => {
    yPos = checkPageBreak(doc, yPos, 8);
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 6 – DURÉE
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 6 - DUREE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article6 = `Le present contrat est conclu pour une duree de ${data.duree}, correspondant au delai de realisation des travaux et de livraison des lots.`;
  const art6Lines = doc.splitTextToSize(article6, maxWidth);
  art6Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 7 – SANCTIONS
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 7 - SANCTIONS", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article7 = `En cas de non-respect des engagements, la partie defaillante pourra etre poursuivie conformement aux dispositions legales et reglementaires en vigueur.`;
  const art7Lines = doc.splitTextToSize(article7, maxWidth);
  art7Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 8 – RÈGLEMENT DES LITIGES
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 8 - REGLEMENT DES LITIGES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article8 = `Tout litige ne de l'interpretation ou de l'execution du present contrat sera regle a l'amiable. A defaut, il sera porte devant les juridictions competentes d'Abidjan.`;
  const art8Lines = doc.splitTextToSize(article8, maxWidth);
  art8Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 10;

  // ARTICLE 9 – DISPOSITIONS FINALES
  yPos = checkPageBreak(doc, yPos, 30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("ARTICLE 9 - DISPOSITIONS FINALES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article9 = `Le present contrat prend effet a compter de sa signature par les parties. Il sera depose aupres de la Direction de l'Urbanisme et publie conformement aux textes en vigueur.`;
  const art9Lines = doc.splitTextToSize(article9, maxWidth);
  art9Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 15;

  // Clause finale
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "italic");
  const clauseFinale = `Fait a ${data.lieuSignature || lotissement.city || "Abidjan"}, le ${formatDate(data.signatureDate)}`;
  doc.text(clauseFinale, margin, yPos);
  yPos += 5;
  doc.text(`En ${data.nombreExemplaires} exemplaires originaux.`, margin, yPos);

  yPos += 20;

  // Signatures
  yPos = checkPageBreak(doc, yPos, 50);
  const colWidth = (maxWidth - 20) / 2;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("Le Lotisseur", margin, yPos);
  doc.text("Le Prefinanceur", margin + colWidth + 20, yPos);

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
  proprietaireName: "",
  proprietaireAddress: "",
  proprietaireCni: "",
  lotisseurName: "",
  lotisseurRccm: "",
  lotisseurAddress: "",
  terrainLocalisation: `${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}`,
  terrainSuperficie: lotissement.total_area ? String((lotissement.total_area / 10000).toFixed(2)) : "",
  arreteReference: "",
  arreteDate: "",
  engagementsLotisseur: [
    "Realiser les travaux d'amenagement conformement au plan approuve (voirie, assainissement, reseaux divers)",
    "Respecter les prescriptions techniques et urbanistiques fixees par l'arrete d'autorisation de lotir",
    "Mettre a disposition les equipements collectifs prevus (espaces verts, ecoles, marches, etc.)",
    "Livrer les lots viabilises dans les delais convenus",
  ],
  engagementsProprietaire: [
    "Mettre a disposition le terrain objet du lotissement",
    "Garantir la propriete et l'absence de litiges fonciers",
    "Respecter les clauses de cession ou de partage convenues avec le Lotisseur",
  ],
  repartitionProprietaire: 30,
  repartitionLotisseur: 70,
  duree: "24 mois",
  nombreExemplaires: 2,
  signatureDate: new Date().toISOString().split("T")[0],
  lieuSignature: lotissement.city || "Abidjan",
});

export const getDefaultContratPrefinancementData = (lotissement: LotissementInfo): ContratPrefinancementData => ({
  lotisseurName: "",
  lotisseurAddress: "",
  lotisseurCni: "",
  lotisseurRccm: "",
  prefinanceurName: "",
  prefinanceurRccm: "",
  prefinanceurAddress: "",
  terrainLocalisation: `${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}`,
  terrainSuperficie: lotissement.total_area ? String((lotissement.total_area / 10000).toFixed(2)) : "",
  arreteReference: "",
  arreteDate: "",
  engagementsPrefinanceur: [
    "Mettre a disposition les fonds necessaires pour la realisation des travaux de viabilisation (voirie, assainissement, reseaux divers)",
    "Respecter le calendrier de financement convenu",
    "Assurer le suivi technique et financier des travaux",
  ],
  engagementsLotisseur: [
    "Mettre a disposition le terrain et assurer la maitrise fonciere",
    "Garantir l'absence de litiges fonciers sur le terrain",
    "Faciliter l'obtention des autorisations administratives necessaires",
    "Reserver au Prefinanceur la part de lots convenue en contrepartie du financement",
  ],
  remunerationType: "lots",
  remunerationLotsQuantity: "",
  remunerationInterestRate: 0,
  duree: "24 mois",
  nombreExemplaires: 2,
  signatureDate: new Date().toISOString().split("T")[0],
  lieuSignature: lotissement.city || "Abidjan",
});
