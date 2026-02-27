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
  members: { name: string; role: string; cniNumber?: string; signatureData?: string }[];
  landDescription: string;
  landArea: number;
  landLocation: string;
  decisions: string[];
  witnesses: { name: string; cniNumber?: string; signatureData?: string }[];
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
  lotisseurRccm: string;
  lotisseurRepresentant: string;
  lotisseurAddress: string;
  prefinanceurType: "individu" | "societe";
  prefinanceurName: string;
  prefinanceurRccm: string;
  prefinanceurRepresentant: string;
  prefinanceurAddress: string;
  prefinanceurCni: string;
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
      `${agency.name} - Document généré le ${formatDate(new Date().toISOString())}`,
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
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  let yPos = await addHeader(
    doc,
    agency,
    "PROCÈS-VERBAL DE RÉUNION DE FAMILLE",
    `Lotissement ${lotissement.name}`
  );

  // Date et lieu
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const intro = `L'an ${new Date(data.meetingDate).getFullYear()}, le ${formatDate(data.meetingDate)}, à ${data.meetingPlace}, s'est tenue une réunion de famille sous la présidence de ${data.representativeName}, ${data.representativeRole} de la famille ${data.familyName}.`;

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
  doc.text("MEMBRES PRÉSENTS", margin + 5, yPos + 5.5);

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
  doc.text("OBJET DE LA RÉUNION", margin + 5, yPos + 5.5);

  yPos += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const landDesc = `La réunion a pour objet la gestion du terrain familial décrit comme suit :\n\nDescription : ${data.landDescription}\nSuperficie : ${formatAmountForPDF(data.landArea)} m²\nLocalisation : ${data.landLocation}`;

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
  doc.text("DÉCISIONS PRISES À L'UNANIMITÉ", margin + 5, yPos + 5.5);

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
    doc.text("TÉMOINS", margin + 5, yPos + 5.5);

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

  // Signatures des membres
  yPos = checkPageBreak(doc, yPos, 60);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("SIGNATURES DES MEMBRES", margin, yPos);

  yPos += 10;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const colWidth = (maxWidth - 20) / 2;
  const signatureBlockHeight = 45; // height for name + role/cni + signature image
  let xPos = margin;
  let signatureCount = 0;

  for (const member of data.members) {
    // Move to next row (2 per row)
    if (signatureCount % 2 === 0 && signatureCount > 0) {
      yPos += signatureBlockHeight;
      xPos = margin;
    }
    if (signatureCount % 2 === 0) {
      yPos = checkPageBreak(doc, yPos, signatureBlockHeight + 5);
    }

    // Name and role
    doc.text(member.name, xPos, yPos);
    doc.text(`(${member.role})`, xPos, yPos + 5);

    // Signature below name+role
    if (member.signatureData) {
      try {
        doc.addImage(member.signatureData, "PNG", xPos, yPos + 10, 55, 25);
      } catch (e) {
        doc.setDrawColor(150, 150, 150);
        doc.line(xPos, yPos + 35, xPos + colWidth - 10, yPos + 35);
      }
    } else {
      doc.setDrawColor(150, 150, 150);
      doc.line(xPos, yPos + 35, xPos + colWidth - 10, yPos + 35);
    }

    xPos = margin + colWidth + 20;
    signatureCount++;
  }

  // Always advance yPos past the last row of member signatures
  yPos += signatureBlockHeight + 15;

  // Signatures des témoins
  if (data.witnesses.length > 0) {
    yPos = checkPageBreak(doc, yPos, 60);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("SIGNATURES DES TÉMOINS", margin, yPos);

    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);

    xPos = margin;
    let witnessCount = 0;

    for (const witness of data.witnesses) {
      if (witnessCount % 2 === 0 && witnessCount > 0) {
        yPos += signatureBlockHeight;
        xPos = margin;
      }
      if (witnessCount % 2 === 0) {
        yPos = checkPageBreak(doc, yPos, signatureBlockHeight + 5);
      }

      doc.text(witness.name, xPos, yPos);
      if (witness.cniNumber) {
        doc.text(`(CNI: ${witness.cniNumber})`, xPos, yPos + 5);
      }

      // Signature below name+cni
      if (witness.signatureData) {
        try {
          doc.addImage(witness.signatureData, "PNG", xPos, yPos + 10, 55, 25);
        } catch (e) {
          doc.setDrawColor(150, 150, 150);
          doc.line(xPos, yPos + 35, xPos + colWidth - 10, yPos + 35);
        }
      } else {
        doc.setDrawColor(150, 150, 150);
        doc.line(xPos, yPos + 35, xPos + colWidth - 10, yPos + 35);
      }

      xPos = margin + colWidth + 20;
      witnessCount++;
    }
  }

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
  const doc = await createPDFDocument();
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
  const partieProprietaire = `Le propriétaire foncier : ${data.proprietaireName}${data.proprietaireAddress ? `, demeurant à ${data.proprietaireAddress}` : ""}${data.proprietaireCni ? `, CNI N° ${data.proprietaireCni}` : ""}, ci-après dénommé Le Propriétaire.`;
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
  const partieLotisseur = `Le lotisseur / aménageur : ${data.lotisseurName}${data.lotisseurRccm ? `, RCCM : ${data.lotisseurRccm}` : ""}${data.lotisseurAddress ? `, sis à ${data.lotisseurAddress}` : ""}, ci-après dénommé Le Lotisseur.`;
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
  const arreteClause = data.arreteReference ? `, conformément au plan de lotissement approuvé par arrêté n° ${data.arreteReference} du ${data.arreteDate ? formatDate(data.arreteDate) : "[date]"}` : "";
  const article1 = `La présente convention a pour objet de définir les droits et obligations des parties dans le cadre de l'opération de lotissement du terrain sis à ${data.terrainLocalisation}, d'une superficie de ${data.terrainSuperficie} hectares${arreteClause}.`;
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
  doc.text("ARTICLE 2 - BASE LÉGALE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article2 = `Le lotissement est régi par :
- La Loi n° 2020-624 du 14 août 2020 instituant Code de l'Urbanisme et du Domaine Foncier Urbain.
- Le Décret n° 2021-784 du 08 décembre 2021 portant organisation des procédures d'élaboration, d'approbation et d'application des plans de lotissement.
- Les arrêtés et règlements locaux en vigueur.`;
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
  doc.text("Le Lotisseur s'engage à :", margin, yPos);
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
  doc.text("ARTICLE 4 - ENGAGEMENTS DU PROPRIÉTAIRE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le Propriétaire s'engage à :", margin, yPos);
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
  const article5 = `La répartition des lots se fera comme suit :
- ${data.repartitionProprietaire}% des lots reviennent au Propriétaire.
- ${data.repartitionLotisseur}% des lots reviennent au Lotisseur pour commercialisation.

Un procès-verbal de répartition sera établi et annexé à la présente convention.`;
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
  doc.text("ARTICLE 6 - DURÉE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article6 = `La présente convention est conclue pour une durée de ${data.duree}, correspondant au délai de réalisation des travaux et de livraison des lots.`;
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
  const article7 = `En cas de non-respect des engagements, la partie défaillante pourra être poursuivie conformément aux dispositions légales et réglementaires en vigueur.`;
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
  doc.text("ARTICLE 8 - RÈGLEMENT DES LITIGES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article8 = `Tout litige né de l'interprétation ou de l'exécution de la présente convention sera réglé à l'amiable. À défaut, il sera porté devant les juridictions compétentes d'Abidjan.`;
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
  const article9 = `La présente convention prend effet à compter de sa signature par les parties. Elle sera déposée auprès de la Direction de l'Urbanisme et publiée conformément aux textes en vigueur.`;
  const art9Lines = doc.splitTextToSize(article9, maxWidth);
  art9Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 15;

  // Clause finale
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "italic");
  const clauseFinale = `Fait à ${data.lieuSignature || lotissement.city || "Abidjan"}, le ${formatDate(data.signatureDate)}`;
  doc.text(clauseFinale, margin, yPos);
  yPos += 5;
  doc.text(`En ${data.nombreExemplaires} exemplaires originaux.`, margin, yPos);

  yPos += 20;

  // Signatures
  yPos = checkPageBreak(doc, yPos, 50);
  const colWidth = (maxWidth - 20) / 2;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("Le Propriétaire", margin, yPos);
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
  const doc = await createPDFDocument();
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
  const partieLotisseur = `La société ${data.lotisseurName}${data.lotisseurRccm ? `, immatriculée au RCCM sous le numéro ${data.lotisseurRccm}` : ""}${data.lotisseurAddress ? `, ayant son siège social à ${data.lotisseurAddress}` : ""}${data.lotisseurRepresentant ? `, représentée par ${data.lotisseurRepresentant}` : ""}, ci-après dénommée Le Lotisseur.`;
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
  let partiePrefinanceur: string;
  if (data.prefinanceurType === "societe") {
    partiePrefinanceur = `La société ${data.prefinanceurName}${data.prefinanceurRccm ? `, immatriculée au RCCM sous le numéro ${data.prefinanceurRccm}` : ""}${data.prefinanceurAddress ? `, ayant son siège social à ${data.prefinanceurAddress}` : ""}${data.prefinanceurRepresentant ? `, représentée par ${data.prefinanceurRepresentant}` : ""}, ci-après dénommée Le Préfinanceur.`;
  } else {
    partiePrefinanceur = `${data.prefinanceurName}${data.prefinanceurAddress ? `, demeurant à ${data.prefinanceurAddress}` : ""}${data.prefinanceurCni ? `, CNI N° ${data.prefinanceurCni}` : ""}, ci-après dénommé(e) Le Préfinanceur.`;
  }
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
  const arreteClause = data.arreteReference ? `, conformément au plan de lotissement approuvé par arrêté n° ${data.arreteReference}${data.arreteDate ? ` du ${formatDate(data.arreteDate)}` : ""}` : "";
  const article1 = `La présente convention a pour objet de définir les modalités de préfinancement des travaux de lotissement du terrain sis à ${data.terrainLocalisation}, d'une superficie de ${data.terrainSuperficie} hectares${arreteClause}.`;
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
  doc.text("ARTICLE 2 - BASE LÉGALE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article2 = `Le contrat est régi par :
- La Loi n° 2020-624 du 14 août 2020 instituant Code de l'Urbanisme et du Domaine Foncier Urbain.
- Le Décret n° 2021-784 du 08 décembre 2021 portant organisation des procédures d'élaboration, d'approbation et d'application des plans de lotissement.
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
  doc.text("ARTICLE 3 - ENGAGEMENTS DU PRÉFINANCEUR", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le Préfinanceur s'engage à :", margin, yPos);
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
  doc.text("Le Lotisseur s'engage à :", margin, yPos);
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
  doc.text("ARTICLE 5 - MODALITÉS DE RÉMUNÉRATION", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  let article5Text = "La rémunération du Préfinanceur se fera par :\n\n";
  if (data.remunerationType === "lots") {
    article5Text += `- Attribution de ${data.remunerationLotsQuantity} lots viabilisés.\n\nLes lots attribués au Préfinanceur seront déterminés d'un commun accord entre les parties et feront l'objet d'un procès-verbal d'attribution annexé au présent contrat.`;
  } else {
    article5Text += `- Remboursement du capital investi majoré d'un intérêt de ${data.remunerationInterestRate}%, payable à la livraison des lots.\n\nUn échéancier de remboursement détaillant les montants et les dates de paiement sera annexé au présent contrat.`;
  }

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
  doc.text("ARTICLE 6 - DURÉE", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article6 = `Le présent contrat est conclu pour une durée de ${data.duree}, correspondant au délai de réalisation des travaux et de livraison des lots.`;
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
  const article7 = `En cas de non-respect des engagements, la partie défaillante pourra être poursuivie conformément aux dispositions légales et réglementaires en vigueur.`;
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
  doc.text("ARTICLE 8 - RÈGLEMENT DES LITIGES", margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  const article8 = `Tout litige né de l'interprétation ou de l'exécution du présent contrat sera réglé à l'amiable. À défaut, il sera porté devant les juridictions compétentes d'Abidjan.`;
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
  const article9 = `Le présent contrat prend effet à compter de sa signature par les parties. Il sera déposé auprès de la Direction de l'Urbanisme et publié conformément aux textes en vigueur.`;
  const art9Lines = doc.splitTextToSize(article9, maxWidth);
  art9Lines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 15;

  // Clause finale
  yPos = checkPageBreak(doc, yPos, 50);
  doc.setFont("helvetica", "italic");
  const clauseFinale = `Fait à ${data.lieuSignature || lotissement.city || "Abidjan"}, le ${formatDate(data.signatureDate)}`;
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
  doc.text("Le Préfinanceur", margin + colWidth + 20, yPos);

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
  landDescription: `Terrain situé dans le lotissement ${lotissement.name}`,
  landArea: lotissement.total_area || 0,
  landLocation: `${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}`,
  decisions: [
    "Autoriser la vente du terrain familial décrit ci-dessus",
    "Désigner le représentant pour toutes les démarches administratives",
    "Répartir équitablement le produit de la vente entre les membres de la famille",
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
    "Réaliser les travaux d'aménagement conformément au plan approuvé (voirie, assainissement, réseaux divers)",
    "Respecter les prescriptions techniques et urbanistiques fixées par l'arrêté d'autorisation de lotir",
    "Mettre à disposition les équipements collectifs prévus (espaces verts, écoles, marchés, etc.)",
    "Livrer les lots viabilisés dans les délais convenus",
  ],
  engagementsProprietaire: [
    "Mettre à disposition le terrain objet du lotissement",
    "Garantir la propriété et l'absence de litiges fonciers",
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
  lotisseurRccm: "",
  lotisseurRepresentant: "",
  lotisseurAddress: "",
  prefinanceurType: "societe",
  prefinanceurName: "",
  prefinanceurRccm: "",
  prefinanceurRepresentant: "",
  prefinanceurAddress: "",
  prefinanceurCni: "",
  terrainLocalisation: `${lotissement.location}${lotissement.city ? `, ${lotissement.city}` : ""}`,
  terrainSuperficie: lotissement.total_area ? String((lotissement.total_area / 10000).toFixed(2)) : "",
  arreteReference: "",
  arreteDate: "",
  engagementsPrefinanceur: [
    "Mettre à disposition les fonds nécessaires pour la réalisation des travaux de viabilisation (voirie, assainissement, réseaux divers)",
    "Respecter le calendrier de financement convenu",
    "Assurer le suivi technique et financier des travaux",
  ],
  engagementsLotisseur: [
    "Mettre à disposition le terrain et assurer la maîtrise foncière",
    "Garantir l'absence de litiges fonciers sur le terrain",
    "Faciliter l'obtention des autorisations administratives nécessaires",
    "Réserver au Préfinanceur la part de lots convenue en contrepartie du financement",
  ],
  remunerationType: "lots",
  remunerationLotsQuantity: "",
  remunerationInterestRate: 0,
  duree: "24 mois",
  nombreExemplaires: 2,
  signatureDate: new Date().toISOString().split("T")[0],
  lieuSignature: lotissement.city || "Abidjan",
});
