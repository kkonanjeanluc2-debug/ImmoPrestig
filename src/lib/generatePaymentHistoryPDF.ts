import jsPDF from "jspdf";
import { addPDFHeader, addPDFFooter, PDFAgencyInfo } from "./pdfHeader";
import { formatAmountWithCurrency } from "./pdfFormat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PaymentRecord {
  due_date: string;
  amount: number;
  status: string;
  paid_date?: string | null;
  method?: string | null;
  paid_amount?: number | null;
  payment_months?: string[] | null;
}

interface TenantInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
  property_title?: string;
  property_address?: string;
  unit_number?: string | null;
  contract_start?: string | null;
  contract_rent?: number | null;
}

const statusLabels: Record<string, string> = {
  paid: "Paye",
  pending: "En attente",
  late: "En retard",
  upcoming: "A venir",
};

export const generatePaymentHistoryPDF = async (
  payments: PaymentRecord[],
  tenant: TenantInfo,
  agency: PDFAgencyInfo | null | undefined
) => {
  const doc = new jsPDF("landscape", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const bottomLimit = pageHeight - 30;

  let y = await addPDFHeader(doc, agency, "Historique des paiements", tenant.name);

  // Tenant info block
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);

  const col1 = margin + 5;
  const col2 = margin + 90;
  const col3 = margin + 180;

  doc.text("Locataire:", col1, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(tenant.name, col1 + 25, y + 7);

  if (tenant.property_title) {
    doc.setFont("helvetica", "bold");
    doc.text("Bien:", col2, y + 7);
    doc.setFont("helvetica", "normal");
    doc.text(tenant.property_title, col2 + 15, y + 7);
  }

  if (tenant.contract_rent) {
    doc.setFont("helvetica", "bold");
    doc.text("Loyer:", col3, y + 7);
    doc.setFont("helvetica", "normal");
    doc.text(formatAmountWithCurrency(tenant.contract_rent), col3 + 17, y + 7);
  }

  if (tenant.phone) {
    doc.setFont("helvetica", "bold");
    doc.text("Tel:", col1, y + 14);
    doc.setFont("helvetica", "normal");
    doc.text(tenant.phone, col1 + 25, y + 14);
  }

  if (tenant.unit_number) {
    doc.setFont("helvetica", "bold");
    doc.text("Porte:", col2, y + 14);
    doc.setFont("helvetica", "normal");
    doc.text(tenant.unit_number, col2 + 15, y + 14);
  }

  if (tenant.contract_start) {
    doc.setFont("helvetica", "bold");
    doc.text("Debut contrat:", col3, y + 14);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(tenant.contract_start), "dd/MM/yyyy"), col3 + 32, y + 14);
  }

  y += 28;

  // Sort payments by due_date descending
  const sorted = [...payments].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  // Table header
  const colWidths = [35, 40, 35, 35, 35, 55, 32];
  const headers = ["Echeance", "Montant", "Statut", "Date paiement", "Montant paye", "Mois concernes", "Mode"];
  const colStarts: number[] = [];
  let cx = margin;
  for (const w of colWidths) {
    colStarts.push(cx);
    cx += w;
  }

  const drawTableHeader = () => {
    doc.setFillColor(26, 54, 93);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], colStarts[i] + 2, y + 5.5);
    }
    y += 10;
    doc.setTextColor(0, 0, 0);
  };

  drawTableHeader();

  // Summary stats
  const totalPaid = sorted.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.paid_amount || p.amount), 0);
  const totalPending = sorted.filter(p => p.status === "pending" || p.status === "late").reduce((s, p) => s + Number(p.amount) - Number(p.paid_amount || 0), 0);

  // Table rows
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  for (let i = 0; i < sorted.length; i++) {
    if (y + 8 > bottomLimit) {
      addPDFFooter(doc, agency);
      doc.addPage();
      y = 20;
      drawTableHeader();
    }

    const p = sorted[i];
    const isEven = i % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 249, 252);
      doc.rect(margin, y - 1, pageWidth - margin * 2, 8, "F");
    }

    // Status color
    if (p.status === "paid") doc.setTextColor(22, 163, 74);
    else if (p.status === "late") doc.setTextColor(220, 38, 38);
    else if (p.status === "pending") doc.setTextColor(217, 119, 6);
    else doc.setTextColor(0, 0, 0);

    const row = [
      format(new Date(p.due_date), "dd MMM yyyy", { locale: fr }),
      formatAmountWithCurrency(Number(p.amount)),
      statusLabels[p.status] || p.status,
      p.paid_date ? format(new Date(p.paid_date), "dd/MM/yyyy") : "-",
      p.paid_amount ? formatAmountWithCurrency(Number(p.paid_amount)) : p.status === "paid" ? formatAmountWithCurrency(Number(p.amount)) : "-",
      Array.isArray(p.payment_months) ? p.payment_months.join(", ").substring(0, 30) : "-",
      p.method || "-",
    ];

    // Reset color for non-status columns
    for (let j = 0; j < row.length; j++) {
      if (j === 2) {
        // Keep status color already set
      } else {
        doc.setTextColor(50, 50, 50);
      }
      if (j === 2) {
        if (p.status === "paid") doc.setTextColor(22, 163, 74);
        else if (p.status === "late") doc.setTextColor(220, 38, 38);
        else if (p.status === "pending") doc.setTextColor(217, 119, 6);
        else doc.setTextColor(50, 50, 50);
      }
      doc.text(row[j], colStarts[j] + 2, y + 5);
    }

    y += 8;
  }

  // Summary
  y += 5;
  if (y + 20 > bottomLimit) {
    addPDFFooter(doc, agency);
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, 80, 12, 2, 2, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(`Total encaisse: ${formatAmountWithCurrency(totalPaid)}`, margin + 4, y + 8);

  if (totalPending > 0) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin + 85, y, 80, 12, 2, 2, "F");
    doc.setTextColor(220, 38, 38);
    doc.text(`Reste a payer: ${formatAmountWithCurrency(totalPending)}`, margin + 89, y + 8);
  }

  doc.setTextColor(0, 0, 0);

  addPDFFooter(doc, agency, "Historique des paiements");
  doc.save(`historique-paiements-${tenant.name.replace(/\s+/g, "-")}.pdf`);
};
