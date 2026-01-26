import jsPDF from "jspdf";

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

interface ContractData {
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  propertyTitle: string;
  propertyAddress?: string;
  unitNumber?: string;
  rentAmount: number;
  deposit?: number;
  startDate: string;
  endDate: string;
  agency?: AgencyInfo | null;
  ownerName?: string;
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

const numberToWords = (num: number): string => {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  
  if (num === 0) return "zéro";
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7 || t === 9) {
      return tens[t - 1] + "-" + teens[u];
    }
    return tens[t] + (u > 0 ? "-" + units[u] : "");
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const prefix = h === 1 ? "cent" : units[h] + " cent";
    return prefix + (rest > 0 ? " " + numberToWords(rest) : "");
  }
  if (num < 1000000) {
    const t = Math.floor(num / 1000);
    const rest = num % 1000;
    const prefix = t === 1 ? "mille" : numberToWords(t) + " mille";
    return prefix + (rest > 0 ? " " + numberToWords(rest) : "");
  }
  return num.toLocaleString("fr-FR");
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

  const replacements: Record<string, string> = {
    "{bailleur}": data.agency?.name || data.ownerName || "Le bailleur",
    "{bailleur_adresse}": data.agency 
      ? [data.agency.address, data.agency.city, data.agency.country].filter(Boolean).join(", ")
      : "",
    "{bailleur_telephone}": data.agency?.phone || "",
    "{bailleur_email}": data.agency?.email || "",
    "{locataire}": data.tenantName,
    "{locataire_email}": data.tenantEmail || "",
    "{locataire_telephone}": data.tenantPhone || "",
    "{bien}": data.propertyTitle,
    "{bien_adresse}": data.propertyAddress || "",
    "{unite}": data.unitNumber || "",
    "{loyer}": `${data.rentAmount.toLocaleString("fr-FR")} FCFA`,
    "{loyer_lettres}": numberToWords(data.rentAmount) + " francs CFA",
    "{caution}": data.deposit ? `${data.deposit.toLocaleString("fr-FR")} FCFA` : "Néant",
    "{caution_lettres}": data.deposit ? numberToWords(data.deposit) + " francs CFA" : "néant",
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
  
  // Header with agency logo if available
  if (data.agency?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(data.agency.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", margin, yPos, 25, 25);
        yPos += 5;
      }
    } catch (e) {
      // Continue without logo
    }
  }
  
  // Agency name header
  if (data.agency?.name) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    const logoOffset = data.agency?.logo_url ? 50 : margin;
    doc.text(data.agency.name, logoOffset, yPos + 10);
    
    if (data.agency.address || data.agency.city) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      const addressParts = [data.agency.address, data.agency.city, data.agency.country].filter(Boolean);
      doc.text(addressParts.join(", "), logoOffset, yPos + 17);
    }
    
    if (data.agency.phone || data.agency.email) {
      doc.setFontSize(9);
      const contact = [data.agency.phone, data.agency.email].filter(Boolean).join(" | ");
      doc.text(contact, logoOffset, yPos + 23);
    }
  }
  
  yPos = data.agency ? 55 : margin;
  
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

// Default contract template
export const DEFAULT_CONTRACT_TEMPLATE = `# CONTRAT DE BAIL D'HABITATION

Entre les soussignés :

## LE BAILLEUR
{bailleur}
Adresse : {bailleur_adresse}
Téléphone : {bailleur_telephone}
Email : {bailleur_email}

Ci-après dénommé "Le Bailleur"

## LE LOCATAIRE
{locataire}
Téléphone : {locataire_telephone}
Email : {locataire_email}

Ci-après dénommé "Le Locataire"

Il a été convenu ce qui suit :

### Article 1 - OBJET DU CONTRAT
Le Bailleur loue au Locataire, qui accepte, le bien immobilier suivant :
- Désignation : {bien}
- Adresse : {bien_adresse}
- Unité/Porte : {unite}

### Article 2 - DURÉE DU BAIL
Le présent bail est consenti pour une durée déterminée, commençant le {date_debut} et se terminant le {date_fin}.

### Article 3 - LOYER
Le loyer mensuel est fixé à {loyer} ({loyer_lettres}), payable d'avance le premier jour de chaque mois.

### Article 4 - DÉPÔT DE GARANTIE
Le Locataire verse au Bailleur un dépôt de garantie de {caution} ({caution_lettres}) à la signature du présent contrat.
Ce dépôt sera restitué au Locataire dans un délai d'un mois suivant la remise des clés, déduction faite des sommes restant dues au Bailleur.

### Article 5 - CHARGES
Les charges locatives sont à la charge du Locataire et comprennent notamment :
- L'eau et l'électricité
- L'entretien courant du logement
- Les menues réparations

### Article 6 - OBLIGATIONS DU LOCATAIRE
Le Locataire s'engage à :
- Payer le loyer et les charges aux termes convenus
- User paisiblement des locaux loués
- Répondre des dégradations survenant pendant la durée du bail
- Prendre à sa charge l'entretien courant du logement
- Ne pas sous-louer sans l'accord écrit du Bailleur

### Article 7 - OBLIGATIONS DU BAILLEUR
Le Bailleur s'engage à :
- Remettre au Locataire un logement décent
- Assurer la jouissance paisible du logement
- Entretenir les locaux en état de servir à l'usage prévu
- Effectuer les réparations autres que locatives

### Article 8 - RÉSILIATION
En cas de non-paiement du loyer ou des charges, le Bailleur pourra demander la résiliation du bail après mise en demeure restée infructueuse pendant un délai de 15 jours.

### Article 9 - ÉTAT DES LIEUX
Un état des lieux contradictoire sera établi à l'entrée et à la sortie du Locataire.

### Article 10 - ÉLECTION DE DOMICILE
Pour l'exécution du présent contrat, les parties font élection de domicile à l'adresse du bien loué.

Fait en deux exemplaires originaux, à {bailleur_adresse}, le {date_jour}.
`;
