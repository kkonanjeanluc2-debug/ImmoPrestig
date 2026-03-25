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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

export async function generateGuidePDF(
  entries: GuideEntry[],
  lotissementName: string,
  options: GuideOptions
) {
  const hasCover = !!options.coverPage;
  const doc = new jsPDF({ orientation: hasCover ? "portrait" : "landscape", unit: "mm", format: "a4" });
  const margin = 10;

  // Load logo
  let logoBase64: string | null = null;
  if (options.agency?.logo_url) {
    logoBase64 = await loadImageAsBase64(options.agency.logo_url);
  }

  // Group entries by ilot
  const ilotGroups = new Map<string, GuideEntry[]>();
  entries.forEach(e => {
    const arr = ilotGroups.get(e.ilot) || [];
    arr.push(e);
    ilotGroups.set(e.ilot, arr);
  });

  // ===== COVER PAGE (Portrait) =====
  if (hasCover && options.coverPage) {
    const cp = options.coverPage;
    const pw = doc.internal.pageSize.getWidth(); // 210 portrait
    const ph = doc.internal.pageSize.getHeight(); // 297 portrait

    // Background
    if (cp.bg_color && cp.bg_color !== "#FFFFFF") {
      const bg = hexToRgb(cp.bg_color);
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(0, 0, pw, ph, "F");
    }

    let yPos = 35;

    // District & Commune
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    if (cp.district) {
      doc.text(cp.district.toUpperCase(), pw / 2, yPos, { align: "center" });
      yPos += 8;
    }
    if (cp.commune) {
      doc.text(cp.commune.toUpperCase(), pw / 2, yPos, { align: "center" });
      yPos += 6;
      doc.setLineWidth(0.5);
      doc.line(pw / 2 - 35, yPos, pw / 2 + 35, yPos);
      yPos += 15;
    }

    // Large "GUIDE" title
    yPos += 10;
    const titleRgb = hexToRgb(cp.title_color);
    doc.setFontSize(52);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text("GUIDE", pw / 2, yPos, { align: "center" });
    yPos += 18;

    // "LOTISSEMENT [NAME]"
    const subRgb = hexToRgb(cp.subtitle_color);
    doc.setFontSize(20);
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.text(`LOTISSEMENT ${lotissementName.toUpperCase()}`, pw / 2, yPos, { align: "center" });
    yPos += 25;

    // Bordered box with ilot/lot ranges
    const borderRgb = hexToRgb(cp.border_color);
    const ilotEntries = Array.from(ilotGroups.entries());
    if (ilotEntries.length > 0) {
      const lineHeight = 9;
      const boxContentLines: string[] = [];

      ilotEntries.forEach(([ilot, iEntries], idx) => {
        const lots = iEntries.map(e => e.lot).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
        boxContentLines.push(`ILOT N°${ilot}`);
        boxContentLines.push(lots.length > 1 ? `LOT N°${lots[0]} À LOT N°${lots[lots.length - 1]}` : `LOT N°${lots[0]}`);
        if (idx < ilotEntries.length - 1) {
          boxContentLines.push("&&");
        }
      });

      const boxWidth = 140;
      const boxX = (pw - boxWidth) / 2;
      const boxPaddingTop = 12;
      const boxPaddingBottom = 6;
      const maxBoxContentHeight = ph - yPos - 40; // Leave space for date at bottom
      const maxLinesPerPage = Math.floor((maxBoxContentHeight - boxPaddingTop - boxPaddingBottom) / lineHeight);

      // Split lines across pages if needed
      let lineIndex = 0;
      let isFirstBoxPage = true;

      while (lineIndex < boxContentLines.length) {
        const linesForThisPage = boxContentLines.slice(lineIndex, lineIndex + maxLinesPerPage);
        const boxHeight = linesForThisPage.length * lineHeight + boxPaddingTop + boxPaddingBottom;

        if (!isFirstBoxPage) {
          doc.addPage("a4", "portrait");
          // Re-apply background
          if (cp.bg_color && cp.bg_color !== "#FFFFFF") {
            const bg = hexToRgb(cp.bg_color);
            doc.setFillColor(bg[0], bg[1], bg[2]);
            doc.rect(0, 0, pw, ph, "F");
          }
          yPos = 30;
        }

        doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
        doc.setLineWidth(1.2);
        doc.rect(boxX, yPos, boxWidth, boxHeight);

        let textY = yPos + boxPaddingTop;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);

        linesForThisPage.forEach(line => {
          if (line === "&&") {
            doc.setTextColor(0, 0, 0);
            doc.text(line, pw / 2, textY, { align: "center" });
            doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
          } else {
            doc.text(line, pw / 2, textY, { align: "center" });
          }
          textY += lineHeight;
        });

        yPos += boxHeight + 20;
        lineIndex += maxLinesPerPage;
        isFirstBoxPage = false;
      }
    }

    // Date
    const now = new Date();
    const monthNames = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.text(`${monthNames[now.getMonth()]} ${now.getFullYear()}`, pw / 2, yPos, { align: "center" });

    doc.setTextColor(0, 0, 0);
  }

  // ===== TABLE PAGES (Landscape) =====
  // All table pages are landscape
  const landscapeW = 297; // A4 landscape width
  const landscapeH = 210; // A4 landscape height
  const contentWidth = landscapeW - margin * 2;

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

  const totalColWidth = cols.reduce((s, c) => s + c.width, 0);
  const scale = contentWidth / totalColWidth;
  cols.forEach(c => (c.width = Math.round(c.width * scale * 10) / 10));

  const rowHeight = 7;
  const headerHeight = 10;

  function drawPageHeader(pageNum: number, pageEntries?: GuideEntry[]) {
    let yPos = margin;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`GUIDE LOTISSEMENT ${lotissementName.toUpperCase()}`, landscapeW / 2, yPos + 5, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${options.totalParcelles} PARCELLE${options.totalParcelles > 1 ? "S" : ""}`, landscapeW / 2, yPos + 10, { align: "center" });

    // Dynamic ilot/lot range for this page
    if (pageEntries && pageEntries.length > 0) {
      const ilots = pageEntries.map(e => e.ilot);
      const lots = pageEntries.map(e => e.lot);
      const uniqueIlots = [...new Set(ilots)].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
      const sortedLots = lots.sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
      const ilotRange = uniqueIlots.length === 1 ? `Îlot N°${uniqueIlots[0]}` : `Îlot N°${uniqueIlots[0]} à N°${uniqueIlots[uniqueIlots.length - 1]}`;
      const lotRange = `Lot N°${sortedLots[0]} à N°${sortedLots[sortedLots.length - 1]}`;
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.text(`${ilotRange} / ${lotRange}`, landscapeW / 2, yPos + 14, { align: "center" });
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`PAGE | ${pageNum}`, landscapeW - margin, yPos + 5, { align: "right" });

    return yPos + 18;
  }

  function drawTableHeader(yPos: number) {
    doc.setFillColor(34, 139, 34);
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
    if (isEven) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos, contentWidth, rowHeight, "F");
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, yPos, contentWidth, rowHeight);

    let xPos = margin;
    cols.forEach((col, i) => {
      if (i > 0) doc.line(xPos, yPos, xPos, yPos + rowHeight);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", i === 3 && entry.attributaire ? "bold" : "normal");

      const values = [
        String(entry.numero), entry.ilot, entry.lot,
        entry.attributaire || "", entry.attestation_numero || "",
        entry.attestation_date || "", entry.contact || "",
        entry.equipement || "", entry.nature_piece || "",
        entry.numero_piece || "", entry.date_piece || "",
      ];

      const text = values[i];
      const align = i === 0 ? "center" : "left";
      const tx = align === "center" ? xPos + col.width / 2 : xPos + 1.5;

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

  // Render table pages
  let pageNum = 1;
  let entryIndex = 0;

  while (entryIndex < entries.length) {
    doc.addPage("a4", "landscape");

    let yPos = drawPageHeader(pageNum);
    yPos = drawTableHeader(yPos);

    let rowsOnPage = 0;
    const maxY = landscapeH - margin - 5;

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
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, margin, landscapeH - 5);
    doc.setTextColor(0, 0, 0);

    pageNum++;
  }

  // If no cover page was added, remove the first blank page
  if (!hasCover) {
    doc.deletePage(1);
  }

  doc.save(`Guide_${lotissementName.replace(/\s+/g, "_")}.pdf`);
}
