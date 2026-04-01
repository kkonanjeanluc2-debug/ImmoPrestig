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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();  // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const margin = 12;

  const commune = options.coverPage?.commune || "";
  const village = options.village || "";

  // Group entries by lot
  const lotBlocks = groupEntriesByLot(entries);

  // === COVER PAGE (optional) ===
  if (options.coverPage) {
    const cp = options.coverPage;

    if (cp.bg_color && cp.bg_color !== "#FFFFFF") {
      const bg = hexToRgb(cp.bg_color);
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(0, 0, pw, ph, "F");
    }

    let yPos = 35;

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

    yPos += 10;
    const titleRgb = hexToRgb(cp.title_color);
    doc.setFontSize(52);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text("GUIDE", pw / 2, yPos, { align: "center" });
    yPos += 18;

    const subRgb = hexToRgb(cp.subtitle_color);
    doc.setFontSize(20);
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.text(`LOTISSEMENT ${lotissementName.toUpperCase()}`, pw / 2, yPos, { align: "center" });
    yPos += 25;

    // Bordered box with ilot/lot ranges
    const borderRgb = hexToRgb(cp.border_color);
    const ilotGroups = new Map<string, GuideEntry[]>();
    entries.forEach(e => {
      const arr = ilotGroups.get(e.ilot) || [];
      arr.push(e);
      ilotGroups.set(e.ilot, arr);
    });

    const ilotEntries = Array.from(ilotGroups.entries());
    if (ilotEntries.length > 0) {
      const lineHeight = 9;
      const boxContentLines: string[] = [];

      ilotEntries.forEach(([ilot, iEntries], idx) => {
        const lots = [...new Set(iEntries.map(e => e.lot))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
        boxContentLines.push(`ILOT N°${ilot}`);
        boxContentLines.push(lots.length > 1 ? `LOT N°${lots[0]} À LOT N°${lots[lots.length - 1]}` : `LOT N°${lots[0]}`);
        if (idx < ilotEntries.length - 1) boxContentLines.push("&&");
      });

      const boxWidth = 140;
      const boxX = (pw - boxWidth) / 2;
      const boxPaddingTop = 12;
      const boxPaddingBottom = 6;
      const maxBoxContentHeight = ph - yPos - 40;
      const maxLinesPerPage = Math.floor((maxBoxContentHeight - boxPaddingTop - boxPaddingBottom) / lineHeight);

      let lineIndex = 0;
      let isFirstBoxPage = true;

      while (lineIndex < boxContentLines.length) {
        const linesForThisPage = boxContentLines.slice(lineIndex, lineIndex + maxLinesPerPage);
        const boxHeight = linesForThisPage.length * lineHeight + boxPaddingTop + boxPaddingBottom;

        if (!isFirstBoxPage) {
          doc.addPage("a4", "portrait");
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

    const now = new Date();
    const monthNames = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(subRgb[0], subRgb[1], subRgb[2]);
    doc.text(`${monthNames[now.getMonth()]} ${now.getFullYear()}`, pw / 2, yPos, { align: "center" });

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
