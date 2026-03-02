import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, addPDFFooter, type PDFAgencyInfo } from "@/lib/pdfHeader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { EtatDesLieux } from "@/hooks/useEtatsDesLieux";

const typeLabels: Record<string, string> = {
  entree: "État des lieux d'entrée",
  sortie: "État des lieux de sortie",
};

const conditionLabels: Record<string, string> = {
  excellent: "Excellent",
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
};

interface EtatDesLieuxPDFOptions {
  etat: EtatDesLieux;
  tenantName: string;
  propertyTitle?: string;
  unitNumber?: string;
  agency?: PDFAgencyInfo | null;
  /** @deprecated Use agency instead */
  agencyName?: string;
}

const checkPageBreak = (doc: any, y: number, needed: number = 30): number => {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
};

export const generateEtatDesLieuxPDF = async ({
  etat,
  tenantName,
  propertyTitle,
  unitNumber,
  agency,
  agencyName,
}: EtatDesLieuxPDFOptions) => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();

  const title = typeLabels[etat.type] || "État des lieux";

  // Use agency object if provided, otherwise build from agencyName for backwards compat
  const agencyInfo: PDFAgencyInfo | null = agency || (agencyName ? { name: agencyName } : null);

  let y = await addPDFHeader(doc, agencyInfo, title.toUpperCase());

  // General info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const addInfoLine = (label: string, value: string) => {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(label, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, y);
    y += 7;
  };

  addInfoLine("Date :", format(new Date(etat.inspection_date), "dd MMMM yyyy", { locale: fr }));
  addInfoLine("Locataire :", tenantName);
  if (propertyTitle) addInfoLine("Bien :", propertyTitle);
  if (unitNumber) addInfoLine("Unité :", unitNumber);
  if (etat.general_condition) {
    addInfoLine("État général :", conditionLabels[etat.general_condition] || "-");
  }
  addInfoLine("Statut :", etat.status === "completed" ? "Complété" : etat.status === "signed" ? "Signé" : "Brouillon");

  if (etat.general_comments) {
    y += 3;
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.text("Commentaires généraux :", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(etat.general_comments, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 5;
  }

  // Rooms section
  if (etat.rooms.length > 0) {
    y += 5;
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Pièces inspectées", 20, y);
    y += 8;

    for (const room of etat.rooms) {
      y = checkPageBreak(doc, y, 50);
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 4, pageWidth - 40, 8, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(room.name, 22, y + 1);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`État : ${conditionLabels[room.condition] || room.condition}`, pageWidth - 22, y + 1, { align: "right" });
      y += 10;

      doc.setFontSize(9);
      const fields = [
        { label: "Murs", value: room.walls },
        { label: "Sol", value: room.floor },
        { label: "Plafond", value: room.ceiling },
        { label: "Fenêtres", value: room.windows },
        { label: "Portes", value: room.doors },
        { label: "Électricité", value: room.electricity },
        { label: "Plomberie", value: room.plumbing },
      ];

      for (const field of fields) {
        if (field.value) {
          y = checkPageBreak(doc, y);
          doc.setFont("helvetica", "bold");
          doc.text(`${field.label} :`, 25, y);
          doc.setFont("helvetica", "normal");
          doc.text(field.value, 55, y);
          y += 5;
        }
      }

      if (room.comments) {
        y = checkPageBreak(doc, y);
        doc.setFont("helvetica", "bold");
        doc.text("Commentaires :", 25, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const cLines = doc.splitTextToSize(room.comments, pageWidth - 60);
        doc.text(cLines, 25, y);
        y += cLines.length * 4 + 3;
      }

      y += 5;
    }
  }

  // Meters section
  const hasMeters = etat.electricity_meter || etat.water_meter || etat.gas_meter;
  if (hasMeters) {
    y += 5;
    y = checkPageBreak(doc, y, 30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relevés des compteurs", 20, y);
    y += 8;
    doc.setFontSize(10);

    if (etat.electricity_meter) {
      addInfoLine("Électricité :", `${etat.electricity_meter} kWh`);
    }
    if (etat.water_meter) {
      addInfoLine("Eau :", `${etat.water_meter} m³`);
    }
    if (etat.gas_meter) {
      addInfoLine("Gaz :", `${etat.gas_meter} m³`);
    }
  }

  // Keys section
  if (etat.keys_delivered.length > 0) {
    y += 5;
    y = checkPageBreak(doc, y, 30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Clés remises", 20, y);
    y += 8;
    doc.setFontSize(10);

    doc.setFillColor(230, 230, 230);
    doc.rect(20, y - 4, pageWidth - 40, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Type", 22, y + 1);
    doc.text("Qté", 100, y + 1);
    doc.text("Description", 120, y + 1);
    y += 8;

    doc.setFont("helvetica", "normal");
    for (const key of etat.keys_delivered) {
      y = checkPageBreak(doc, y);
      doc.text(key.type, 22, y);
      doc.text(String(key.quantity), 100, y);
      if (key.description) doc.text(key.description, 120, y);
      y += 6;
    }
  }

  // Signatures section
  y += 10;
  y = checkPageBreak(doc, y, 40);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Signatures", 20, y);
  y += 10;

  doc.setFontSize(10);
  const sigBoxWidth = (pageWidth - 50) / 2;

  doc.setDrawColor(180);
  doc.rect(20, y, sigBoxWidth, 30);
  doc.setFont("helvetica", "bold");
  doc.text("Le bailleur", 20 + sigBoxWidth / 2, y + 6, { align: "center" });
  if (etat.landlord_signed_at) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Signé le ${format(new Date(etat.landlord_signed_at), "dd/MM/yyyy")}`, 20 + sigBoxWidth / 2, y + 25, { align: "center" });
  }

  doc.rect(30 + sigBoxWidth, y, sigBoxWidth, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Le locataire", 30 + sigBoxWidth + sigBoxWidth / 2, y + 6, { align: "center" });
  if (etat.tenant_signed_at) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Signé le ${format(new Date(etat.tenant_signed_at), "dd/MM/yyyy")}`, 30 + sigBoxWidth + sigBoxWidth / 2, y + 25, { align: "center" });
  }

  addPDFFooter(doc, agencyInfo, "État des lieux");

  const fileName = `etat-des-lieux-${etat.type}-${format(new Date(etat.inspection_date), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
};
