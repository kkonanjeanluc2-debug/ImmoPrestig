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
  | "cafe"
  | "maison"
  | "brique"
  | "brique_industrielle"
  | "parpaing";

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
  { value: "maison", label: "Maison", emoji: "🏠", description: "Petite maison" },
  { value: "brique", label: "Brique", emoji: "🧱", description: "Motif de brique" },
  { value: "brique_industrielle", label: "Brique industrielle", emoji: "🏭", description: "Brique moderne, style industriel/loft" },
  { value: "parpaing", label: "Parpaing", emoji: "🔲", description: "Bloc de béton (parpaing) à 3 alvéoles" },
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
    case "maison":
      return { primary: [170, 60, 50], secondary: [110, 70, 40], accent: [245, 235, 215] };
    case "brique":
      return { primary: [178, 79, 53], secondary: [225, 215, 200], accent: [130, 55, 35] };
    case "brique_industrielle":
      return { primary: [95, 95, 98], secondary: [55, 55, 58], accent: [170, 170, 174] };
    case "parpaing":
      return { primary: [168, 168, 163], secondary: [110, 110, 105], accent: [75, 75, 72] };
    default:
      return { primary: base, secondary: base, accent: base };
  }
};

const setFill = (doc: jsPDF, color: [number, number, number]) =>
  doc.setFillColor(color[0], color[1], color[2]);
const setDraw = (doc: jsPDF, color: [number, number, number]) =>
  doc.setDrawColor(color[0], color[1], color[2]);

type Point = [number, number];

const shade = (color: [number, number, number], factor: number): [number, number, number] => [
  Math.max(0, Math.min(255, Math.round(color[0] * factor))),
  Math.max(0, Math.min(255, Math.round(color[1] * factor))),
  Math.max(0, Math.min(255, Math.round(color[2] * factor))),
];

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const addVec = (p: Point, v: Point, scale = 1): Point => [p[0] + v[0] * scale, p[1] + v[1] * scale];

// Fill an arbitrary convex polygon (fan-triangulated from its first vertex)
const fillPolygon = (doc: jsPDF, points: Point[], color: [number, number, number]) => {
  setFill(doc, color);
  for (let i = 1; i < points.length - 1; i++) {
    doc.triangle(
      points[0][0], points[0][1],
      points[i][0], points[i][1],
      points[i + 1][0], points[i + 1][1],
      "F",
    );
  }
};

const strokePolygon = (doc: jsPDF, points: Point[], color: [number, number, number], lineWidth: number) => {
  setDraw(doc, color);
  doc.setLineWidth(lineWidth);
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    doc.line(x1, y1, x2, y2);
  }
};

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
    case "maison": {
      // Walls
      setFill(doc, palette.accent);
      doc.rect(cx - size * 0.3, cy - size * 0.05, size * 0.6, size * 0.4, "F");
      // Roof
      setFill(doc, palette.primary);
      doc.triangle(
        cx - size * 0.38, cy - size * 0.05,
        cx + size * 0.38, cy - size * 0.05,
        cx, cy - size * 0.42,
        "F",
      );
      // Door
      setFill(doc, palette.secondary);
      doc.rect(cx - size * 0.08, cy + size * 0.13, size * 0.16, size * 0.22, "F");
      // Window
      doc.rect(cx + size * 0.13, cy + size * 0.02, size * 0.12, size * 0.12, "F");
      break;
    }
    case "brique": {
      // Small running-bond brick pattern (two rows, offset)
      setFill(doc, palette.primary);
      doc.rect(cx - size * 0.4, cy - size * 0.22, size * 0.38, size * 0.18, "F");
      doc.rect(cx + size * 0.02, cy - size * 0.22, size * 0.38, size * 0.18, "F");
      doc.rect(cx - size * 0.2, cy - size * 0.02, size * 0.38, size * 0.18, "F");
      // Mortar joints
      setDraw(doc, palette.secondary);
      doc.setLineWidth(0.35);
      doc.rect(cx - size * 0.4, cy - size * 0.22, size * 0.38, size * 0.18);
      doc.rect(cx + size * 0.02, cy - size * 0.22, size * 0.38, size * 0.18);
      doc.rect(cx - size * 0.2, cy - size * 0.02, size * 0.38, size * 0.18);
      break;
    }
    case "brique_industrielle": {
      // Modern loft look: grey stacked-bond blocks (aligned, not staggered) with thin steel-toned seams
      setFill(doc, palette.primary);
      doc.rect(cx - size * 0.35, cy - size * 0.22, size * 0.7, size * 0.2, "F");
      doc.rect(cx - size * 0.35, cy, size * 0.7, size * 0.2, "F");
      setDraw(doc, palette.secondary);
      doc.setLineWidth(0.3);
      doc.rect(cx - size * 0.35, cy - size * 0.22, size * 0.7, size * 0.2);
      doc.rect(cx - size * 0.35, cy, size * 0.7, size * 0.2);
      // Thin steel highlight seam
      setDraw(doc, palette.accent);
      doc.setLineWidth(0.2);
      doc.line(cx - size * 0.35, cy - size * 0.02, cx + size * 0.35, cy - size * 0.02);
      break;
    }
    case "parpaing": {
      // Isometric concrete block (parpaing), lying on its side, 3 hollow cells on the top
      // face — same pose as a real breeze block photo (front face + receding top + end face).
      const depth: Point = [size * 0.24, -size * 0.17];

      const fbl: Point = [cx - size * 0.36, cy + size * 0.26];
      const fbr: Point = [cx + size * 0.14, cy + size * 0.26];
      const ftr: Point = [cx + size * 0.14, cy - size * 0.08];
      const ftl: Point = [cx - size * 0.36, cy - size * 0.08];

      const ttl = addVec(ftl, depth);
      const ttr = addVec(ftr, depth);
      const sbr = addVec(fbr, depth);

      // End face (right side, in shadow — darkest tone)
      fillPolygon(doc, [fbr, ftr, ttr, sbr], shade(palette.primary, 0.62));
      // Top face (catches the most light — lightest tone)
      fillPolygon(doc, [ftl, ftr, ttr, ttl], shade(palette.primary, 1.18));
      // Front face (base tone)
      fillPolygon(doc, [fbl, fbr, ftr, ftl], palette.primary);

      strokePolygon(doc, [fbl, fbr, ftr, ftl], palette.secondary, 0.22);
      strokePolygon(doc, [ftl, ftr, ttr, ttl], palette.secondary, 0.18);
      strokePolygon(doc, [fbr, ftr, ttr, sbr], palette.secondary, 0.18);

      // 3 hollow cells recessed into the top face
      const cellColor = shade(palette.accent, 1);
      const margin = 0.08;
      const gap = 0.06;
      const cellW = (1 - margin * 2 - gap * 2) / 3;
      for (let i = 0; i < 3; i++) {
        const t0 = margin + i * (cellW + gap);
        const t1 = t0 + cellW;
        const p0 = addVec(lerp(ftl, ftr, t0), depth, 0.12);
        const p1 = addVec(lerp(ftl, ftr, t1), depth, 0.12);
        const p2 = addVec(lerp(ftl, ftr, t1), depth, 0.85);
        const p3 = addVec(lerp(ftl, ftr, t0), depth, 0.85);
        fillPolygon(doc, [p0, p1, p2, p3], cellColor);
      }

      // Subtle concrete-grain speckles on the front face
      setFill(doc, shade(palette.secondary, 0.9));
      const speckles: Point[] = [[0.18, 0.3], [0.35, 0.55], [0.55, 0.2], [0.72, 0.6], [0.85, 0.35]];
      for (const [fx, fy] of speckles) {
        const p = lerp(lerp(fbl, fbr, fx), lerp(ftl, ftr, fx), 1 - fy);
        doc.circle(p[0], p[1], size * 0.014, "F");
      }
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
