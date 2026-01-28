import jsPDF from "jspdf";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

interface AgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string | null;
}

interface SignatureInfo {
  signerName: string;
  signerType: "landlord" | "tenant";
  signatureData?: string; // Base64 image
  signatureText?: string;
  signatureType: "drawn" | "typed";
  signedAt: string;
}

interface ManagementTypeInfo {
  name: string;
  type: string;
  percentage: number;
}

interface OwnerInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  birth_place?: string;
  profession?: string;
  cni_number?: string;
  management_type?: ManagementTypeInfo | null;
}

interface ContractData {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  tenantBirthDate?: string;
  tenantBirthPlace?: string;
  tenantProfession?: string;
  tenantCniNumber?: string;
  tenantEmergencyContact?: string;
  tenantEmergencyPhone?: string;
  propertyTitle: string;
  propertyAddress?: string;
  unitNumber?: string;
  rentAmount: number;
  deposit?: number;
  startDate: string;
  endDate: string;
  agency?: AgencyInfo | null;
  ownerName?: string;
  owner?: OwnerInfo | null;
  signatures?: SignatureInfo[];
}

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

// Determine management type category based on the management type name
const getManagementCategory = (managementTypeName?: string): "partagee" | "simple" | "professionnelle" => {
  if (!managementTypeName) return "simple"; // Default to simple if no management type
  
  const lowerName = managementTypeName.toLowerCase();
  
  if (lowerName.includes("partagé") || lowerName.includes("partage") || lowerName.includes("partagee")) {
    return "partagee";
  }
  if (lowerName.includes("professionnel") || lowerName.includes("professionnelle") || lowerName.includes("complete") || lowerName.includes("complète")) {
    return "professionnelle";
  }
  // Default to simple for anything else (gestion simple, or any other type)
  return "simple";
};

export const replaceContractVariables = (
  template: string,
  data: ContractData
): string => {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Determine management category
  const managementCategory = getManagementCategory(data.owner?.management_type?.name);
  
  // Determine what info to show based on management type
  const showOwnerInfo = managementCategory === "simple" || managementCategory === "partagee";
  const showAgencyInfo = managementCategory === "professionnelle" || managementCategory === "partagee";

  // Owner info - only if showing owner info
  const ownerDisplayName = showOwnerInfo ? (data.owner?.name || data.ownerName || "") : "";
  const ownerAddress = showOwnerInfo ? (data.owner?.address || "") : "";
  const ownerPhone = showOwnerInfo ? (data.owner?.phone || "") : "";
  const ownerEmail = showOwnerInfo ? (data.owner?.email || "") : "";
  const ownerBirthDate = showOwnerInfo && data.owner?.birth_date ? formatDate(data.owner.birth_date) : "";
  const ownerBirthPlace = showOwnerInfo ? (data.owner?.birth_place || "") : "";
  const ownerProfession = showOwnerInfo ? (data.owner?.profession || "") : "";
  const ownerCni = showOwnerInfo ? (data.owner?.cni_number || "") : "";

  // Agency info - only if showing agency info
  const agencyName = showAgencyInfo ? (data.agency?.name || "") : "";
  const agencyAddress = showAgencyInfo && data.agency 
    ? [data.agency.address, data.agency.city, data.agency.country].filter(Boolean).join(", ")
    : "";
  const agencyPhone = showAgencyInfo ? (data.agency?.phone || "") : "";
  const agencyEmail = showAgencyInfo ? (data.agency?.email || "") : "";

  // For bailleur fields, combine info based on management type
  let bailleurDisplayName = "";
  let bailleurAddress = "";
  let bailleurPhone = "";
  let bailleurEmail = "";
  
  if (managementCategory === "partagee") {
    // Show owner name, agency manages
    bailleurDisplayName = data.owner?.name || data.ownerName || "Le bailleur";
    bailleurAddress = data.owner?.address || "";
    bailleurPhone = data.owner?.phone || "";
    bailleurEmail = data.owner?.email || "";
  } else if (managementCategory === "simple") {
    // Only owner info
    bailleurDisplayName = data.owner?.name || data.ownerName || "Le bailleur";
    bailleurAddress = data.owner?.address || "";
    bailleurPhone = data.owner?.phone || "";
    bailleurEmail = data.owner?.email || "";
  } else {
    // Professionnelle - only agency
    bailleurDisplayName = data.agency?.name || "L'agence";
    bailleurAddress = agencyAddress;
    bailleurPhone = data.agency?.phone || "";
    bailleurEmail = data.agency?.email || "";
  }

  const replacements: Record<string, string> = {
    // Bailleur fields (main landlord section)
    "{bailleur}": bailleurDisplayName,
    "{bailleur_adresse}": bailleurAddress,
    "{bailleur_telephone}": bailleurPhone,
    "{bailleur_email}": bailleurEmail,
    "{bailleur_date_naissance}": ownerBirthDate,
    "{bailleur_lieu_naissance}": ownerBirthPlace,
    "{bailleur_profession}": ownerProfession,
    "{bailleur_cni}": ownerCni,
    
    // Proprietaire fields (owner-specific, shown in shared management)
    "{proprietaire}": ownerDisplayName,
    "{proprietaire_adresse}": ownerAddress,
    "{proprietaire_telephone}": ownerPhone,
    "{proprietaire_email}": ownerEmail,
    "{proprietaire_date_naissance}": ownerBirthDate,
    "{proprietaire_lieu_naissance}": ownerBirthPlace,
    "{proprietaire_profession}": ownerProfession,
    "{proprietaire_cni}": ownerCni,
    
    // Agence fields (agency-specific)
    "{agence}": agencyName,
    "{agence_adresse}": agencyAddress,
    "{agence_telephone}": agencyPhone,
    "{agence_email}": agencyEmail,
    
    // Type de gestion
    "{type_gestion}": data.owner?.management_type?.name || "Gestion simple",
    
    // Tenant info
    "{locataire}": data.tenantName,
    "{locataire_email}": data.tenantEmail || "",
    "{locataire_telephone}": data.tenantPhone || "",
    "{locataire_date_naissance}": data.tenantBirthDate ? formatDate(data.tenantBirthDate) : "",
    "{locataire_lieu_naissance}": data.tenantBirthPlace || "",
    "{locataire_profession}": data.tenantProfession || "",
    "{locataire_cni}": data.tenantCniNumber || "",
    "{contact_urgence_nom}": data.tenantEmergencyContact || "",
    "{contact_urgence_telephone}": data.tenantEmergencyPhone || "",
    
    // Property info
    "{bien}": data.propertyTitle,
    "{bien_adresse}": data.propertyAddress || "",
    "{unite}": data.unitNumber || "",
    
    // Financial info
    "{loyer}": formatAmountWithCurrency(data.rentAmount),
    "{loyer_lettres}": numberToWordsPDF(data.rentAmount) + " francs CFA",
    "{caution}": data.deposit ? formatAmountWithCurrency(data.deposit) : "Neant",
    "{caution_lettres}": data.deposit ? numberToWordsPDF(data.deposit) + " francs CFA" : "neant",
    
    // Dates
    "{date_debut}": formatDate(data.startDate),
    "{date_fin}": formatDate(data.endDate),
    "{date_jour}": today,
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return result;
};

export const generateContractPDF = async (
  templateContent: string,
  data: ContractData
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  
  // Colors
  const primaryColor: [number, number, number] = [26, 54, 93];
  const textColor: [number, number, number] = [51, 51, 51];
  
  let yPos = margin;
  
  // Header with agency/company info and logo
  if (data.agency) {
    const headerStartY = yPos;
    let logoLoaded = false;
    
    // Try to load and display logo
    if (data.agency.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(data.agency.logo_url);
        if (logoBase64) {
          // Draw logo on the left
          doc.addImage(logoBase64, "PNG", margin, yPos, 30, 30);
          logoLoaded = true;
        }
      } catch (e) {
        // Continue without logo
        console.log("Could not load logo:", e);
      }
    }
    
    // Company info - positioned based on whether logo exists
    const textStartX = logoLoaded ? margin + 35 : margin;
    
    // Company name
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(data.agency.name, textStartX, yPos + 8);
    
    // Address line
    const addressParts = [data.agency.address, data.agency.city, data.agency.country].filter(Boolean);
    if (addressParts.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      doc.text(addressParts.join(", "), textStartX, yPos + 15);
    }
    
    // Contact info (phone and email)
    const contactParts: string[] = [];
    if (data.agency.phone) contactParts.push(`Tél: ${data.agency.phone}`);
    if (data.agency.email) contactParts.push(`Email: ${data.agency.email}`);
    
    if (contactParts.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(contactParts.join(" | "), textStartX, yPos + 21);
    }
    
    // Draw a separator line under the header
    yPos = headerStartY + 35;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    yPos += 10;
  }
  
  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("CONTRAT DE LOCATION", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;
  
  // Replace variables in template
  const filledContent = replaceContractVariables(templateContent, data);
  
  // Parse and render the content
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const lines = filledContent.split("\n");
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if we need a new page
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    
    // Handle different formatting
    if (trimmedLine.startsWith("# ")) {
      // Main heading
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text(trimmedLine.substring(2), margin, yPos);
      yPos += 10;
    } else if (trimmedLine.startsWith("## ")) {
      // Subheading
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      yPos += 5;
      doc.text(trimmedLine.substring(3), margin, yPos);
      yPos += 8;
    } else if (trimmedLine.startsWith("### ")) {
      // Small heading
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(trimmedLine.substring(4), margin, yPos);
      yPos += 7;
    } else if (trimmedLine === "") {
      // Empty line
      yPos += 5;
    } else {
      // Regular text
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      
      const splitLines = doc.splitTextToSize(trimmedLine, maxWidth);
      for (const splitLine of splitLines) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(splitLine, margin, yPos);
        yPos += 5;
      }
    }
  }
  
  // Add signature section at the end
  yPos += 20;
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const signatureY = yPos;
  const colWidth = (pageWidth - margin * 2 - 20) / 2;
  
  // Get signatures
  const landlordSig = data.signatures?.find(s => s.signerType === "landlord");
  const tenantSig = data.signatures?.find(s => s.signerType === "tenant");
  
  // Left signature (Bailleur)
  doc.setFont("helvetica", "bold");
  doc.text("Le Bailleur", margin, signatureY);
  doc.setFont("helvetica", "normal");
  
  if (landlordSig) {
    doc.text(landlordSig.signerName, margin, signatureY + 7);
    
    // Add signature image or text
    if (landlordSig.signatureType === "drawn" && landlordSig.signatureData) {
      try {
        doc.addImage(landlordSig.signatureData, "PNG", margin, signatureY + 12, 60, 30);
      } catch (e) {
        // Fallback to text if image fails
        doc.text("(Signature électronique)", margin, signatureY + 25);
      }
    } else if (landlordSig.signatureText) {
      // Use italic for typed signature
      doc.setFont("helvetica", "italic");
      doc.setFontSize(16);
      doc.text(landlordSig.signatureText, margin, signatureY + 25);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    
    // Timestamp
    const landlordDate = new Date(landlordSig.signedAt);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Signé le ${landlordDate.toLocaleDateString("fr-FR")} à ${landlordDate.toLocaleTimeString("fr-FR")}`,
      margin,
      signatureY + 48
    );
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
  } else {
    doc.text("Signature précédée de", margin, signatureY + 7);
    doc.text('"Lu et approuvé"', margin, signatureY + 12);
    doc.line(margin, signatureY + 45, margin + colWidth, signatureY + 45);
  }
  
  // Right signature (Locataire)
  const rightX = margin + colWidth + 20;
  doc.setFont("helvetica", "bold");
  doc.text("Le Locataire", rightX, signatureY);
  doc.setFont("helvetica", "normal");
  
  if (tenantSig) {
    doc.text(tenantSig.signerName, rightX, signatureY + 7);
    
    // Add signature image or text
    if (tenantSig.signatureType === "drawn" && tenantSig.signatureData) {
      try {
        doc.addImage(tenantSig.signatureData, "PNG", rightX, signatureY + 12, 60, 30);
      } catch (e) {
        doc.text("(Signature électronique)", rightX, signatureY + 25);
      }
    } else if (tenantSig.signatureText) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(16);
      doc.text(tenantSig.signatureText, rightX, signatureY + 25);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    
    // Timestamp
    const tenantDate = new Date(tenantSig.signedAt);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Signé le ${tenantDate.toLocaleDateString("fr-FR")} à ${tenantDate.toLocaleTimeString("fr-FR")}`,
      rightX,
      signatureY + 48
    );
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
  } else {
    doc.text("Signature précédée de", rightX, signatureY + 7);
    doc.text('"Lu et approuvé"', rightX, signatureY + 12);
    doc.line(rightX, signatureY + 45, rightX + colWidth, signatureY + 45);
  }
  
  // Add electronic signature notice if any signature exists
  if (landlordSig || tenantSig) {
    yPos = signatureY + 60;
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Ce document a été signé électroniquement. Les signatures électroniques ont valeur légale conformément à la réglementation en vigueur.",
      margin,
      yPos,
      { maxWidth: maxWidth }
    );
  }
  
  return doc;
};

export const downloadContractPDF = async (
  templateContent: string,
  data: ContractData,
  filename?: string
): Promise<void> => {
  const doc = await generateContractPDF(templateContent, data);
  const defaultFilename = `contrat_${data.tenantName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename || defaultFilename);
};

export const printContractPDF = async (
  templateContent: string,
  data: ContractData
): Promise<void> => {
  const doc = await generateContractPDF(templateContent, data);
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  const printWindow = window.open(pdfUrl);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

// Default contract template - Conforme au Code de la Construction et de l'Habitat de Côte d'Ivoire
// Loi n° 2019-576 du 26 juin 2019
// Les variables {bailleur_*} affichent les infos selon le type de gestion:
// - Gestion simple: propriétaire uniquement
// - Gestion partagée: propriétaire + agence mandatée
// - Gestion professionnelle: agence uniquement
export const DEFAULT_CONTRACT_TEMPLATE = `# CONTRAT DE BAIL À USAGE D'HABITATION

Conformément aux dispositions de la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat en République de Côte d'Ivoire.

Type de gestion : {type_gestion}

Entre les soussignés :

## LE BAILLEUR
{bailleur}
Né(e) le : {bailleur_date_naissance} à {bailleur_lieu_naissance}
Profession : {bailleur_profession}
Numéro CNI : {bailleur_cni}
Adresse : {bailleur_adresse}
Téléphone : {bailleur_telephone}
Email : {bailleur_email}

Représenté par l'agence : {agence}
Adresse de l'agence : {agence_adresse}
Téléphone : {agence_telephone}
Email : {agence_email}

Ci-après dénommé "Le Bailleur"

D'une part,

## LE LOCATAIRE
{locataire}
Né(e) le : {locataire_date_naissance} à {locataire_lieu_naissance}
Profession : {locataire_profession}
Numéro CNI : {locataire_cni}
Téléphone : {locataire_telephone}
Email : {locataire_email}

Personne à contacter en cas d'urgence : {contact_urgence_nom}
Téléphone d'urgence : {contact_urgence_telephone}

Ci-après dénommé "Le Locataire"

D'autre part,

Il a été convenu et arrêté ce qui suit :

### CHAPITRE 1 : OBJET ET DÉSIGNATION DU BIEN

### Article 1 - Objet du contrat
Conformément à l'article 1er de la Loi n° 2019-576 du 26 juin 2019, le présent contrat de bail à usage d'habitation a pour objet la mise en location d'un immeuble ou local servant d'habitation, par lequel le Bailleur s'oblige à faire jouir le Locataire dudit bien pendant un certain temps et moyennant un loyer que celui-ci s'oblige à lui payer.

### Article 2 - Désignation du bien loué
Le Bailleur donne à bail au Locataire, qui accepte, le bien immobilier désigné ci-après :
- Désignation : {bien}
- Adresse complète : {bien_adresse}
- Unité/Porte (le cas échéant) : {unite}

### CHAPITRE 2 : DURÉE ET CONDITIONS

### Article 3 - Durée du bail
Le présent bail est consenti et accepté pour une durée déterminée commençant le {date_debut} et se terminant le {date_fin}.

Conformément aux dispositions légales, à l'expiration de cette durée, le bail pourra être renouvelé par accord exprès des parties ou tacitement reconduit selon les conditions prévues par la loi.

### Article 4 - Loyer
Le loyer mensuel est fixé à la somme de {loyer} ({loyer_lettres}), payable d'avance au plus tard le cinq (5) de chaque mois.

Le loyer est payable au domicile du Bailleur ou à tout autre lieu désigné par celui-ci, ou par tout moyen de paiement convenu entre les parties (virement bancaire, mobile money, espèces contre reçu).

Conformément à la réglementation en vigueur, toute modification du loyer doit faire l'objet d'un accord écrit entre les parties.

### Article 5 - Dépôt de garantie (Caution)
Conformément aux dispositions du Code de la Construction et de l'Habitat, le Locataire verse au Bailleur, à la signature du présent contrat, un dépôt de garantie d'un montant de {caution} ({caution_lettres}), correspondant à deux (2) mois de loyer maximum.

Ce dépôt de garantie est destiné à couvrir les éventuelles dégradations constatées lors de l'état des lieux de sortie, ainsi que les loyers et charges impayés.

Le dépôt de garantie sera restitué au Locataire dans un délai maximum de deux (2) mois suivant la remise des clés et après déduction, le cas échéant, des sommes restant dues au Bailleur.

### Article 6 - Charges locatives
Les charges locatives sont à la charge du Locataire et comprennent notamment :
- La consommation d'eau et d'électricité
- L'entretien courant du logement et de ses équipements
- Les menues réparations d'entretien courant
- L'enlèvement des ordures ménagères (le cas échéant)

### CHAPITRE 3 : OBLIGATIONS DES PARTIES

### Article 7 - Obligations du Bailleur
Conformément aux articles 426 à 434 du Code de la Construction et de l'Habitat, le Bailleur s'oblige à :

a) Délivrer au Locataire l'immeuble ou le local loué en bon état de réparation de toute espèce (Art. 426 et 427) ;

b) Remettre au Locataire un logement décent ne comportant aucun risque d'atteinte à la sécurité physique, à la santé ou aux biens du Locataire (Art. 428) ;

c) Entretenir l'immeuble en état de servir à l'usage pour lequel il a été loué et effectuer à ses frais toutes les grosses réparations (Art. 431), notamment celles concernant :
   - Les murs porteurs ou de soutènement
   - Les voûtes et toitures
   - Les poutres et planchers
   - Les murs de clôture
   - Les canalisations et fosses d'aisance
   - Les escaliers et ascenseurs
   - Le ravalement des façades

d) Faire jouir paisiblement le Locataire pendant la durée du bail (Art. 426) ;

e) Garantir le Locataire contre tous vices ou défauts de l'immeuble qui en empêchent l'usage (Art. 428) ;

f) Établir un état des lieux contradictoire en début et en fin de bail (Art. 427).

### Article 8 - Obligations du Locataire
Conformément aux articles 435 à 438 du Code de la Construction et de l'Habitat, le Locataire s'oblige à :

a) Payer le loyer et les charges aux termes convenus (Art. 435) ;

b) Utiliser l'immeuble en bon père de famille, conformément à la destination prévue au contrat (Art. 435) ;

c) Ne pas changer la destination de l'immeuble ou du local sans l'accord écrit du Bailleur (Art. 436) ;

d) Ne pas effectuer de travaux de transformation sans l'accord écrit du Bailleur (Art. 436 et 437) ;

e) Répondre des dégradations et pertes survenues pendant la durée du bail, sauf cas de force majeure ;

f) Effectuer les menues réparations d'entretien courant ;

g) Ne pas sous-louer ni céder le bail sans l'autorisation expresse et écrite du Bailleur, conformément à l'article 6 de la loi sur le bail à usage d'habitation ;

h) Restituer l'immeuble à l'expiration du bail dans l'état dans lequel il se trouvait au moment de la conclusion du contrat (Art. 438).

### CHAPITRE 4 : RÉSILIATION DU CONTRAT

### Article 9 - Résiliation du bail
Conformément à l'article 442 du Code de la Construction et de l'Habitat, le présent contrat peut être légitimement résilié :

a) En cas de force majeure ;

b) Par accord commun des parties ;

c) En cas de manquement à ses obligations par l'une des parties ;

d) Au terme d'un préavis de trois (3) mois notifié par écrit au Bailleur par le Locataire pour motif légitime ;

e) Au terme d'un congé de trois (3) mois notifié par écrit au Locataire par le Bailleur qui veut exercer son droit de reprendre l'immeuble pour l'occuper lui-même ou pour le faire occuper par un ascendant ou descendant ou allié jusqu'au troisième degré inclusivement.

### Article 10 - Procédure de résiliation
Toute demande de résiliation doit être écrite, motivée et accompagnée, le cas échéant, de pièces justificatives.

Elle est transmise à la partie adverse par voie d'huissier de justice, par lettre recommandée avec avis de réception, par remise de courrier contre décharge ou par courrier électronique si les parties ont accepté ce mode de transmission.

La partie qui veut contester la résiliation dispose d'un délai de trente (30) jours calendaires à compter de la réception de la lettre de demande de résiliation pour saisir la juridiction compétente.

### Article 11 - Clause résolutoire
En cas de non-paiement du loyer ou des charges aux termes convenus, ou de non-respect des obligations contractuelles, le Bailleur pourra, après mise en demeure restée infructueuse pendant un délai de quinze (15) jours, demander la résiliation du bail devant la juridiction compétente.

### CHAPITRE 5 : DISPOSITIONS FINALES

### Article 12 - État des lieux
Conformément à l'article 427 du Code de la Construction et de l'Habitat, un état des lieux contradictoire sera établi :
- À l'entrée du Locataire dans les lieux, en présence des deux parties ou de leurs représentants dûment mandatés ;
- À la sortie du Locataire, selon les mêmes modalités.

Tout désaccord sur l'état des lieux pourra être soumis à la juridiction compétente.

### Article 13 - Élection de domicile
Pour l'exécution du présent contrat et de ses suites, les parties font élection de domicile :
- Le Bailleur : à l'adresse indiquée en tête du présent contrat
- Le Locataire : au lieu du bien loué

### Article 14 - Juridiction compétente
En cas de litige relatif à l'exécution ou à l'interprétation du présent contrat, les parties s'engagent à rechercher une solution amiable. À défaut d'accord, le litige sera soumis aux tribunaux compétents de Côte d'Ivoire.

### Article 15 - Dispositions diverses
Le présent contrat est régi par les dispositions du Code de la Construction et de l'Habitat de Côte d'Ivoire (Loi n° 2019-576 du 26 juin 2019) et, pour tout ce qui n'y est pas prévu, par le droit commun des obligations.

Toute clause du présent contrat contraire aux dispositions d'ordre public de la loi sur le bail à usage d'habitation est réputée non écrite.

Le présent contrat est établi en deux (2) exemplaires originaux, un pour chaque partie.

Fait à {bailleur_adresse}, le {date_jour}.

Les parties déclarent avoir pris connaissance du présent contrat, l'avoir lu et approuvé dans son intégralité.
`;
