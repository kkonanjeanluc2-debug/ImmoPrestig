import jsPDF from "jspdf";

interface GuideEntry {
  numero: number;
  ilot: string;
  lot: string;
  attributaire: string;
  attestation_numero: string;
  attestation_date: string;
  contact: string;
  equipement: string;
  nature_piece: string;
  numero_piece: string;
  date_piece: string;
  status: string;
}

interface GuideOptions {
  totalParcelles: number;
  agency?: {
    name: string;
    logo_url?: string | null;
    phone?: string | null;
    email?: string;
    address?: string | null;
    city?: string | null;
  };
  coverPage?: {
    district: string;
    commune: string;
    title_color: string;
    subtitle_color: string;
    border_color: string;
    bg_color: string;
  };
}

async function loadImageAsBase64(url: string): Promise<string | null> {
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
}

export async function generateGuidePDF(
  entries: GuideEntry[],
  lotissementName: string,
  options: GuideOptions
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // Load logo
  let logoBase64: string | null = null;
  if (options.agency?.logo_url) {
    logoBase64 = await loadImageAsBase64(options.agency.logo_url);
  }

  // Column definitions
  const cols = [
    { label: "N°", width: 10 },
    { label: "Îlot", width: 18 },
    { label: "Lot", width: 16 },
    { label: "Attributaires\nNom & Prénoms", width: 52 },
    { label: "Attestation\nN°", width: 22 },
    { label: "Date", width: 22 },
    { label: "Contact", width: 28 },
    { label: "Équipement", width: 25 },
    { label: "Nature\nPièce", width: 22 },
    { label: "N° Pièce", width: 28 },
    { label: "Date\nPièce", width: 22 },
  ];

  // Adjust column widths to fill content area
  const totalColWidth = cols.reduce((s, c) => s + c.width, 0);
  const scale = contentWidth / totalColWidth;
  cols.forEach(c => (c.width = Math.round(c.width * scale * 10) / 10));

  const rowHeight = 7;
  const headerHeight = 10;

  // Group entries by ilot for page headers
  const ilotGroups = new Map<string, GuideEntry[]>();
  entries.forEach(e => {
    const arr = ilotGroups.get(e.ilot) || [];
    arr.push(e);
    ilotGroups.set(e.ilot, arr);
  });

  let currentPage = 0;
  const totalPages = Math.ceil(entries.length / 20); // estimate

  function drawPageHeader(pageNum: number) {
    let yPos = margin;

    // Title centered
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`GUIDE LOTISSEMENT ${lotissementName.toUpperCase()}`, pageWidth / 2, yPos + 5, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${options.totalParcelles} PARCELLE${options.totalParcelles > 1 ? "S" : ""}`, pageWidth / 2, yPos + 10, { align: "center" });

    // Page number right
    doc.setFontSize(7);
    doc.text(`PAGE | ${pageNum}`, pageWidth - margin, yPos + 5, { align: "right" });

    return yPos + 14;
  }

  function drawTableHeader(yPos: number) {
    // Header background
    doc.setFillColor(34, 139, 34); // Green
    doc.rect(margin, yPos, contentWidth, headerHeight, "F");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);

    let xPos = margin;
    cols.forEach(col => {
      const lines = col.label.split("\n");
      const lineHeight = 3.5;
      const startY = yPos + (headerHeight - lines.length * lineHeight) / 2 + lineHeight;
      lines.forEach((line, i) => {
        doc.text(line, xPos + col.width / 2, startY + i * lineHeight, { align: "center" });
      });
      xPos += col.width;
    });

    doc.setTextColor(0, 0, 0);
    return yPos + headerHeight;
  }

  function drawRow(entry: GuideEntry, yPos: number, isEven: boolean) {
    // Alternating bg
    if (isEven) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, contentWidth, rowHeight, "F");
    }

    // Grid lines
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, yPos, contentWidth, rowHeight);

    let xPos = margin;
    cols.forEach((col, i) => {
      if (i > 0) {
        doc.line(xPos, yPos, xPos, yPos + rowHeight);
      }

      doc.setFontSize(6.5);
      doc.setFont("helvetica", i === 3 && entry.attributaire ? "bold" : "normal");

      const values = [
        String(entry.numero),
        entry.ilot,
        entry.lot,
        entry.attributaire || "",
        entry.attestation_numero || "",
        entry.attestation_date || "",
        entry.contact || "",
        entry.equipement || "",
        entry.nature_piece || "",
        entry.numero_piece || "",
        entry.date_piece || "",
      ];

      const text = values[i];
      const align = i === 0 ? "center" : "left";
      const tx = align === "center" ? xPos + col.width / 2 : xPos + 1.5;
      
      // Truncate if too long
      const maxWidth = col.width - 3;
      let displayText = text;
      while (doc.getTextWidth(displayText) > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText.length < text.length && displayText.length > 0) {
        displayText = displayText.slice(0, -1) + "…";
      }

      doc.text(displayText, tx, yPos + rowHeight / 2 + 1.5, { align });
      xPos += col.width;
    });
  }

  // Render pages
  let pageNum = 1;
  let entryIndex = 0;

  while (entryIndex < entries.length) {
    if (pageNum > 1) doc.addPage("a4", "landscape");

    let yPos = drawPageHeader(pageNum);
    yPos = drawTableHeader(yPos);

    let rowsOnPage = 0;
    const maxY = pageHeight - margin - 5;

    while (entryIndex < entries.length && yPos + rowHeight <= maxY) {
      drawRow(entries[entryIndex], yPos, rowsOnPage % 2 === 0);
      yPos += rowHeight;
      entryIndex++;
      rowsOnPage++;
    }

    // Footer
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, margin, pageHeight - 5);
    doc.setTextColor(0, 0, 0);

    pageNum++;
  }

  doc.save(`Guide_${lotissementName.replace(/\s+/g, "_")}.pdf`);
}
