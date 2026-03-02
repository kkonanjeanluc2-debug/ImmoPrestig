import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, addPDFFooter, type PDFAgencyInfo } from "@/lib/pdfHeader";
import type { PropertyInventory, InventoryItem } from "@/hooks/usePropertyInventory";

const CONDITION_LABELS: Record<string, string> = {
  neuf: "Neuf",
  bon: "Bon état",
  use: "Usé",
  a_reparer: "À réparer",
  hors_service: "Hors service",
};

const TYPE_LABELS: Record<string, string> = {
  entree: "Entrée",
  sortie: "Sortie",
};

interface InventoryPDFData {
  inventory: PropertyInventory;
  items: InventoryItem[];
  propertyTitle: string;
  propertyAddress: string;
  agency?: PDFAgencyInfo | null;
}

export const generateInventoryPDF = async (data: InventoryPDFData) => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  const primaryColor: [number, number, number] = [26, 54, 93];
  const textColor: [number, number, number] = [51, 51, 51];

  const typeLabel = TYPE_LABELS[data.inventory.type] || data.inventory.type;
  let yPos = await addPDFHeader(doc, data.agency, "INVENTAIRE DU BIEN", `Location meublée - ${typeLabel}`);

  // General info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("1. Informations générales", margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  const infoLines = [
    `Bien : ${data.propertyTitle}`,
    `Adresse : ${data.propertyAddress}`,
    `Date de l'inventaire : ${new Date(data.inventory.inventory_date).toLocaleDateString("fr-FR")}`,
    `Type : ${typeLabel}`,
  ];

  for (const line of infoLines) {
    doc.text(line, margin, yPos);
    yPos += 6;
  }

  yPos += 5;

  // Items grouped by room
  const grouped = data.items.reduce((acc, item) => {
    if (!acc[item.room]) acc[item.room] = [];
    acc[item.room].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("2. Liste des pièces et équipements", margin, yPos);
  yPos += 10;

  for (const [room, roomItems] of Object.entries(grouped)) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    // Room header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(room.toUpperCase(), margin, yPos);
    yPos += 6;

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);

    const colX = [margin, margin + 65, margin + 85, margin + 115, margin + 145];
    doc.text("Élément", colX[0], yPos);
    doc.text("Qté", colX[1], yPos);
    doc.text("Marque/Modèle", colX[2], yPos);
    doc.text("État", colX[3], yPos);
    doc.text("Observations", colX[4], yPos);
    yPos += 4;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // Items
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);

    for (const item of roomItems) {
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = margin;
      }

      doc.text(item.item_name.substring(0, 25), colX[0], yPos);
      doc.text(item.quantity.toString(), colX[1], yPos);
      doc.text(
        [item.brand, item.model].filter(Boolean).join(" ").substring(0, 15) || "-",
        colX[2],
        yPos
      );
      doc.text(CONDITION_LABELS[item.condition] || item.condition, colX[3], yPos);
      doc.text((item.observations || "-").substring(0, 20), colX[4], yPos);
      yPos += 5;
    }

    yPos += 5;
  }

  // Notes
  if (data.inventory.general_notes) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("Notes générales", margin, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    const noteLines = doc.splitTextToSize(data.inventory.general_notes, maxWidth);
    for (const line of noteLines) {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }
  }

  // Signature section
  yPos += 15;
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("3. Validation", margin, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);
  doc.text("Le présent inventaire est annexé au contrat de bail et signé par les deux parties.", margin, yPos);
  yPos += 15;

  const sigColWidth = (pageWidth - margin * 2 - 20) / 2;

  doc.setFont("helvetica", "bold");
  doc.text("Le Bailleur", margin, yPos);
  doc.text("Le Locataire", margin + sigColWidth + 20, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  doc.text('Signature précédée de "Lu et approuvé"', margin, yPos);
  doc.text('Signature précédée de "Lu et approuvé"', margin + sigColWidth + 20, yPos);
  yPos += 25;

  doc.line(margin, yPos, margin + sigColWidth, yPos);
  doc.line(margin + sigColWidth + 20, yPos, margin + sigColWidth * 2 + 20, yPos);

  addPDFFooter(doc, data.agency, "Inventaire du bien");

  return doc;
};
