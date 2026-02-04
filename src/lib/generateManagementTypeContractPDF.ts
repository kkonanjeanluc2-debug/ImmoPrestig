import jsPDF from "jspdf";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";

interface ManagementTypeInfo {
  name: string;
  percentage: number;
  type: string;
  description?: string | null;
}

interface AgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string | null;
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

export const replaceManagementTypeContractVariables = (
  template: string,
  managementType: ManagementTypeInfo,
  agency?: AgencyInfo | null
): string => {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Sample data for preview
  const sampleRent = 150000;
  const sampleDeposit = 300000;

  const replacements: Record<string, string> = {
    // Bailleur/Owner placeholders (sample data)
    "{bailleur}": "[Nom du bailleur]",
    "{bailleur_adresse}": "[Adresse du bailleur]",
    "{bailleur_telephone}": "[Telephone du bailleur]",
    "{bailleur_email}": "[Email du bailleur]",
    "{bailleur_date_naissance}": "[Date de naissance]",
    "{bailleur_lieu_naissance}": "[Lieu de naissance]",
    "{bailleur_profession}": "[Profession]",
    "{bailleur_cni}": "[Numero CNI]",
    
    // Proprietaire fields
    "{proprietaire}": "[Nom du proprietaire]",
    "{proprietaire_adresse}": "[Adresse du proprietaire]",
    "{proprietaire_telephone}": "[Telephone du proprietaire]",
    "{proprietaire_email}": "[Email du proprietaire]",
    "{proprietaire_date_naissance}": "[Date de naissance]",
    "{proprietaire_lieu_naissance}": "[Lieu de naissance]",
    "{proprietaire_profession}": "[Profession]",
    "{proprietaire_cni}": "[Numero CNI]",
    
    // Agence fields
    "{agence}": agency?.name || "[Nom de l'agence]",
    "{agence_adresse}": agency 
      ? [agency.address, agency.city, agency.country].filter(Boolean).join(", ")
      : "[Adresse de l'agence]",
    "{agence_telephone}": agency?.phone || "[Telephone de l'agence]",
    "{agence_email}": agency?.email || "[Email de l'agence]",
    
    // Type de gestion
    "{type_gestion}": managementType.name,
    "{pourcentage_gestion}": `${managementType.percentage}%`,
    
    // Tenant info (sample)
    "{locataire}": "[Nom du locataire]",
    "{locataire_email}": "[Email du locataire]",
    "{locataire_telephone}": "[Telephone du locataire]",
    "{locataire_date_naissance}": "[Date de naissance]",
    "{locataire_lieu_naissance}": "[Lieu de naissance]",
    "{locataire_profession}": "[Profession]",
    "{locataire_cni}": "[Numero CNI]",
    "{contact_urgence_nom}": "[Contact d'urgence]",
    "{contact_urgence_telephone}": "[Tel. contact d'urgence]",
    
    // Property info (sample)
    "{bien}": "[Designation du bien]",
    "{bien_adresse}": "[Adresse du bien]",
    "{unite}": "[Numero d'unite]",
    
    // Financial info (sample)
    "{loyer}": formatAmountWithCurrency(sampleRent),
    "{loyer_lettres}": numberToWordsPDF(sampleRent) + " francs CFA",
    "{caution}": formatAmountWithCurrency(sampleDeposit),
    "{caution_lettres}": numberToWordsPDF(sampleDeposit) + " francs CFA",
    
    // Dates
    "{date_debut}": "[Date de debut]",
    "{date_fin}": "[Date de fin]",
    "{date_jour}": today,
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return result;
};

export const generateManagementTypeContractPDF = async (
  templateContent: string,
  managementType: ManagementTypeInfo,
  agency?: AgencyInfo | null
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
  
  // Header with agency info and logo
  if (agency) {
    const headerStartY = yPos;
    let logoLoaded = false;
    
    if (agency.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(agency.logo_url);
        if (logoBase64) {
          doc.addImage(logoBase64, "PNG", margin, yPos, 30, 30);
          logoLoaded = true;
        }
      } catch (e) {
        console.log("Could not load logo:", e);
      }
    }
    
    const textStartX = logoLoaded ? margin + 35 : margin;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(agency.name, textStartX, yPos + 8);
    
    const addressParts = [agency.address, agency.city, agency.country].filter(Boolean);
    if (addressParts.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...textColor);
      doc.text(addressParts.join(", "), textStartX, yPos + 15);
    }
    
    const contactParts: string[] = [];
    if (agency.phone) contactParts.push(`Tel: ${agency.phone}`);
    if (agency.email) contactParts.push(`Email: ${agency.email}`);
    
    if (contactParts.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(contactParts.join(" | "), textStartX, yPos + 21);
    }
    
    yPos = headerStartY + 35;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    yPos += 10;
  }
  
  // Title with management type info
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("MODELE DE CONTRAT DE LOCATION", pageWidth / 2, yPos, { align: "center" });
  
  yPos += 8;
  
  // Management type subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Type de gestion : ${managementType.name} (${managementType.percentage}%)`, pageWidth / 2, yPos, { align: "center" });
  
  yPos += 15;
  
  // Replace variables in template
  const filledContent = replaceManagementTypeContractVariables(templateContent, managementType, agency);
  
  // Parse and render the content
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  
  const lines = filledContent.split("\n");
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    
    if (trimmedLine.startsWith("# ")) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text(trimmedLine.substring(2), margin, yPos);
      yPos += 10;
    } else if (trimmedLine.startsWith("## ")) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      yPos += 5;
      doc.text(trimmedLine.substring(3), margin, yPos);
      yPos += 8;
    } else if (trimmedLine.startsWith("### ")) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(trimmedLine.substring(4), margin, yPos);
      yPos += 7;
    } else if (trimmedLine === "") {
      yPos += 5;
    } else {
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
  
  // Signature section
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
  
  // Left signature (Bailleur)
  doc.setFont("helvetica", "bold");
  doc.text("Le Bailleur", margin, signatureY);
  doc.setFont("helvetica", "normal");
  doc.text('Signature precedee de', margin, signatureY + 7);
  doc.text('"Lu et approuve"', margin, signatureY + 12);
  doc.line(margin, signatureY + 45, margin + colWidth, signatureY + 45);
  
  // Right signature (Locataire)
  const rightX = margin + colWidth + 20;
  doc.setFont("helvetica", "bold");
  doc.text("Le Locataire", rightX, signatureY);
  doc.setFont("helvetica", "normal");
  doc.text('Signature precedee de', rightX, signatureY + 7);
  doc.text('"Lu et approuve"', rightX, signatureY + 12);
  doc.line(rightX, signatureY + 45, rightX + colWidth, signatureY + 45);
  
  // Footer note
  yPos = signatureY + 60;
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = margin;
  }
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Document genere le ${formatDate(new Date().toISOString())} - Modele de contrat pour ${managementType.name}`,
    margin,
    yPos,
    { maxWidth: maxWidth }
  );
  
  return doc;
};

export const downloadManagementTypeContractPDF = async (
  templateContent: string,
  managementType: ManagementTypeInfo,
  agency?: AgencyInfo | null
): Promise<void> => {
  const doc = await generateManagementTypeContractPDF(templateContent, managementType, agency);
  const safeName = managementType.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  doc.save(`modele_contrat_${safeName}.pdf`);
};
