import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatAmountForPDF } from "@/lib/pdfFormat";
import type { ProformaInvoice } from "@/hooks/useProformaInvoices";

function formatCFA(amount: number) {
  return `${formatAmountForPDF(amount)} F CFA`;
}

export function generateProformaPDF(invoice: ProformaInvoice, agency?: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const primaryColor = agency?.pdf_primary_color
    ? hexToRgb(agency.pdf_primary_color)
    : { r: 30, g: 58, b: 95 };

  const isProforma = invoice.invoice_type === "proforma";

  // Header
  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(isProforma ? "FACTURE PROFORMA" : "FACTURE", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`N° ${invoice.invoice_number}`, pageWidth / 2, 32, { align: "center" });

  y = 50;

  if (isProforma) {
    doc.setFontSize(9);
    doc.setTextColor(200, 60, 60);
    doc.setFont("helvetica", "bolditalic");
    doc.text("Proforma - ne vaut pas facture", pageWidth / 2, y, { align: "center" });
    y += 10;
  }

  // Agency info (left) + Client info (right)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Left: Agency with logo
  if (agency) {
    let agencyTextStartX = margin;
    
    // Add agency logo if available
    if (agency.logo_url) {
      try {
        const logoSize = 18;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = agency.logo_url;
        doc.addImage(img, "PNG", margin, y - 3, logoSize, logoSize);
        agencyTextStartX = margin + logoSize + 4;
      } catch (e) {
        console.warn("Could not load agency logo:", e);
      }
    }
    
    doc.setFont("helvetica", "bold");
    doc.text(agency.name || "Agence", agencyTextStartX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (agency.address) doc.text(agency.address, agencyTextStartX, y + 5);
    if (agency.phone) doc.text(`Tél: ${agency.phone}`, agencyTextStartX, y + 10);
    if (agency.email) doc.text(agency.email, agencyTextStartX, y + 15);
    if (agency.siret) doc.text(`SIRET: ${agency.siret}`, agencyTextStartX, y + 20);
  }

  // Right: Client
  const rightX = pageWidth / 2 + 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT", rightX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(invoice.tenant_name, rightX, y + 6);
  let clientY = y + 12;
  if (invoice.tenant_phone) {
    doc.text(`Tél: ${invoice.tenant_phone}`, rightX, clientY);
    clientY += 5;
  }
  if (invoice.tenant_email) {
    doc.text(invoice.tenant_email, rightX, clientY);
    clientY += 5;
  }
  if (invoice.property_name) {
    doc.text(`Bien: ${invoice.property_name}${invoice.unit_number ? ` (${invoice.unit_number})` : ""}`, rightX, clientY);
  }

  y += 30;

  // Date & due date
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${format(new Date(invoice.created_at), "dd MMMM yyyy", { locale: fr })}`, margin, y);
  if (invoice.due_date) {
    doc.text(`Échéance: ${format(new Date(invoice.due_date), "dd MMMM yyyy", { locale: fr })}`, pageWidth - margin, y, { align: "right" });
  }
  y += 8;

  if (invoice.description) {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "italic");
    doc.text(`Objet: ${invoice.description}`, margin, y);
    y += 8;
  }

  y += 5;

  // Table header
  const colX = {
    desc: margin,
    qty: pageWidth - margin - 80,
    pu: pageWidth - margin - 50,
    total: pageWidth - margin,
  };

  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Description", colX.desc + 3, y + 5.5);
  doc.text("Qté", colX.qty, y + 5.5, { align: "right" });
  doc.text("P.U.", colX.pu, y + 5.5, { align: "right" });
  doc.text("Total", colX.total, y + 5.5, { align: "right" });
  y += 10;

  // Items
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  invoice.items.forEach((item, i) => {
    const bgColor = i % 2 === 0 ? 250 : 240;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(margin, y - 1, pageWidth - 2 * margin, 7, "F");

    doc.text(item.description, colX.desc + 3, y + 4);
    doc.text(item.quantity.toString(), colX.qty, y + 4, { align: "right" });
    doc.text(formatCFA(item.unit_price), colX.pu, y + 4, { align: "right" });
    doc.text(formatCFA(item.total), colX.total, y + 4, { align: "right" });
    y += 8;
  });

  y += 5;

  // Totals
  const totalX = pageWidth - margin;
  const labelX = pageWidth - margin - 70;

  doc.setDrawColor(200, 200, 200);
  doc.line(labelX - 10, y, totalX, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total HT", labelX, y);
  doc.text(formatCFA(invoice.subtotal), totalX, y, { align: "right" });
  y += 6;

  if (invoice.tax_rate && invoice.tax_rate > 0) {
    doc.text(`TVA (${invoice.tax_rate}%)`, labelX, y);
    doc.text(formatCFA(invoice.tax_amount || 0), totalX, y, { align: "right" });
    y += 6;
  }

  doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.rect(labelX - 10, y - 1, totalX - labelX + 10, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL TTC", labelX, y + 6);
  doc.text(formatCFA(invoice.total_amount), totalX, y + 6, { align: "right" });
  y += 16;

  // Notes
  if (invoice.notes) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const noteLines = doc.splitTextToSize(`Notes: ${invoice.notes}`, pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 5;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 245, 245);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    isProforma
      ? "Ce document est une proposition commerciale et ne constitue pas une facture."
      : "Ce document constitue une facture officielle.",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  const fileName = `${invoice.invoice_number}.pdf`;
  doc.save(fileName);
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 30, g: 58, b: 95 };
}
