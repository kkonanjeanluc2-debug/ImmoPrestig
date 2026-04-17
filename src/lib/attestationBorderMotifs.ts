import type jsPDF from "jspdf";

export type BorderMotif =
  | "palmier"
  | "avocat"
  | "tomate"
  | "cacao"
  | "ananas"
  | "hibiscus"
  | "orange"
  | "feuille"
  | "banane"
  | "cafe";

export interface BorderMotifOption {
  value: BorderMotif;
  label: string;
  emoji: string;
  description: string;
}

export const BORDER_MOTIF_OPTIONS: BorderMotifOption[] = [
  { value: "palmier", label: "Palmier", emoji: "🌴", description: "Palmier tropical" },
  { value: "avocat", label: "Avocat", emoji: "🥑", description: "Fruit avocat" },
  { value: "tomate", label: "Tomate", emoji: "🍅", description: "Tomate rouge" },
  { value: "cacao", label: "Cacao", emoji: "🍫", description: "Cabosse de cacao" },
  { value: "ananas", label: "Ananas", emoji: "🍍", description: "Ananas doré" },
  { value: "hibiscus", label: "Hibiscus", emoji: "🌺", description: "Fleur d'hibiscus" },
  { value: "orange", label: "Orange", emoji: "🍊", description: "Orange agrume" },
  { value: "feuille", label: "Feuille", emoji: "🌿", description: "Feuille verte" },
  { value: "banane", label: "Banane", emoji: "🍌", description: "Banane jaune" },
  { value: "cafe", label: "Café", emoji: "☕", description: "Grain de café" },
];

const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return [
    Number.isFinite(r) ? r : 0,
    Number.isFinite(g) ? g : 0,
    Number.isFinite(b) ? b : 0,
  ];
};

interface Palette {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
}

const getMotifPalette = (motif: BorderMotif, baseColor: string): Palette => {
  const base = hexToRgb(baseColor);
  switch (motif) {
    case "palmier":
      return { primary: [34, 120, 50], secondary: [120, 80, 40], accent: [60, 160, 70] };
    case "avocat":
      return { primary: [80, 130, 50], secondary: [40, 90, 30], accent: [120, 70, 40] };
    case "tomate":
      return { primary: [220, 60, 50], secondary: [40, 130, 50], accent: [180, 40, 30] };
    case "cacao":
      return { primary: [140, 80, 40], secondary: [90, 50, 30], accent: [200, 150, 90] };
    case "ananas":
      return { primary: [230, 180, 50], secondary: [60, 130, 50], accent: [180, 130, 30] };
    case "hibiscus":
      return { primary: [220, 70, 110], secondary: [50, 120, 60], accent: [240, 200, 60] };
    case "orange":
      return { primary: [240, 140, 40], secondary: [60, 130, 50], accent: [200, 100, 30] };
    case "feuille":
      return { primary: [60, 140, 70], secondary: [40, 100, 50], accent: [90, 170, 90] };
    case "banane":
      return { primary: [240, 210, 60], secondary: [180, 150, 30], accent: [120, 90, 40] };
    case "cafe":
      return { primary: [110, 60, 30], secondary: [70, 40, 20], accent: [200, 160, 110] };
    default:
      return { primary: base, secondary: base, accent: base };
  }
};

const setFill = (doc: jsPDF, color: [number, number, number]) =>
  doc.setFillColor(color[0], color[1], color[2]);
const setDraw = (doc: jsPDF, color: [number, number, number]) =>
  doc.setDrawColor(color[0], color[1], color[2]);

/**
 * Draw a single motif centered at (cx, cy) with a given size (mm).
 * All motifs are designed to fit within a `size x size` square.
 */
export const drawMotif = (
  doc: jsPDF,
  motif: BorderMotif,
  cx: number,
  cy: number,
  size: number,
  baseColor: string,
) => {
  const palette = getMotifPalette(motif, baseColor);
  const r = size / 2;

  switch (motif) {
    case "palmier": {
      // Trunk
      setFill(doc, palette.secondary);
      doc.rect(cx - size * 0.06, cy - size * 0.05, size * 0.12, size * 0.45, "F");
      // Crown leaves (4 ellipses)
      setFill(doc, palette.primary);
      doc.ellipse(cx - size * 0.25, cy - size * 0.1, size * 0.28, size * 0.1, "F");
      doc.ellipse(cx + size * 0.25, cy - size * 0.1, size * 0.28, size * 0.1, "F");
      doc.ellipse(cx - size * 0.15, cy - size * 0.3, size * 0.18, size * 0.12, "F");
      doc.ellipse(cx + size * 0.15, cy - size * 0.3, size * 0.18, size * 0.12, "F");
      setFill(doc, palette.accent);
      doc.circle(cx, cy - size * 0.18, size * 0.08, "F");
      break;
    }
    case "avocat": {
      // Body (pear shape via two ellipses)
      setFill(doc, palette.primary);
      doc.ellipse(cx, cy + size * 0.15, size * 0.28, size * 0.32, "F");
      doc.ellipse(cx, cy - size * 0.05, size * 0.22, size * 0.22, "F");
      // Pit
      setFill(doc, palette.secondary);
      doc.circle(cx, cy + size * 0.15, size * 0.1, "F");
      break;
    }
    case "tomate": {
      // Body
      setFill(doc, palette.primary);
      doc.circle(cx, cy + size * 0.05, r * 0.85, "F");
      // Stem leaves
      setFill(doc, palette.secondary);
      doc.triangle(
        cx - size * 0.18, cy - size * 0.25,
        cx + size * 0.18, cy - size * 0.25,
        cx, cy - size * 0.05,
        "F",
      );
      doc.circle(cx, cy - size * 0.22, size * 0.05, "F");
      // Highlight
      setFill(doc, palette.accent);
      doc.circle(cx - size * 0.15, cy - size * 0.05, size * 0.05, "F");
      break;
    }
    case "cacao": {
      // Cabosse (pod) - vertical ellipse
      setFill(doc, palette.primary);
      doc.ellipse(cx, cy, size * 0.22, size * 0.4, "F");
      // Ridges
      setDraw(doc, palette.secondary);
      doc.setLineWidth(0.4);
      doc.line(cx, cy - size * 0.35, cx, cy + size * 0.35);
      doc.line(cx - size * 0.1, cy - size * 0.3, cx - size * 0.1, cy + size * 0.3);
      doc.line(cx + size * 0.1, cy - size * 0.3, cx + size * 0.1, cy + size * 0.3);
      // Stem
      setFill(doc, palette.secondary);
      doc.rect(cx - size * 0.03, cy - size * 0.45, size * 0.06, size * 0.08, "F");
      break;
    }
    case "ananas": {
      // Body
      setFill(doc, palette.primary);
      doc.ellipse(cx, cy + size * 0.1, size * 0.25, size * 0.3, "F");
      // Crosshatch lines
      setDraw(doc, palette.accent);
      doc.setLineWidth(0.3);
      for (let i = -2; i <= 2; i++) {
        doc.line(cx - size * 0.25, cy + i * size * 0.08, cx + size * 0.25, cy + i * size * 0.08);
      }
      // Leaves
      setFill(doc, palette.secondary);
      doc.triangle(
        cx - size * 0.18, cy - size * 0.15,
        cx, cy - size * 0.45,
        cx, cy - size * 0.15,
        "F",
      );
      doc.triangle(
        cx + size * 0.18, cy - size * 0.15,
        cx, cy - size * 0.45,
        cx, cy - size * 0.15,
        "F",
      );
      doc.triangle(
        cx - size * 0.1, cy - size * 0.18,
        cx - size * 0.05, cy - size * 0.4,
        cx + size * 0.05, cy - size * 0.18,
        "F",
      );
      break;
    }
    case "hibiscus": {
      // 5 petals around center
      setFill(doc, palette.primary);
      const petalR = size * 0.18;
      const petalDist = size * 0.2;
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = cx + Math.cos(angle) * petalDist;
        const py = cy + Math.sin(angle) * petalDist;
        doc.circle(px, py, petalR, "F");
      }
      // Center
      setFill(doc, palette.accent);
      doc.circle(cx, cy, size * 0.1, "F");
      break;
    }
    case "orange": {
      // Body
      setFill(doc, palette.primary);
      doc.circle(cx, cy + size * 0.05, r * 0.8, "F");
      // Texture dots
      setFill(doc, palette.accent);
      doc.circle(cx - size * 0.15, cy - size * 0.05, size * 0.03, "F");
      doc.circle(cx + size * 0.1, cy + size * 0.1, size * 0.03, "F");
      doc.circle(cx + size * 0.05, cy - size * 0.15, size * 0.03, "F");
      // Leaf
      setFill(doc, palette.secondary);
      doc.ellipse(cx + size * 0.1, cy - size * 0.3, size * 0.12, size * 0.06, "F");
      break;
    }
    case "feuille": {
      // Leaf shape - two arcs forming an oval pointed at both ends
      setFill(doc, palette.primary);
      doc.ellipse(cx, cy, size * 0.18, size * 0.38, "F");
      // Tip
      setFill(doc, palette.primary);
      doc.triangle(
        cx - size * 0.05, cy + size * 0.35,
        cx + size * 0.05, cy + size * 0.35,
        cx, cy + size * 0.45,
        "F",
      );
      // Vein
      setDraw(doc, palette.secondary);
      doc.setLineWidth(0.4);
      doc.line(cx, cy - size * 0.35, cx, cy + size * 0.4);
      // Side veins
      doc.setLineWidth(0.2);
      for (let i = -2; i <= 2; i++) {
        const y = cy + i * size * 0.12;
        doc.line(cx, y, cx - size * 0.15, y - size * 0.05);
        doc.line(cx, y, cx + size * 0.15, y - size * 0.05);
      }
      break;
    }
    case "banane": {
      // Curved banana - stack of two thin ellipses rotated approximation
      setFill(doc, palette.primary);
      doc.ellipse(cx, cy, size * 0.35, size * 0.12, "F");
      setFill(doc, palette.secondary);
      doc.ellipse(cx - size * 0.32, cy - size * 0.02, size * 0.04, size * 0.05, "F");
      doc.ellipse(cx + size * 0.32, cy - size * 0.02, size * 0.04, size * 0.05, "F");
      break;
    }
    case "cafe": {
      // Coffee bean
      setFill(doc, palette.primary);
      doc.ellipse(cx, cy, size * 0.25, size * 0.35, "F");
      // Center groove
      setDraw(doc, palette.secondary);
      doc.setLineWidth(0.6);
      doc.line(cx, cy - size * 0.3, cx, cy + size * 0.3);
      break;
    }
  }

  // Reset
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
};

/**
 * Draw a repeating motif border around the page.
 */
export const drawMotifBorder = (
  doc: jsPDF,
  motif: BorderMotif,
  pageWidth: number,
  pageHeight: number,
  baseColor: string,
) => {
  const motifSize = 7; // mm per motif
  const spacing = 9; // distance between motif centers
  const margin = 6; // distance from page edge to motif center

  // Top row
  for (let x = margin; x <= pageWidth - margin; x += spacing) {
    drawMotif(doc, motif, x, margin, motifSize, baseColor);
  }
  // Bottom row
  for (let x = margin; x <= pageWidth - margin; x += spacing) {
    drawMotif(doc, motif, x, pageHeight - margin, motifSize, baseColor);
  }
  // Left column (skip corners)
  for (let y = margin + spacing; y <= pageHeight - margin - spacing; y += spacing) {
    drawMotif(doc, motif, margin, y, motifSize, baseColor);
  }
  // Right column
  for (let y = margin + spacing; y <= pageHeight - margin - spacing; y += spacing) {
    drawMotif(doc, motif, pageWidth - margin, y, motifSize, baseColor);
  }
};

export const isMotifBorderStyle = (style: string | null | undefined): style is BorderMotif => {
  if (!style) return false;
  return BORDER_MOTIF_OPTIONS.some((opt) => opt.value === style);
};
