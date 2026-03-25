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
  const hasCover = !!options.coverPage;
  // Start portrait if cover page, otherwise landscape
  const doc = new jsPDF({ orientation: hasCover ? "portrait" : "landscape", unit: "mm", format: "a4" });

  // Load logo
  let logoBase64: string | null = null;
  if (options.agency?.logo_url) {
    logoBase64 = await loadImageAsBase64(options.agency.logo_url);
  }

  const margin = 10;

  // Group entries by ilot for summary on cover page
  const ilotGroups = new Map<string, GuideEntry[]>();
  entries.forEach(e => {
    const arr = ilotGroups.get(e.ilot) || [];
    arr.push(e);
    ilotGroups.set(e.ilot, arr);
  });

  // ===== COVER PAGE =====
  if (options.coverPage) {
    const cp = options.coverPage;
    const hexToRgb = (hex: string) => {
      const h = hex.replace("#", "");
      return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)] as [number, number, number];
    };

    // Background
    if (cp.bg_color && cp.bg_color !== "#FFFFFF") {
      const bg = hexToRgb(cp.bg_color);
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    }

    let yPos = 25;

    // District & Commune centered at top
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    if (cp.district) {
      doc.text(cp.district.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
      yPos += 7;
    }
    if (cp.commune) {
      doc.text(cp.commune.toUpperCase(), pageWidth / 2, yPos, { align: "center" });
      yPos += 5;
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 30, yPos, pageWidth / 2 + 30, yPos);
      yPos += 10;
    }

    // Large "GUIDE" title
    yPos += 10;
    const titleRgb = hexToRgb(cp.title_color);
    doc.setFontSize(42);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text("GUIDE", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // "LOTISSEMENT [NAME]"
    const subRgb = hexToRgb(cp.subtitle_color);
    doc.setFontSize(18);
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.text(`LOTISSEMENT ${lotissementName.toUpperCase()}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 20;

    // Bordered box with ilot/lot ranges
    const borderRgb = hexToRgb(cp.border_color);
    const ilotEntries = Array.from(ilotGroups.entries());
    if (ilotEntries.length > 0) {
      const lineHeight = 8;
      const boxContentLines: string[] = [];
      
      ilotEntries.forEach(([ilot, ilotEntries], idx) => {
        const lots = ilotEntries.map(e => e.lot).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
        const firstLot = lots[0];
        const lastLot = lots[lots.length - 1];
        boxContentLines.push(`ILOT N°${ilot}`);
        boxContentLines.push(lots.length > 1 ? `LOT N°${firstLot} À ${lastLot}` : `LOT N°${firstLot}`);
        if (idx < ilotEntries.length - 1 && ilotEntries.length > 1) {
          boxContentLines.push("&&");
        }
      });

      const boxHeight = boxContentLines.length * lineHeight + 12;
      const boxWidth = 160;
      const boxX = (pageWidth - boxWidth) / 2;

      doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
      doc.setLineWidth(1);
      doc.rect(boxX, yPos, boxWidth, boxHeight);

      let textY = yPos + 10;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);

      boxContentLines.forEach(line => {
        if (line === "&&") {
          doc.setTextColor(0, 0, 0);
          doc.text(line, pageWidth / 2, textY, { align: "center" });
          doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
        } else {
          doc.text(line, pageWidth / 2, textY, { align: "center" });
        }
        textY += lineHeight;
      });

      yPos += boxHeight + 15;
    }

    // Date
    const now = new Date();
    const monthNames = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.text(`${monthNames[now.getMonth()]} ${now.getFullYear()}`, pageWidth / 2, yPos, { align: "center" });

    doc.setTextColor(0, 0, 0);
  }

  // ===== TABLE PAGES =====
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
    doc.addPage("a4", "landscape");

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
