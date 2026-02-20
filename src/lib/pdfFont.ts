import jsPDF from "jspdf";

let fontsLoaded = false;
let regularFontBase64: string | null = null;
let boldFontBase64: string | null = null;
let italicFontBase64: string | null = null;

const loadFontAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const loadFonts = async () => {
  if (fontsLoaded) return;
  
  const [regular, bold, italic] = await Promise.all([
    loadFontAsBase64("/fonts/Roboto-Regular.ttf"),
    loadFontAsBase64("/fonts/Roboto-Bold.ttf"),
    loadFontAsBase64("/fonts/Roboto-Italic.ttf"),
  ]);
  
  regularFontBase64 = regular;
  boldFontBase64 = bold;
  italicFontBase64 = italic;
  fontsLoaded = true;
};

/**
 * Registers Unicode-capable Roboto fonts as "helvetica" overrides in the given jsPDF doc.
 * This allows all existing setFont("helvetica", ...) calls to use Roboto with accent support.
 */
const registerFonts = (doc: jsPDF) => {
  if (regularFontBase64) {
    doc.addFileToVFS("Roboto-Regular.ttf", regularFontBase64);
    doc.addFont("Roboto-Regular.ttf", "helvetica", "normal");
  }
  if (boldFontBase64) {
    doc.addFileToVFS("Roboto-Bold.ttf", boldFontBase64);
    doc.addFont("Roboto-Bold.ttf", "helvetica", "bold");
  }
  if (italicFontBase64) {
    doc.addFileToVFS("Roboto-Italic.ttf", italicFontBase64);
    doc.addFont("Roboto-Italic.ttf", "helvetica", "italic");
  }
  doc.setFont("helvetica", "normal");
};

/**
 * Creates a jsPDF instance with Unicode font support (accents, special characters).
 * Overrides the default helvetica with Roboto so all existing code works unchanged.
 */
export const createPDFDocument = async (): Promise<jsPDF> => {
  await loadFonts();
  const doc = new jsPDF();
  registerFonts(doc);
  return doc;
};

/** @deprecated Use createPDFDocument() instead */
export const PDF_FONT = "helvetica";
