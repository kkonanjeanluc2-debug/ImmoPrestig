import jsPDF from "jspdf";

export interface PDFAgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logo_url?: string | null;
  siret?: string | null;
}

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
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
};

/**
 * Adds a professional header with agency logo, info, and document title.
 * Matches the receipt/quittance style: navy band with white text.
 * Returns the Y position after the header.
 */
export const addPDFHeader = async (
  doc: jsPDF,
  agency: PDFAgencyInfo | null | undefined,
  title: string,
  subtitle?: string
): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = [26, 54, 93];

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, "F");

  let headerXOffset = 15;

  if (agency) {
    // Try to load logo
    if (agency.logo_url) {
      try {
        const logoBase64 = await loadImageAsBase64(agency.logo_url);
        if (logoBase64) {
          doc.addImage(logoBase64, "PNG", 15, 8, 20, 20);
          headerXOffset = 40;
        }
      } catch {}
    }

    // Agency name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(agency.name, headerXOffset, 15);

    // Contact info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    let contactY = 22;
    if (agency.phone) {
      doc.text(`Tél: ${agency.phone}`, headerXOffset, contactY);
      contactY += 5;
    }
    if (agency.email) {
      doc.text(agency.email, headerXOffset, contactY);
      contactY += 5;
    }
    const addressParts = [agency.address, agency.city, agency.country].filter(Boolean);
    if (addressParts.length) {
      const addressText = addressParts.join(", ");
      const maxAddrWidth = pageWidth / 2 - headerXOffset;
      const addrLines = doc.splitTextToSize(addressText, maxAddrWidth);
      doc.text(addrLines[0], headerXOffset, contactY);
    }
  }

  // Title on right (or centered if no agency)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, agency ? pageWidth - 15 : pageWidth / 2, 18, {
    align: agency ? "right" : "center",
  });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, agency ? pageWidth - 15 : pageWidth / 2, 28, {
      align: agency ? "right" : "center",
    });
  }

  // Reset text color
  doc.setTextColor(0, 0, 0);

  return 65; // Y position after header
};

/**
 * Adds a professional footer with agency name and generation date.
 */
export const addPDFFooter = (
  doc: jsPDF,
  agency: PDFAgencyInfo | null | undefined,
  footerText?: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lightGray: [number, number, number] = [245, 245, 245];

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...lightGray);
    doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128, 128, 128);

    const today = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const text = footerText
      ? `${agency?.name ? `${agency.name} - ` : ""}${footerText} - ${today}`
      : `${agency?.name ? `${agency.name} - ` : ""}Document généré le ${today}`;

    doc.text(text, pageWidth / 2, pageHeight - 12, { align: "center" });

    if (pageCount > 1) {
      doc.text(`Page ${i}/${pageCount}`, pageWidth - 15, pageHeight - 12, { align: "right" });
    }
  }
};
