import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, addPDFFooter, PDFAgencyInfo } from "@/lib/pdfHeader";
import { formatAmountWithCurrency } from "@/lib/pdfFormat";
import { ActivityReportData } from "@/hooks/useActivityReport";

const primaryColor: [number, number, number] = [26, 54, 93];
const textColor: [number, number, number] = [51, 51, 51];
const lightGray: [number, number, number] = [245, 245, 245];
const successColor: [number, number, number] = [34, 197, 94];
const warningColor: [number, number, number] = [245, 158, 11];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  gestionnaire: "Commercial",
  comptable: "Comptable",
  caissiere: "Caissière",
};

function addManagerSection(
  doc: any,
  report: ActivityReportData,
  y: number,
  pageWidth: number,
  pageHeight: number
): number {
  // Check page break
  if (y + 90 > pageHeight - 30) {
    doc.addPage();
    y = 20;
  }

  // Manager header
  doc.setFillColor(...primaryColor);
  doc.roundedRect(15, y, pageWidth - 30, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("Roboto", "bold");
  doc.text(`${report.userName} (${ROLE_LABELS[report.role] || report.role})`, 20, y + 7);
  doc.text(formatAmountWithCurrency(report.totalRevenue), pageWidth - 20, y + 7, { align: "right" });
  y += 14;

  // Data rows
  const rows = [
    ["Prospects contactés", report.prospectsContacted.toString()],
    ["Taux de conversion", `${report.tauxConversion}%`],
    ["Ventes immobilières conclues", `${report.ventesConclues} — ${formatAmountWithCurrency(report.ventesAmount)}`],
    ["Contrats de location signés", report.contratsSignes.toString()],
    ["Loyers encaissés", formatAmountWithCurrency(report.loyersEncaisses)],
    ["Montant recouvré", formatAmountWithCurrency(report.montantRecouvre)],
    ["Impayés suivis", report.impayesSuivis.toString()],
    ["Parcelles vendues", `${report.parcellesVendues} — ${formatAmountWithCurrency(report.parcellesAmount)}`],
    ["Achats effectués", `${report.achatsEffectues} — ${formatAmountWithCurrency(report.achatsAmount)}`],
  ];

  rows.forEach((row, i) => {
    if (y + 9 > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(...lightGray);
      doc.rect(15, y, pageWidth - 30, 9, "F");
    }
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont("Roboto", "normal");
    doc.text(row[0], 22, y + 6);
    doc.setFont("Roboto", "bold");
    doc.text(row[1], pageWidth - 20, y + 6, { align: "right" });
    y += 9;
  });

  // Total row
  doc.setFillColor(...successColor);
  doc.rect(15, y, pageWidth - 30, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("Roboto", "bold");
  doc.text("TOTAL REVENUS GÉNÉRÉS", 22, y + 6);
  doc.text(formatAmountWithCurrency(report.totalRevenue), pageWidth - 20, y + 6, { align: "right" });
  y += 15;

  return y;
}

export async function generateSingleActivityReport(
  report: ActivityReportData,
  periodLabel: string,
  agency?: PDFAgencyInfo | null
) {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = await addPDFHeader(doc, agency, "RAPPORT D'ACTIVITÉ", `Période : ${periodLabel}`);

  // Agent info box
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, y, pageWidth - 30, 16, 3, 3, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(11);
  doc.setFont("Roboto", "bold");
  doc.text(`${report.userName}`, 20, y + 7);
  doc.setFontSize(9);
  doc.setFont("Roboto", "normal");
  doc.setTextColor(...textColor);
  doc.text(`Rôle : ${ROLE_LABELS[report.role] || report.role}`, 20, y + 13);
  y += 22;

  y = addManagerSection(doc, report, y, pageWidth, pageHeight);

  addPDFFooter(doc, agency, "Rapport d'activité");
  doc.save(`rapport-activite-${report.userName.replace(/\s/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`);
}

export async function generateConsolidatedReport(
  reports: ActivityReportData[],
  periodLabel: string,
  agency?: PDFAgencyInfo | null
) {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = await addPDFHeader(doc, agency, "RAPPORT GÉNÉRAL D'ACTIVITÉ", `Période : ${periodLabel}`);

  // Summary box
  const grandTotal = reports.reduce((s, r) => s + r.totalRevenue, 0);
  const totalProspects = reports.reduce((s, r) => s + r.prospectsContacted, 0);
  const totalVentes = reports.reduce((s, r) => s + r.ventesConclues, 0);
  const totalContrats = reports.reduce((s, r) => s + r.contratsSignes, 0);
  const totalParcelles = reports.reduce((s, r) => s + r.parcellesVendues, 0);

  doc.setFillColor(...lightGray);
  doc.roundedRect(15, y, pageWidth - 30, 24, 3, 3, "F");
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("Roboto", "bold");
  doc.text("RÉSUMÉ GLOBAL", 20, y + 8);
  doc.setTextColor(...successColor);
  doc.setFontSize(14);
  doc.text(formatAmountWithCurrency(grandTotal), pageWidth - 20, y + 8, { align: "right" });
  
  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  doc.setFont("Roboto", "normal");
  doc.text(
    `${totalProspects} prospects  |  ${totalVentes} ventes  |  ${totalContrats} contrats  |  ${totalParcelles} parcelles`,
    20,
    y + 18
  );
  y += 30;

  // Individual reports
  for (const report of reports) {
    y = addManagerSection(doc, report, y, pageWidth, pageHeight);
  }

  // Recap table
  if (y + 60 > pageHeight - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont("Roboto", "bold");
  doc.text("CLASSEMENT PAR CHIFFRE D'AFFAIRES", 15, y);
  y += 8;

  // Table header
  doc.setFillColor(...primaryColor);
  doc.rect(15, y, pageWidth - 30, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("Roboto", "bold");
  doc.text("#", 18, y + 5.5);
  doc.text("Membre", 26, y + 5.5);
  doc.text("Prospects", 80, y + 5.5);
  doc.text("Ventes", 105, y + 5.5);
  doc.text("Loyers", 125, y + 5.5);
  doc.text("Parcelles", 148, y + 5.5);
  doc.text("Total", pageWidth - 18, y + 5.5, { align: "right" });
  y += 8;

  reports.forEach((r, i) => {
    if (y + 9 > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(...lightGray);
      doc.rect(15, y, pageWidth - 30, 9, "F");
    }
    doc.setTextColor(...textColor);
    doc.setFontSize(7);
    doc.setFont("Roboto", "normal");
    doc.text(`${i + 1}`, 18, y + 6);
    const name = r.userName.length > 22 ? r.userName.substring(0, 20) + "..." : r.userName;
    doc.text(name, 26, y + 6);
    doc.text(r.prospectsContacted.toString(), 80, y + 6);
    doc.text(r.ventesConclues.toString(), 105, y + 6);
    doc.text(formatAmountWithCurrency(r.loyersEncaisses), 125, y + 6);
    doc.text(r.parcellesVendues.toString(), 148, y + 6);
    doc.setFont("Roboto", "bold");
    doc.text(formatAmountWithCurrency(r.totalRevenue), pageWidth - 18, y + 6, { align: "right" });
    y += 9;
  });

  // Grand total row
  doc.setFillColor(...primaryColor);
  doc.rect(15, y, pageWidth - 30, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("Roboto", "bold");
  doc.text("TOTAL", 26, y + 6);
  doc.text(formatAmountWithCurrency(grandTotal), pageWidth - 18, y + 6, { align: "right" });

  addPDFFooter(doc, agency, "Rapport général d'activité");
  doc.save(`rapport-general-activite-${new Date().toISOString().split("T")[0]}.pdf`);
}
