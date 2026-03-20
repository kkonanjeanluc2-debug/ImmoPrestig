import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountForPDF, formatAmountWithCurrency } from "@/lib/pdfFormat";

interface TenantPaymentRow {
  tenantName: string;
  unitNumber?: string;
  rentAmount: number;
  paidAmount: number;
  status: "paid" | "pending" | "late";
  displayStatus?: string;
  paidDate: string | null;
}

interface InterventionRow {
  title: string;
  type: string;
  cost: number;
  status: string;
}

interface AdvancePaymentRow {
  tenantName: string;
  unitNumber?: string;
  monthsCovered: string[];
  amount: number;
}

interface LatePaymentRow {
  tenantName: string;
  unitNumber?: string;
  dueMonth: string;
  rentAmount: number;
  paidAmount: number;
  status: "paid" | "partial";
}

interface AgencyInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string | null;
}

interface PropertyMonthlyReportData {
  propertyTitle: string;
  propertyAddress: string;
  propertyType: string;
  ownerName?: string;
  period: string;
  agency?: AgencyInfo | null;
  tenantPayments: TenantPaymentRow[];
  interventions: InterventionRow[];
  advancePayments?: AdvancePaymentRow[];
  latePayments?: LatePaymentRow[];
  commissionPercentage: number;
  managementTypeName?: string;
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

const getStatusLabel = (status: "paid" | "pending" | "late"): string => {
  const labels: Record<string, string> = { paid: "Paye", pending: "En attente", late: "En retard" };
  return labels[status] || status;
};

const getInterventionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    reparation: "Reparation", maintenance: "Maintenance", procedure: "Procedure",
    renovation: "Renovation", autre: "Autre",
  };
  return labels[type] || type;
};

export const generatePropertyMonthlyReport = async (data: PropertyMonthlyReportData): Promise<void> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor: [number, number, number] = [26, 54, 93];
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];
  const successColor: [number, number, number] = [34, 197, 94];
  const warningColor: [number, number, number] = [234, 179, 8];
  const dangerColor: [number, number, number] = [239, 68, 68];

  const drawFooter = () => {
    doc.setFillColor(...primaryColor);
    doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    doc.text(`Document genere le ${today}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  };

  let yPos = 0;

  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - 30) {
      drawFooter();
      doc.addPage();
      yPos = 20;
    }
  };

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");

  let headerXOffset = 15;
  if (data.agency?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(data.agency.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 15, 8, 18, 18);
        headerXOffset = 38;
      }
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.agency?.name || "Agence", headerXOffset, 16);

  if (data.agency) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    let contactY = 22;
    if (data.agency.phone) { doc.text(`Tel: ${data.agency.phone}`, headerXOffset, contactY); contactY += 4; }
    if (data.agency.email) { doc.text(data.agency.email, headerXOffset, contactY); }
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("POINT MENSUEL", pageWidth - 15, 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.period, pageWidth - 15, 26, { align: "right" });

  yPos = 60;

  // Property info box
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 28, 2, 2, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BIEN IMMOBILIER", 20, yPos + 7);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.propertyTitle, 20, yPos + 15);
  doc.setFontSize(9);
  doc.text(data.propertyAddress, 20, yPos + 22);
  if (data.ownerName) {
    doc.text(`Proprietaire: ${data.ownerName}`, pageWidth - 20, yPos + 15, { align: "right" });
  }

  yPos += 38;

  // Tenant payments table
  checkPageBreak(30);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL DES LOYERS", 15, yPos);
  yPos += 8;

  doc.setFillColor(...primaryColor);
  doc.rect(15, yPos, pageWidth - 30, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Locataire", 18, yPos + 5.5);
  doc.text("Porte", 80, yPos + 5.5);
  doc.text("Loyer", 115, yPos + 5.5);
  doc.text("Paye", 140, yPos + 5.5);
  doc.text("Statut", 170, yPos + 5.5);
  yPos += 8;

  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");

  let totalRent = 0;
  let totalPaid = 0;

  if (data.tenantPayments.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setFontSize(9);
    doc.text("Aucun paiement enregistre pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    data.tenantPayments.forEach((row, index) => {
      checkPageBreak(9);
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(15, yPos, pageWidth - 30, 9, "F");
      }
      doc.setFontSize(8);
      const tenantName = row.tenantName.length > 22 ? row.tenantName.substring(0, 20) + "..." : row.tenantName;
      doc.text(tenantName, 18, yPos + 6);
      doc.text(row.unitNumber || "-", 80, yPos + 6);
      doc.text(formatAmountForPDF(row.rentAmount), 115, yPos + 6);
      doc.text(formatAmountForPDF(row.paidAmount), 140, yPos + 6);

      const statusLabel = getStatusLabel(row.status);
      if (row.status === "paid") doc.setTextColor(...successColor);
      else if (row.status === "pending") doc.setTextColor(...warningColor);
      else doc.setTextColor(...dangerColor);
      doc.text(statusLabel, 170, yPos + 6);
      doc.setTextColor(...textColor);

      totalRent += row.rentAmount;
      totalPaid += row.paidAmount;
      yPos += 9;
    });
  }

  // Subtotal
  doc.setFillColor(...primaryColor);
  doc.rect(15, yPos, pageWidth - 30, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL LOYERS", 18, yPos + 6);
  doc.text(formatAmountForPDF(totalRent), 115, yPos + 6);
  doc.text(formatAmountForPDF(totalPaid), 140, yPos + 6);
  yPos += 18;

  // Advance payments section
  const advancePayments = data.advancePayments || [];
  checkPageBreak(30);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("MOIS D'AVANCE", 15, yPos);
  yPos += 8;

  let totalAdvance = 0;

  if (advancePayments.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Aucun paiement d'avance pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Locataire", 18, yPos + 5.5);
    doc.text("Porte", 65, yPos + 5.5);
    doc.text("Mois couverts", 95, yPos + 5.5);
    doc.text("Montant", 165, yPos + 5.5);
    yPos += 8;

    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");

    advancePayments.forEach((row, index) => {
      checkPageBreak(9);
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(15, yPos, pageWidth - 30, 9, "F");
      }
      doc.setFontSize(8);
      const tenantName = row.tenantName.length > 18 ? row.tenantName.substring(0, 16) + "..." : row.tenantName;
      const months = row.monthsCovered.join(", ");
      const monthsDisplay = months.length > 30 ? months.substring(0, 28) + "..." : months;

      doc.text(tenantName, 18, yPos + 6);
      doc.text(row.unitNumber || "-", 65, yPos + 6);
      doc.text(monthsDisplay, 95, yPos + 6);
      doc.setTextColor(...successColor);
      doc.text(formatAmountForPDF(row.amount), 165, yPos + 6);
      doc.setTextColor(...textColor);

      totalAdvance += row.amount;
      yPos += 9;
    });

    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AVANCES", 18, yPos + 6);
    doc.text(formatAmountForPDF(totalAdvance), 165, yPos + 6);
    yPos += 9;
  }

  yPos += 10;

  // Late payments section
  const latePayments = data.latePayments || [];
  checkPageBreak(30);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL MOIS EN RETARD", 15, yPos);
  yPos += 8;

  let totalLateCollected = 0;

  if (latePayments.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Aucun encaissement de mois en retard pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Locataire", 18, yPos + 5.5);
    doc.text("Porte", 60, yPos + 5.5);
    doc.text("Mois du", 90, yPos + 5.5);
    doc.text("Loyer", 130, yPos + 5.5);
    doc.text("Encaisse", 165, yPos + 5.5);
    yPos += 8;

    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");

    latePayments.forEach((row, index) => {
      checkPageBreak(9);
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(15, yPos, pageWidth - 30, 9, "F");
      }
      doc.setFontSize(8);
      const tenantName = row.tenantName.length > 18 ? row.tenantName.substring(0, 16) + "..." : row.tenantName;

      doc.text(tenantName, 18, yPos + 6);
      doc.text(row.unitNumber || "-", 60, yPos + 6);
      doc.text(row.dueMonth, 90, yPos + 6);
      doc.text(formatAmountForPDF(row.rentAmount), 130, yPos + 6);

      if (row.status === "partial") {
        doc.setTextColor(...warningColor);
      } else {
        doc.setTextColor(...successColor);
      }
      doc.text(formatAmountForPDF(row.paidAmount), 165, yPos + 6);
      doc.setTextColor(...textColor);

      totalLateCollected += row.paidAmount;
      yPos += 9;
    });

    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL RETARDS ENCAISSES", 18, yPos + 6);
    doc.text(formatAmountForPDF(totalLateCollected), 165, yPos + 6);
    yPos += 9;
  }

  yPos += 10;

  // Interventions
  checkPageBreak(30);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("INTERVENTIONS / REPARATIONS", 15, yPos);
  yPos += 8;

  let totalInterventionsCost = 0;

  if (data.interventions.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Aucune intervention pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Intervention", 18, yPos + 5.5);
    doc.text("Type", 110, yPos + 5.5);
    doc.text("Cout", 165, yPos + 5.5);
    yPos += 8;

    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");

    data.interventions.forEach((row, index) => {
      checkPageBreak(9);
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(15, yPos, pageWidth - 30, 9, "F");
      }
      doc.setFontSize(8);
      const title = row.title.length > 40 ? row.title.substring(0, 38) + "..." : row.title;
      doc.text(title, 18, yPos + 6);
      doc.text(getInterventionTypeLabel(row.type), 110, yPos + 6);
      doc.text(formatAmountForPDF(row.cost || 0), 165, yPos + 6);
      totalInterventionsCost += row.cost || 0;
      yPos += 9;
    });

    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL INTERVENTIONS", 18, yPos + 6);
    doc.text(formatAmountForPDF(totalInterventionsCost), 165, yPos + 6);
    yPos += 9;
  }

  yPos += 15;

  // Summary
  checkPageBreak(75);
  const commissionAmount = Math.round((totalPaid * data.commissionPercentage) / 100);
  const netAmount = totalPaid + totalAdvance + totalLateCollected - commissionAmount - totalInterventionsCost;

  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 75, 3, 3, "F");

  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RECAPITULATIF", 20, yPos + 10);

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  let summaryY = yPos + 20;
  doc.text("Total loyers encaisses", 25, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(totalPaid), pageWidth - 25, summaryY, { align: "right" });

  summaryY += 8;
  doc.setFont("helvetica", "normal");
  doc.text("Total avances", 25, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(totalAdvance), pageWidth - 25, summaryY, { align: "right" });

  summaryY += 8;
  doc.setFont("helvetica", "normal");
  doc.text("Total retards encaisses", 25, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(totalLateCollected), pageWidth - 25, summaryY, { align: "right" });

  summaryY += 10;
  doc.setFont("helvetica", "normal");
  const commissionLabel = data.managementTypeName
    ? `Commission agence (${data.managementTypeName} - ${data.commissionPercentage}%)`
    : `Commission agence (${data.commissionPercentage}%)`;
  doc.text(commissionLabel, 25, summaryY);
  doc.setTextColor(...dangerColor);
  doc.text(`- ${formatAmountWithCurrency(commissionAmount)}`, pageWidth - 25, summaryY, { align: "right" });

  summaryY += 8;
  doc.setTextColor(...textColor);
  doc.text("Couts interventions/reparations", 25, summaryY);
  doc.setTextColor(...dangerColor);
  doc.text(`- ${formatAmountWithCurrency(totalInterventionsCost)}`, pageWidth - 25, summaryY, { align: "right" });

  summaryY += 6;
  doc.setDrawColor(...primaryColor);
  doc.line(25, summaryY, pageWidth - 25, summaryY);

  summaryY += 8;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SOLDE NET", 25, summaryY);
  if (netAmount >= 0) doc.setTextColor(...successColor);
  else doc.setTextColor(...dangerColor);
  doc.setFontSize(14);
  doc.text(formatAmountWithCurrency(netAmount), pageWidth - 25, summaryY, { align: "right" });

  // Footer
  drawFooter();

  const fileName = `point_mensuel_${data.propertyTitle.replace(/\s+/g, "_")}_${data.period.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};
