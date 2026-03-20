import jsPDF from "jspdf";
import { createPDFDocument, PDF_FONT } from "@/lib/pdfFont";
import { formatAmountForPDF, formatAmountWithCurrency } from "@/lib/pdfFormat";

interface TenantPaymentRow {
  tenantName: string;
  propertyTitle: string;
  propertyBaseName?: string;
  unitNumber?: string | null;
  rentAmount: number;
  paidAmount: number;
  status: "paid" | "pending" | "late";
  displayStatus?: string;
  paidDate: string | null;
}

interface InterventionRow {
  title: string;
  propertyTitle: string;
  type: string;
  cost: number;
  status: string;
}

interface CautionRow {
  tenantName: string;
  propertyTitle: string;
  propertyBaseName?: string;
  unitNumber?: string | null;
  deposit: number;
}

interface AdvancePaymentRow {
  tenantName: string;
  propertyTitle: string;
  monthsCovered: string[];
  amount: number;
}

interface LatePaymentRow {
  tenantName: string;
  propertyTitle: string;
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
  city?: string;
  country?: string;
  logo_url?: string | null;
}

interface OwnerMonthlyReportData {
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  period: string;
  periodMonth: number;
  periodYear: number;
  agency?: AgencyInfo | null;
  tenantPayments: TenantPaymentRow[];
  interventions: InterventionRow[];
  cautions: CautionRow[];
  advancePayments: AdvancePaymentRow[];
  latePayments: LatePaymentRow[];
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
  const labels: Record<string, string> = {
    paid: "Paye",
    pending: "En attente",
    late: "En retard",
  };
  return labels[status] || status;
};

const getInterventionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    reparation: "Reparation",
    maintenance: "Maintenance",
    procedure: "Procedure",
    renovation: "Renovation",
    autre: "Autre",
  };
  return labels[type] || type;
};

const groupByProperty = <T extends { propertyTitle: string }>(items: T[]): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.propertyTitle;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
};

const groupByBaseName = <T extends { propertyBaseName?: string; propertyTitle: string }>(items: T[]): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.propertyBaseName || item.propertyTitle;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
};

export const generateOwnerMonthlyReport = async (data: OwnerMonthlyReportData): Promise<void> => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor: [number, number, number] = [26, 54, 93]; // Navy
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [245, 245, 245];
  const successColor: [number, number, number] = [34, 197, 94];
  const warningColor: [number, number, number] = [234, 179, 8];
  const dangerColor: [number, number, number] = [239, 68, 68];

  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, "F");

  let headerXOffset = 15;

  // Agency logo
  if (data.agency?.logo_url) {
    try {
      const logoBase64 = await loadImageAsBase64(data.agency.logo_url);
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 15, 8, 18, 18);
        headerXOffset = 38;
      }
    } catch {
      // Logo loading failed
    }
  }

  // Agency name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.agency?.name || "Agence", headerXOffset, 16);

  // Agency contact
  if (data.agency) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    let contactY = 22;
    if (data.agency.phone) {
      doc.text(`Tel: ${data.agency.phone}`, headerXOffset, contactY);
      contactY += 4;
    }
    if (data.agency.email) {
      doc.text(data.agency.email, headerXOffset, contactY);
    }
  }

  // Title on right
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("POINT MENSUEL", pageWidth - 15, 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.period, pageWidth - 15, 26, { align: "right" });

  let yPos = 60;

  // Owner info box
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 22, 2, 2, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PROPRIETAIRE", 20, yPos + 7);
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.ownerName, 20, yPos + 15);
  if (data.ownerPhone) {
    doc.setFontSize(9);
    doc.text(data.ownerPhone, pageWidth - 20, yPos + 15, { align: "right" });
  }

  yPos += 32;

  // Check page break helper
  const checkPageBreak = (needed: number) => {
    if (yPos + needed > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Tenant payments table
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL DES LOYERS", 15, yPos);
  yPos += 8;

  let totalRent = 0;
  let totalPaid = 0;

  if (data.tenantPayments.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Aucun paiement enregistre pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    const groupedPayments = groupByBaseName(data.tenantPayments);
    let rowIndex = 0;

    groupedPayments.forEach((rows, propBaseName) => {
      checkPageBreak(20);
      // Property sub-header
      doc.setFillColor(220, 230, 241);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const displayPropTitle = propBaseName.length > 50 ? propBaseName.substring(0, 48) + "..." : propBaseName;
      doc.text(displayPropTitle, 18, yPos + 5.5);
      yPos += 8;

      // Column headers
      doc.setFillColor(...primaryColor);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Locataire", 18, yPos + 5.5);
      doc.text("Loyer", 115, yPos + 5.5);
      doc.text("Paye", 140, yPos + 5.5);
      doc.text("Statut", 170, yPos + 5.5);
      yPos += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");

      let propRentSubtotal = 0;
      let propPaidSubtotal = 0;

      rows.forEach((row) => {
        checkPageBreak(9);
        if (rowIndex % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, yPos, pageWidth - 30, 9, "F");
        }
        doc.setFontSize(8);
        // Show tenant name with unit number for multi-unit properties
        let tenantLabel = row.tenantName;
        if (row.unitNumber) {
          const porteSuffix = row.unitNumber.toLowerCase().startsWith("porte") ? row.unitNumber : `Porte ${row.unitNumber}`;
          tenantLabel = `${row.tenantName} (${porteSuffix})`;
        }
        tenantLabel = tenantLabel.length > 28 ? tenantLabel.substring(0, 26) + "..." : tenantLabel;
        doc.text(tenantLabel, 18, yPos + 6);
        doc.text(formatAmountForPDF(row.rentAmount), 115, yPos + 6);
        doc.text(formatAmountForPDF(row.paidAmount), 140, yPos + 6);

        const statusLabel = row.displayStatus || getStatusLabel(row.status);
        if (row.displayStatus && row.displayStatus.includes("retard")) {
          doc.setTextColor(...dangerColor);
        } else if (row.displayStatus === "A jour" || row.status === "paid") {
          doc.setTextColor(...successColor);
        } else if (row.status === "pending") {
          doc.setTextColor(...warningColor);
        } else {
          doc.setTextColor(...dangerColor);
        }
        doc.text(statusLabel, 170, yPos + 6);
        doc.setTextColor(...textColor);

        propRentSubtotal += row.rentAmount;
        propPaidSubtotal += row.paidAmount;
        totalRent += row.rentAmount;
        totalPaid += row.paidAmount;
        yPos += 9;
        rowIndex++;
      });

      // Property subtotal
      if (groupedPayments.size > 1) {
        doc.setFillColor(230, 230, 230);
        doc.rect(15, yPos, pageWidth - 30, 8, "F");
        doc.setTextColor(...textColor);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`Sous-total ${displayPropTitle}`, 18, yPos + 5.5);
        doc.text(formatAmountForPDF(propRentSubtotal), 115, yPos + 5.5);
        doc.text(formatAmountForPDF(propPaidSubtotal), 140, yPos + 5.5);
        yPos += 8;
      }
    });
  }

  // Subtotal row
  doc.setFillColor(...primaryColor);
  doc.rect(15, yPos, pageWidth - 30, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL LOYERS", 18, yPos + 6);
  doc.text(formatAmountForPDF(totalRent), 115, yPos + 6);
  doc.text(formatAmountForPDF(totalPaid), 140, yPos + 6);
  yPos += 18;

  // checkPageBreak already defined above

  // Cautions section
  checkPageBreak(30);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CAUTIONS", 15, yPos);
  yPos += 8;

  let totalCautions = 0;

  if (data.cautions.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Aucune caution pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    const groupedCautions = groupByBaseName(data.cautions);
    let cautionRowIndex = 0;

    groupedCautions.forEach((rows, propBaseName) => {
      checkPageBreak(20);
      // Property sub-header
      doc.setFillColor(220, 230, 241);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const displayPropTitle = propBaseName.length > 50 ? propBaseName.substring(0, 48) + "..." : propBaseName;
      doc.text(displayPropTitle, 18, yPos + 5.5);
      yPos += 8;

      // Column headers
      doc.setFillColor(...primaryColor);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Locataire", 18, yPos + 5.5);
      doc.text("Montant", 155, yPos + 5.5);
      yPos += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");

      let propCautionSubtotal = 0;

      rows.forEach((row) => {
        checkPageBreak(9);
        if (cautionRowIndex % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, yPos, pageWidth - 30, 9, "F");
        }
        doc.setFontSize(8);
        // Show tenant name with unit number for multi-unit properties
        let tenantLabel = row.tenantName;
        if (row.unitNumber) {
          const porteSuffix = row.unitNumber.toLowerCase().startsWith("porte") ? row.unitNumber : `Porte ${row.unitNumber}`;
          tenantLabel = `${row.tenantName} (${porteSuffix})`;
        }
        tenantLabel = tenantLabel.length > 28 ? tenantLabel.substring(0, 26) + "..." : tenantLabel;
        doc.text(tenantLabel, 18, yPos + 6);
        doc.text(formatAmountForPDF(row.deposit), 155, yPos + 6);

        propCautionSubtotal += row.deposit;
        totalCautions += row.deposit;
        yPos += 9;
        cautionRowIndex++;
      });

      // Property subtotal
      if (groupedCautions.size > 1) {
        doc.setFillColor(230, 230, 230);
        doc.rect(15, yPos, pageWidth - 30, 8, "F");
        doc.setTextColor(...textColor);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`Sous-total ${displayPropTitle}`, 18, yPos + 5.5);
        doc.text(formatAmountForPDF(propCautionSubtotal), 155, yPos + 5.5);
        yPos += 8;
      }
    });

    // Cautions subtotal
    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL CAUTIONS", 18, yPos + 6);
    doc.text(formatAmountForPDF(totalCautions), 155, yPos + 6);
    yPos += 9;
  }

  yPos += 10;

  // Advance payments section
  checkPageBreak(30);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("MOIS D'AVANCE", 15, yPos);
  yPos += 8;

  let totalAdvance = 0;

  if (data.advancePayments.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Aucun mois d'avance pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    // Group advance payments by property
    const advanceByProperty = new Map<string, typeof data.advancePayments>();
    data.advancePayments.forEach(row => {
      const key = row.propertyTitle || "Autre";
      if (!advanceByProperty.has(key)) advanceByProperty.set(key, []);
      advanceByProperty.get(key)!.push(row);
    });

    advanceByProperty.forEach((rows, propTitle) => {
      checkPageBreak(25);
      // Property sub-header
      doc.setFillColor(220, 230, 241);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const displayPropTitle = propTitle.length > 40 ? propTitle.substring(0, 38) + "..." : propTitle;
      doc.text(displayPropTitle, 18, yPos + 5.5);
      yPos += 8;

      // Table header
      doc.setFillColor(...primaryColor);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Locataire", 18, yPos + 5.5);
      doc.text("Mois couverts", 85, yPos + 5.5);
      doc.text("Montant", 170, yPos + 5.5);
      yPos += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");

      let propSubtotal = 0;
      rows.forEach((row, index) => {
        checkPageBreak(9);
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, yPos, pageWidth - 30, 9, "F");
        }

        doc.setFontSize(8);
        const tenantName = row.tenantName.length > 22 ? row.tenantName.substring(0, 20) + "..." : row.tenantName;
        const monthsLabel = row.monthsCovered.length > 3
          ? `${row.monthsCovered.length} mois`
          : row.monthsCovered.join(", ");
        const monthsDisplay = monthsLabel.length > 28 ? monthsLabel.substring(0, 26) + "..." : monthsLabel;

        doc.text(tenantName, 18, yPos + 6);
        doc.text(monthsDisplay, 85, yPos + 6);
        doc.text(formatAmountForPDF(row.amount), 170, yPos + 6);

        propSubtotal += row.amount;
        totalAdvance += row.amount;
        yPos += 9;
      });

      // Property subtotal
      doc.setFillColor(230, 230, 230);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Sous-total ${displayPropTitle}`, 18, yPos + 5.5);
      doc.text(formatAmountForPDF(propSubtotal), 170, yPos + 5.5);
      yPos += 8;
      yPos += 3;
    });

    // Grand total
    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AVANCES", 18, yPos + 6);
    doc.text(formatAmountForPDF(totalAdvance), 170, yPos + 6);
    yPos += 9;
  }

  yPos += 10;

  // Late payments section
  checkPageBreak(30);
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL MOIS EN RETARD", 15, yPos);
  yPos += 8;

  let totalLateCollected = 0;

  if (data.latePayments.length === 0) {
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 10, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Aucun encaissement de mois en retard pour cette periode", pageWidth / 2, yPos + 6, { align: "center" });
    yPos += 10;
  } else {
    // Group late payments by property
    const lateByProperty = new Map<string, typeof data.latePayments>();
    data.latePayments.forEach(row => {
      const key = row.propertyTitle || "Autre";
      if (!lateByProperty.has(key)) lateByProperty.set(key, []);
      lateByProperty.get(key)!.push(row);
    });

    lateByProperty.forEach((rows, propTitle) => {
      checkPageBreak(25);
      // Property sub-header
      doc.setFillColor(220, 230, 241);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const displayPropTitle = propTitle.length > 40 ? propTitle.substring(0, 38) + "..." : propTitle;
      doc.text(displayPropTitle, 18, yPos + 5.5);
      yPos += 8;

      // Table header
      doc.setFillColor(...primaryColor);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Locataire", 18, yPos + 5.5);
      doc.text("Mois du", 85, yPos + 5.5);
      doc.text("Loyer", 135, yPos + 5.5);
      doc.text("Encaisse", 165, yPos + 5.5);
      yPos += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");

      let propSubtotal = 0;
      rows.forEach((row, index) => {
        checkPageBreak(9);
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, yPos, pageWidth - 30, 9, "F");
        }

        doc.setFontSize(8);
        const tenantName = row.tenantName.length > 22 ? row.tenantName.substring(0, 20) + "..." : row.tenantName;

        doc.text(tenantName, 18, yPos + 6);
        doc.text(row.dueMonth, 85, yPos + 6);
        doc.text(formatAmountForPDF(row.rentAmount), 135, yPos + 6);

        if (row.status === "partial") {
          doc.setTextColor(...warningColor);
        } else {
          doc.setTextColor(...successColor);
        }
        doc.text(formatAmountForPDF(row.paidAmount), 165, yPos + 6);
        doc.setTextColor(...textColor);

        propSubtotal += row.paidAmount;
        totalLateCollected += row.paidAmount;
        yPos += 9;
      });

      // Property subtotal
      doc.setFillColor(230, 230, 230);
      doc.rect(15, yPos, pageWidth - 30, 8, "F");
      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Sous-total ${displayPropTitle}`, 18, yPos + 5.5);
      doc.text(formatAmountForPDF(propSubtotal), 165, yPos + 5.5);
      yPos += 8;
      yPos += 3;
    });

    // Grand total
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

  // Interventions section
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
    // Interventions table header
    doc.setFillColor(...primaryColor);
    doc.rect(15, yPos, pageWidth - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Intervention", 18, yPos + 5.5);
    doc.text("Bien", 75, yPos + 5.5);
    doc.text("Type", 130, yPos + 5.5);
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
      const title = row.title.length > 25 ? row.title.substring(0, 23) + "..." : row.title;
      const propertyTitle = row.propertyTitle.length > 22 ? row.propertyTitle.substring(0, 20) + "..." : row.propertyTitle;

      doc.text(title, 18, yPos + 6);
      doc.text(propertyTitle, 75, yPos + 6);
      doc.text(getInterventionTypeLabel(row.type), 130, yPos + 6);
      doc.text(formatAmountForPDF(row.cost || 0), 165, yPos + 6);

      totalInterventionsCost += row.cost || 0;
      yPos += 9;
    });

    // Interventions subtotal
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

  // Summary section
  // Commission is calculated only on rent payments (totalPaid), not on advances/late separately
  const commissionAmount = Math.round((totalPaid * data.commissionPercentage) / 100);
  const netAmount = totalPaid - commissionAmount - totalInterventionsCost + totalCautions;

  checkPageBreak(95);
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 95, 3, 3, "F");

  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RECAPITULATIF", 20, yPos + 10);

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  let summaryY = yPos + 20;

  // Total loyers encaisses
  doc.text("Total loyers encaisses", 25, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(totalPaid), pageWidth - 25, summaryY, { align: "right" });

  // Total avances
  summaryY += 10;
  doc.setFont("helvetica", "normal");
  doc.text("Total avances", 25, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(totalAdvance), pageWidth - 25, summaryY, { align: "right" });

  // Total retards encaisses
  summaryY += 10;
  doc.setFont("helvetica", "normal");
  doc.text("Total retards encaisses", 25, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(totalLateCollected), pageWidth - 25, summaryY, { align: "right" });

  // Commission
  summaryY += 10;
  doc.setFont("helvetica", "normal");
  const commissionLabel = data.managementTypeName 
    ? `Commission agence (${data.managementTypeName} - ${data.commissionPercentage}%)`
    : `Commission agence (${data.commissionPercentage}%)`;
  doc.text(commissionLabel, 25, summaryY);
  doc.setTextColor(...dangerColor);
  doc.text(`- ${formatAmountWithCurrency(commissionAmount)}`, pageWidth - 25, summaryY, { align: "right" });

  // Interventions
  summaryY += 10;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.text("Couts interventions/reparations", 25, summaryY);
  doc.setTextColor(...dangerColor);
  doc.text(`- ${formatAmountWithCurrency(totalInterventionsCost)}`, pageWidth - 25, summaryY, { align: "right" });

  // Total cautions
  summaryY += 10;
  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "normal");
  doc.text("Total cautions", 25, summaryY);
  doc.setFont("helvetica", "bold");
  doc.text(formatAmountWithCurrency(totalCautions), pageWidth - 25, summaryY, { align: "right" });

  // Separator
  summaryY += 8;
  doc.setDrawColor(...primaryColor);
  doc.line(25, summaryY, pageWidth - 25, summaryY);

  // Net balance
  summaryY += 10;
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SOLDE PROPRIETAIRE", 25, summaryY);
  
  if (netAmount >= 0) {
    doc.setTextColor(...successColor);
  } else {
    doc.setTextColor(...dangerColor);
  }
  doc.setFontSize(14);
  doc.text(formatAmountWithCurrency(netAmount), pageWidth - 25, summaryY, { align: "right" });

  // Footer
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 20, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Document genere le ${today}`, pageWidth / 2, pageHeight - 10, { align: "center" });

  // Save
  const fileName = `point_mensuel_${data.ownerName.replace(/\s+/g, "_")}_${data.period.replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};
