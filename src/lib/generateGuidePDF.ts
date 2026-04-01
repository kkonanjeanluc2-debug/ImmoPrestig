import jsPDF from "jspdf";

export interface GuideEntry {
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
  area?: number;
}

interface LotBlock {
  ilot: string;
  lot: string;
  area: number;
  entries: GuideEntry[];
}

export interface GuideOptions {
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
  village?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
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

function groupEntriesByLot(entries: GuideEntry[]): LotBlock[] {
  const map = new Map<string, LotBlock>();
  entries.forEach(e => {
    const key = `${e.ilot}__${e.lot}`;
    if (!map.has(key)) {
      map.set(key, { ilot: e.ilot, lot: e.lot, area: e.area || 0, entries: [] });
    }
    map.get(key)!.entries.push(e);
  });
  return Array.from(map.values());
}

function drawLotBlock(
  doc: jsPDF,
  block: LotBlock,
  yStart: number,
  pageWidth: number,
  margin: number,
  commune: string,
  village: string,
  lotissementName: string,
) {
  const contentWidth = pageWidth - margin * 2;
  const x = margin;
  let y = yStart;

  // === Header line 1: COMMUNE / VILLAGE / LOTISSEMENT ===
  const headerH = 7;
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y, contentWidth, headerH, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(x, y, contentWidth, headerH);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);

  const col1W = contentWidth / 3;
  doc.text(`COMMUNE DE ${commune.toUpperCase()}`, x + 3, y + 5);
  doc.text(`VILLAGE DE ${village.toUpperCase()}`, x + col1W + 3, y + 5);
  doc.text(`LOTISSEMENT : ${lotissementName.toUpperCase()}`, x + col1W * 2 + 3, y + 5);
  y += headerH;

  // === Header line 2: ILOT / LOT / SUPERFICIE / AFFECTATION / ARRETE ===
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y, contentWidth, headerH, "F");
  doc.rect(x, y, contentWidth, headerH);

  doc.setFontSize(8);
  const segW = contentWidth / 5;
  doc.text(`ILOT :  `, x + 3, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text(`${block.ilot}`, x + 3 + doc.getTextWidth("ILOT :  "), y + 5);

  doc.setFont("helvetica", "bold");
  doc.text(`LOT : `, x + segW + 3, y + 5);
  doc.text(`${block.lot}`, x + segW + 3 + doc.getTextWidth("LOT : "), y + 5);

  const areaStr = block.area ? block.area.toString() : "";
  doc.text(`SUPERFICIE (m2) : `, x + segW * 2 + 3, y + 5);
  doc.text(areaStr, x + segW * 2 + 3 + doc.getTextWidth("SUPERFICIE (m2) : "), y + 5);

  doc.setFont("helvetica", "normal");
  doc.text("AFFECTATION :", x + segW * 3 + 3, y + 5);
  doc.text("ARRETE N° :", x + segW * 4 + 3, y + 5);
  y += headerH;

  // === Table header ===
  // Columns: N° | NOM ET PRENOMS | Attestation N° | DATE | ADRESSES ET CONTACTS | NATURE | N° | DATE
  const tableHeaderH1 = 6; // "ATTRIBUTAIRES" / "ATTESTATION" / "PIECES" row
  const tableHeaderH2 = 6; // sub-header row
  const rowH = 8;
  const maxRows = 3;

  // Column widths
  const cols = [
    12,                          // N°
    contentWidth * 0.22,         // NOM ET PRENOMS
    contentWidth * 0.10,         // Attestation N°
    contentWidth * 0.10,         // DATE
    contentWidth * 0.16,         // ADRESSES ET CONTACTS
    contentWidth * 0.12,         // NATURE
    contentWidth * 0.12,         // N° Pièce
    0,                           // DATE Pièce (remainder)
  ];
  cols[7] = contentWidth - cols.slice(0, 7).reduce((a, b) => a + b, 0);

  // --- Merged header row ---
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  // ATTRIBUTAIRES spans cols 0-1
  const attrW = cols[0] + cols[1];
  doc.rect(x, y, attrW, tableHeaderH1);
  doc.text("ATTRIBUTAIRES", x + attrW / 2, y + 4, { align: "center" });

  // ATTESTATION spans cols 2-3
  const attestW = cols[2] + cols[3];
  let cx = x + attrW;
  doc.rect(cx, y, attestW, tableHeaderH1);
  doc.text("ATTESTATION", cx + attestW / 2, y + 4, { align: "center" });

  // ADRESSES ET CONTACTS spans col 4, merged across both rows
  cx += attestW;
  doc.rect(cx, y, cols[4], tableHeaderH1 + tableHeaderH2);
  doc.text("ADRESSES ET", cx + cols[4] / 2, y + 3.5, { align: "center" });
  doc.text("CONTACTS", cx + cols[4] / 2, y + 7.5, { align: "center" });

  // PIECES spans cols 5-7
  const piecesW = cols[5] + cols[6] + cols[7];
  cx += cols[4];
  doc.rect(cx, y, piecesW, tableHeaderH1);
  doc.text("PIECES", cx + piecesW / 2, y + 4, { align: "center" });

  y += tableHeaderH1;

  // --- Sub-header row ---
  let sx = x;
  const subLabels = ["N°", "NOM ET PRENOMS", "N°", "DATE", "", "NATURE", "N°", "DATE"];
  for (let i = 0; i < cols.length; i++) {
    if (i === 4) {
      // already drawn merged cell above
      sx += cols[i];
      continue;
    }
    doc.rect(sx, y, cols[i], tableHeaderH2);
    doc.text(subLabels[i], sx + cols[i] / 2, y + 4, { align: "center" });
    sx += cols[i];
  }
  y += tableHeaderH2;

  // === Data rows (always 3 rows) ===
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  for (let r = 0; r < maxRows; r++) {
    const entry = block.entries[r];
    let rx = x;

    for (let c = 0; c < cols.length; c++) {
      doc.rect(rx, y, cols[c], rowH);

      let text = "";
      if (entry) {
        switch (c) {
          case 0: text = String(r + 1); break;
          case 1: text = entry.attributaire || ""; doc.setFont("helvetica", "bold"); break;
          case 2: text = entry.attestation_numero || ""; break;
          case 3: text = entry.attestation_date || ""; break;
          case 4: text = entry.contact || ""; break;
          case 5: text = entry.nature_piece || ""; break;
          case 6: text = entry.numero_piece || ""; break;
          case 7: text = entry.date_piece || ""; break;
        }
      } else {
        if (c === 0) text = String(r + 1);
      }

      // Truncate if needed
      const maxW = cols[c] - 2;
      let displayText = text;
      while (doc.getTextWidth(displayText) > maxW && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText.length < text.length && displayText.length > 0) {
        displayText = displayText.slice(0, -1) + "…";
      }

      const tx = c === 0 ? rx + cols[c] / 2 : rx + 1.5;
      const align = c === 0 ? "center" as const : "left" as const;

      // For contact field, handle multi-line (phone numbers)
      if (c === 4 && entry?.contact) {
        // Split by separators or by 10-digit phone number groups
        let phones: string[];
        if (/[,;\/]/.test(entry.contact)) {
          phones = entry.contact.split(/[,;\/]/).map(p => p.trim()).filter(Boolean);
        } else {
          const matches = entry.contact.match(/\d{10}/g);
          phones = matches && matches.length > 1 ? matches : [entry.contact];
        }
        if (phones.length > 1) {
          doc.setFontSize(7);
          const colCenter = rx + cols[c] / 2;
          phones.forEach((phone, pi) => {
            if (pi < 2) {
              doc.text(phone.trim(), colCenter, y + 3 + pi * 3.5, { align: "center" });
            }
          });
          doc.setFontSize(7);
        } else {
          doc.text(displayText, tx, y + rowH / 2 + 1, { align });
        }
      } else {
        doc.text(displayText, tx, y + rowH / 2 + 1, { align });
      }

      if (c === 1) doc.setFont("helvetica", "normal");
      rx += cols[c];
    }

    y += rowH;
  }

  return y;
}

export async function generateGuidePDF(
  entries: GuideEntry[],
  lotissementName: string,
  options: GuideOptions
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();  // 297 landscape
  const ph = doc.internal.pageSize.getHeight(); // 210 landscape
  const margin = 12;

  const commune = options.coverPage?.commune || "";
  const village = options.village || "";

  // Group entries by lot
  const lotBlocks = groupEntriesByLot(entries);

  // === COVER PAGE (landscape, matching official guide format) ===
  if (options.coverPage) {
    const cp = options.coverPage;

    // Background: soft peach/cream gradient
    const bgBase: [number, number, number] = [255, 255, 255];
    doc.setFillColor(bgBase[0], bgBase[1], bgBase[2]);
    doc.rect(0, 0, pw, ph, "F");

    // Decorative border pattern (top and bottom)
    const borderRgb = hexToRgb(cp.border_color);
    const patternH = 6;
    
    // Top decorative band
    doc.setFillColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.rect(0, 0, pw, patternH, "F");
    doc.setFillColor(255, 255, 255);
    const zigW = 8;
    for (let i = 0; i < pw / zigW; i++) {
      const zx = i * zigW;
      doc.triangle(zx, patternH, zx + zigW / 2, 0, zx + zigW, patternH, "F");
    }
    doc.setFillColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    for (let i = 0; i < pw / zigW; i++) {
      const zx = i * zigW + zigW / 2;
      doc.triangle(zx - zigW / 4, patternH, zx, patternH - 3, zx + zigW / 4, patternH, "F");
    }

    // Bottom decorative band
    doc.setFillColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.rect(0, ph - patternH, pw, patternH, "F");
    doc.setFillColor(255, 255, 255);
    for (let i = 0; i < pw / zigW; i++) {
      const zx = i * zigW;
      doc.triangle(zx, ph - patternH, zx + zigW / 2, ph, zx + zigW, ph - patternH, "F");
    }
    doc.setFillColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    for (let i = 0; i < pw / zigW; i++) {
      const zx = i * zigW + zigW / 2;
      doc.triangle(zx - zigW / 4, ph - patternH, zx, ph - patternH + 3, zx + zigW / 4, ph - patternH, "F");
    }
    // MCLAU logo centered at top
    const mclauLogo = await loadImageAsBase64("/images/mclau-logo.png");
    if (mclauLogo) {
      try {
        const logoW = 50;
        const logoH = 35;
        const logoX = pw / 2 - logoW / 2;
        const logoY = patternH + 8;
        doc.addImage(mclauLogo, "PNG", logoX, logoY, logoW, logoH);
      } catch (e) { console.error("MCLAU logo error:", e); }
    }

    // Armoiries logo top-right
    const armoiriesLogo = await loadImageAsBase64("/images/armoiries-ci.png");
    if (armoiriesLogo) {
      try {
        const armW = 35;
        const armH = 40;
        const armX = pw - margin - armW;
        const armY = patternH + 5;
        doc.addImage(armoiriesLogo, "PNG", armX, armY, armW, armH);
      } catch (e) { console.error("Armoiries logo error:", e); }
    }

    const titleRgb = hexToRgb(cp.title_color);
    const centerY = ph * 0.42;
    
    doc.setFontSize(42);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text("GUIDE DU LOTISSEMENT", pw / 2, centerY, { align: "center" });

    // Lotissement name (underlined)
    const subRgb = hexToRgb(cp.subtitle_color);
    doc.setFontSize(36);
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    const nameY = centerY + 18;
    doc.text(lotissementName.toUpperCase(), pw / 2, nameY, { align: "center" });
    // Underline
    const nameW = doc.getTextWidth(lotissementName.toUpperCase());
    doc.setDrawColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.setLineWidth(0.8);
    doc.line(pw / 2 - nameW / 2, nameY + 2, pw / 2 + nameW / 2, nameY + 2);

    // Ilot/lot ranges box
    const ilotGroups = new Map<string, GuideEntry[]>();
    entries.forEach(e => {
      const arr = ilotGroups.get(e.ilot) || [];
      arr.push(e);
      ilotGroups.set(e.ilot, arr);
    });
    const ilotEntries = Array.from(ilotGroups.entries());

    if (ilotEntries.length > 0) {
      const lineHeight = 8;
      const boxContentLines: string[] = [];

      // If many ilots, show a global summary instead of listing all
      if (ilotEntries.length > 4) {
        const allIlots = ilotEntries.map(([ilot]) => ilot).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
        const allLots = entries.map(e => e.lot).filter(Boolean);
        const sortedLots = [...new Set(allLots)].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
        boxContentLines.push(`ILOT N°${allIlots[0]} À ILOT N°${allIlots[allIlots.length - 1]}`);
        if (sortedLots.length > 1) {
          boxContentLines.push(`LOT N°${sortedLots[0]} À LOT N°${sortedLots[sortedLots.length - 1]}`);
        }
      } else {
        ilotEntries.forEach(([ilot, iEntries], idx) => {
          const lots = [...new Set(iEntries.map(e => e.lot))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
          boxContentLines.push(`ILOT N°${ilot}`);
          boxContentLines.push(lots.length > 1 ? `LOT N°${lots[0]} À LOT N°${lots[lots.length - 1]}` : `LOT N°${lots[0]}`);
          if (idx < ilotEntries.length - 1) boxContentLines.push("&&");
        });
      }

      const boxWidth = pw * 0.55;
      const boxX = (pw - boxWidth) / 2;
      const boxPaddingV = 8;
      let boxY = nameY + 12;

      // Only show if it fits
      const boxH = boxContentLines.length * lineHeight + boxPaddingV * 2;
      if (boxY + boxH < ph - patternH - 25) {
        doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
        doc.setLineWidth(1);
        doc.rect(boxX, boxY, boxWidth, boxH);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);

        let textY = boxY + boxPaddingV + 4;
        boxContentLines.forEach(line => {
          if (line === "&&") {
            doc.setTextColor(0, 0, 0);
            doc.text(line, pw / 2, textY, { align: "center" });
            doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
          } else {
            doc.text(line, pw / 2, textY, { align: "center" });
          }
          textY += lineHeight;
        });
      }
    }

    // (Village watermark removed)

    // Date at bottom
    const now = new Date();
    const monthNames = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.text(`${monthNames[now.getMonth()]} ${now.getFullYear()}`, pw - margin - 5, ph - patternH - 10, { align: "right" });

    doc.setTextColor(0, 0, 0);
  }

  // === LOT PAGES (2 lots per page, landscape) ===
  const landscapeW = 297; // A4 landscape width
  const landscapeH = 210; // A4 landscape height
  const blockHeight = 7 + 7 + 6 + 6 + (8 * 3); // header1 + header2 + tableHeader1 + tableHeader2 + 3 rows = 50mm
  const gapBetweenBlocks = 12;
  const footerHeight = 10;

  let blockIndex = 0;

  while (blockIndex < lotBlocks.length) {
    doc.addPage("a4", "landscape");

    // First lot block
    let yPos = margin;
    yPos = drawLotBlock(doc, lotBlocks[blockIndex], yPos, landscapeW, margin, commune, village, lotissementName);
    blockIndex++;

    // Second lot block if it fits
    if (blockIndex < lotBlocks.length) {
      yPos += gapBetweenBlocks;
      if (yPos + blockHeight + footerHeight <= landscapeH - margin) {
        yPos = drawLotBlock(doc, lotBlocks[blockIndex], yPos, landscapeW, margin, commune, village, lotissementName);
        blockIndex++;
      }
    }

    // Footer
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.text(`Guide de partage de lotissement ${lotissementName.toUpperCase()}`, landscapeW / 2, landscapeH - margin, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Remove the first blank page if no cover
  if (!options.coverPage) {
    doc.deletePage(1);
  }

  doc.save(`Guide_${lotissementName.replace(/\s+/g, "_")}.pdf`);
}
