import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText } from "lucide-react";
import { ComptabiliteData, PaidRentDetail, ManagerRentGroup, ManagerRevenueGroup } from "@/hooks/useComptabilite";
import { Expense, getSyscohadaAccount, REVENUE_ACCOUNTS } from "@/hooks/useExpenses";
import { toast } from "sonner";
import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, addPDFFooter, PDFAgencyInfo } from "@/lib/pdfHeader";
import { formatAmountForPDF, formatAmountWithCurrency } from "@/lib/pdfFormat";

interface Props {
  data: ComptabiliteData;
  totalRevenue: number;
  expenses: Expense[];
  periodLabel: string;
  agency?: PDFAgencyInfo | null;
}

const primaryColor: [number, number, number] = [26, 54, 93];
const textColor: [number, number, number] = [51, 51, 51];
const lightGray: [number, number, number] = [245, 245, 245];
const successColor: [number, number, number] = [34, 197, 94];
const dangerColor: [number, number, number] = [239, 68, 68];

export function ExportComptabilite({ data, totalRevenue, expenses, periodLabel, agency }: Props) {
  const benefice = totalRevenue - data.totalExpenses;

  const exportCompteResultat = async () => {
    try {
      const doc = await createPDFDocument();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = await addPDFHeader(doc, agency, "COMPTE DE RÉSULTAT", `Période : ${periodLabel}`);

      // Section Produits (Classe 7)
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("CLASSE 7 — PRODUITS", 15, y);
      y += 8;

      // Table header
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Compte", 18, y + 5.5);
      doc.text("Libellé", 50, y + 5.5);
      doc.text("Montant (F CFA)", pageWidth - 20, y + 5.5, { align: "right" });
      y += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const revenueRows = [
        { account: REVENUE_ACCOUNTS.loyers, amount: data.loyersEncaisses },
        { account: REVENUE_ACCOUNTS.cautions, amount: data.cautionsEncaissees },
        { account: REVENUE_ACCOUNTS.ventes, amount: data.ventesEncaissees },
        { account: REVENUE_ACCOUNTS.achats, amount: data.achatsEncaisses },
        { account: REVENUE_ACCOUNTS.lotissements, amount: data.lotissementsEncaisses },
      ].filter(r => r.amount > 0);

      // Helper to render manager sub-table for rent details
      const renderRentManagerGroups = (groups: ManagerRentGroup[], doc: any, startY: number): number => {
        let y = startY + 2;
        groups.forEach((group) => {
          if (y + 20 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
          doc.setFillColor(26, 54, 93);
          doc.rect(25, y, pageWidth - 50, 8, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text(`Gestionnaire : ${group.managerName}`, 28, y + 5.5);
          doc.text(`Total : ${formatAmountWithCurrency(group.total)}`, pageWidth - 30, y + 5.5, { align: "right" });
          y += 8;
          doc.setFillColor(230, 237, 245);
          doc.rect(25, y, pageWidth - 50, 7, "F");
          doc.setTextColor(...primaryColor);
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.text("Locataire", 28, y + 5);
          doc.text("Mois concerné(s)", 90, y + 5);
          doc.text("Montant", pageWidth - 30, y + 5, { align: "right" });
          y += 7;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          group.details.forEach((detail, j) => {
            if (y + 8 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
            if (j % 2 === 0) { doc.setFillColor(245, 248, 252); doc.rect(25, y, pageWidth - 50, 7, "F"); }
            doc.setTextColor(...textColor);
            const name = detail.tenantName.length > 25 ? detail.tenantName.substring(0, 23) + "..." : detail.tenantName;
            doc.text(name, 28, y + 5);
            const monthsText = detail.months.length > 0 ? detail.months.join(", ") : new Date(detail.paidDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
            const truncMonths = monthsText.length > 35 ? monthsText.substring(0, 33) + "..." : monthsText;
            doc.text(truncMonths, 90, y + 5);
            doc.text(formatAmountWithCurrency(detail.amount), pageWidth - 30, y + 5, { align: "right" });
            y += 7;
          });
          y += 3;
        });
        return y;
      };

      // Helper to render manager sub-table for generic revenue details
      const renderRevenueManagerGroups = (groups: ManagerRevenueGroup[], col1Label: string, col2Label: string, doc: any, startY: number): number => {
        let y = startY + 2;
        groups.forEach((group) => {
          if (y + 20 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
          doc.setFillColor(26, 54, 93);
          doc.rect(25, y, pageWidth - 50, 8, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text(`Gestionnaire : ${group.managerName}`, 28, y + 5.5);
          doc.text(`Total : ${formatAmountWithCurrency(group.total)}`, pageWidth - 30, y + 5.5, { align: "right" });
          y += 8;
          doc.setFillColor(230, 237, 245);
          doc.rect(25, y, pageWidth - 50, 7, "F");
          doc.setTextColor(...primaryColor);
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.text(col1Label, 28, y + 5);
          doc.text(col2Label, 110, y + 5);
          doc.text("Montant", pageWidth - 30, y + 5, { align: "right" });
          y += 7;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          group.details.forEach((detail, j) => {
            if (y + 8 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
            if (j % 2 === 0) { doc.setFillColor(245, 248, 252); doc.rect(25, y, pageWidth - 50, 7, "F"); }
            doc.setTextColor(...textColor);
            const label = detail.label.length > 40 ? detail.label.substring(0, 38) + "..." : detail.label;
            doc.text(label, 28, y + 5);
            const desc = detail.description.length > 30 ? detail.description.substring(0, 28) + "..." : detail.description;
            doc.text(desc, 110, y + 5);
            doc.text(formatAmountWithCurrency(detail.amount), pageWidth - 30, y + 5, { align: "right" });
            y += 7;
          });
          y += 3;
        });
        return y;
      };

      revenueRows.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, y, pageWidth - 30, 9, "F");
        }
        doc.setTextColor(...textColor);
        doc.text(row.account.syscohada, 18, y + 6);
        doc.text(row.account.label, 50, y + 6);
        doc.text(formatAmountWithCurrency(row.amount), pageWidth - 20, y + 6, { align: "right" });
        y += 9;

        // Add detailed breakdown by manager for each category
        if (row.account === REVENUE_ACCOUNTS.loyers && data.paidRentsByManager.length > 0) {
          y = renderRentManagerGroups(data.paidRentsByManager, doc, y);
          doc.setFontSize(9);

          // === Payment method summary grouped by manager ===
          if (data.paidRentDetails.length > 0) {
            if (y + 30 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }

            const methodLabels: Record<string, string> = {
              especes: "Espèces",
              cheque: "Chèque",
              virement: "Virement",
              kkiapay: "KKiaPay",
              mobile_money: "Mobile Money",
              "Mobile Money": "Mobile Money",
              en_ligne: "En ligne",
              card: "Carte bancaire",
              orange_money: "Orange Money",
              mtn_money: "MTN Money",
              moov: "Moov Money",
              geniuspay: "GeniusPay",
            };

            // Merge wave into mobile_money and normalize methods
            const normalizeMethod = (m: string): string => {
              if (m === "wave" || m === "Wave") return "mobile_money";
              if (m === "Mobile Money") return "mobile_money";
              return m;
            };

            // Collect all unique methods and build manager -> { method: amount }
            const allMethods = new Set<string>();
            const methodByManager = new Map<string, Record<string, number>>();
            const totals: Record<string, number> = {};

            data.paidRentDetails.forEach((d) => {
              const method = normalizeMethod(d.paymentMethod || "Non spécifié");
              allMethods.add(method);
              const entry = methodByManager.get(d.managerName) || {};
              entry[method] = (entry[method] || 0) + d.amount;
              methodByManager.set(d.managerName, entry);
              totals[method] = (totals[method] || 0) + d.amount;
            });

            // Sort methods: especes first, then alphabetically
            const methods = Array.from(allMethods).sort((a, b) => {
              if (a === "especes") return -1;
              if (b === "especes") return 1;
              return (methodLabels[a] || a).localeCompare(methodLabels[b] || b);
            });

            // Calculate column positions to fit within page
            const tableLeft = 25;
            const tableRight = pageWidth - 25;
            const tableWidth = tableRight - tableLeft;
            const startX = tableLeft + 3;
            const managerColWidth = 55;
            const methodColCount = methods.length;
            const methodAreaWidth = tableWidth - managerColWidth;
            const colWidth = methodColCount > 0 ? methodAreaWidth / methodColCount : 40;
            const fontSize = methodColCount > 3 ? 6 : 7;

            // Section header
            doc.setFillColor(52, 152, 219);
            doc.rect(tableLeft, y, tableWidth, 8, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.text("RÉCAPITULATIF PAR MODE DE PAIEMENT", startX, y + 5.5);
            y += 8;

            // Sub-header
            doc.setFillColor(230, 237, 245);
            doc.rect(tableLeft, y, tableWidth, 7, "F");
            doc.setTextColor(...primaryColor);
            doc.setFontSize(fontSize);
            doc.setFont("helvetica", "bold");
            doc.text("Gestionnaire", startX, y + 5);
            methods.forEach((m, idx) => {
              const label = methodLabels[m] || m;
              const xPos = startX + managerColWidth + idx * colWidth;
              doc.text(label, xPos, y + 5);
            });
            y += 7;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(fontSize);
            let rowIdx = 0;
            Array.from(methodByManager.entries()).forEach(([manager, amounts]) => {
              if (y + 8 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
              if (rowIdx % 2 === 0) { doc.setFillColor(245, 248, 252); doc.rect(tableLeft, y, tableWidth, 7, "F"); }
              doc.setTextColor(...textColor);
              const name = manager.length > 20 ? manager.substring(0, 18) + "..." : manager;
              doc.text(name, startX, y + 5);
              methods.forEach((m, idx) => {
                const xPos = startX + managerColWidth + idx * colWidth;
                doc.text(formatAmountForPDF(amounts[m] || 0), xPos, y + 5);
              });
              y += 7;
              rowIdx++;
            });

            // Totals row
            if (y + 8 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
            doc.setFillColor(52, 152, 219);
            doc.rect(tableLeft, y, tableWidth, 7, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(fontSize);
            doc.setFont("helvetica", "bold");
            doc.text("TOTAL", startX, y + 5);
            methods.forEach((m, idx) => {
              const xPos = startX + managerColWidth + idx * colWidth;
              doc.text(formatAmountForPDF(totals[m] || 0), xPos, y + 5);
            });
            y += 10;
          }
        } else if (row.account === REVENUE_ACCOUNTS.ventes && data.ventesByManager.length > 0) {
          y = renderRevenueManagerGroups(data.ventesByManager, "Bien", "Acquéreur", doc, y);
          doc.setFontSize(9);
        } else if (row.account === REVENUE_ACCOUNTS.achats && data.achatsByManager.length > 0) {
          y = renderRevenueManagerGroups(data.achatsByManager, "Bien", "Acquéreur", doc, y);
          doc.setFontSize(9);
        } else if (row.account === REVENUE_ACCOUNTS.lotissements && data.lotissementsByManager.length > 0) {
          y = renderRevenueManagerGroups(data.lotissementsByManager, "Parcelle", "Acquéreur", doc, y);
          doc.setFontSize(9);
        } else if (row.account === REVENUE_ACCOUNTS.cautions && data.cautionsByManager.length > 0) {
          y = renderRevenueManagerGroups(data.cautionsByManager, "Locataire", "Bien", doc, y);
          doc.setFontSize(9);
        }
      });

      // Total produits
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL PRODUITS", 18, y + 6);
      doc.text(formatAmountWithCurrency(totalRevenue), pageWidth - 20, y + 6, { align: "right" });
      y += 18;

      // Page break check before charges section
      const pageHeight = doc.internal.pageSize.getHeight();
      if (y + 40 > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      // Section Charges (Classe 6)
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("CLASSE 6 — CHARGES", 15, y);
      y += 8;

      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Compte", 18, y + 5.5);
      doc.text("Libellé", 50, y + 5.5);
      doc.text("Montant (F CFA)", pageWidth - 20, y + 5.5, { align: "right" });
      y += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      data.expensesByCategory.forEach((cat, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, y, pageWidth - 30, 9, "F");
        }
        const info = getSyscohadaAccount(cat.name);
        doc.setTextColor(...textColor);
        doc.text(info?.syscohada || "658", 18, y + 6);
        doc.text(info?.label || cat.name, 50, y + 6);
        doc.text(formatAmountWithCurrency(cat.value), pageWidth - 20, y + 6, { align: "right" });
        y += 9;
      });

      // Total charges
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL CHARGES", 18, y + 6);
      doc.text(formatAmountWithCurrency(data.totalExpenses), pageWidth - 20, y + 6, { align: "right" });
      y += 20;

      // Résultat net
      doc.setFillColor(...lightGray);
      doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, "F");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RÉSULTAT NET", 20, y + 10);
      if (benefice >= 0) doc.setTextColor(...successColor);
      else doc.setTextColor(...dangerColor);
      doc.setFontSize(16);
      doc.text(formatAmountWithCurrency(benefice), pageWidth - 25, y + 16, { align: "right" });

      addPDFFooter(doc, agency, "Compte de résultat SYSCOHADA");
      doc.save(`compte-resultat-syscohada-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Compte de résultat PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const exportJournal = async () => {
    try {
      const doc = await createPDFDocument();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = await addPDFHeader(doc, agency, "JOURNAL COMPTABLE", `Période : ${periodLabel}`);

      const colX = { date: 18, compte: 42, libelle: 68, debit: 135, credit: 165, mode: 190 };

      const drawTableHeader = () => {
        doc.setFillColor(...primaryColor);
        doc.rect(15, y, pageWidth - 30, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("Date", colX.date, y + 5.5);
        doc.text("Compte", colX.compte, y + 5.5);
        doc.text("Libellé", colX.libelle, y + 5.5);
        doc.text("Débit", colX.debit, y + 5.5);
        doc.text("Crédit", colX.credit, y + 5.5);
        y += 8;
      };

      drawTableHeader();

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      let rowIdx = 0;
      expenses.forEach((exp) => {
        // Check page break (need 2 rows)
        if (y + 20 > pageHeight - 30) {
          doc.addPage();
          y = 20;
          drawTableHeader();
        }

        const info = getSyscohadaAccount(exp.category);
        const date = new Date(exp.expense_date).toLocaleDateString("fr-FR");
        const libelle = exp.description.length > 30 ? exp.description.substring(0, 28) + "..." : exp.description;
        const creditAccount = exp.payment_method === "especes" ? "571" : "521";

        // Debit line
        if (rowIdx % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, y, pageWidth - 30, 8, "F");
        }
        doc.setTextColor(...textColor);
        doc.text(date, colX.date, y + 5.5);
        doc.text(info?.syscohada || "658", colX.compte, y + 5.5);
        doc.text(libelle, colX.libelle, y + 5.5);
        doc.text(formatAmountForPDF(Number(exp.amount)), colX.debit, y + 5.5);
        doc.text("", colX.credit, y + 5.5);
        y += 8;
        rowIdx++;

        // Credit line
        if (rowIdx % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, y, pageWidth - 30, 8, "F");
        }
        doc.setTextColor(...textColor);
        doc.text("", colX.date, y + 5.5);
        doc.text(creditAccount, colX.compte, y + 5.5);
        doc.text(libelle, colX.libelle, y + 5.5);
        doc.text("", colX.debit, y + 5.5);
        doc.text(formatAmountForPDF(Number(exp.amount)), colX.credit, y + 5.5);
        y += 8;
        rowIdx++;
      });

      if (expenses.length === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(15, y, pageWidth - 30, 10, "F");
        doc.setFontSize(9);
        doc.setTextColor(...textColor);
        doc.text("Aucune écriture pour cette période", pageWidth / 2, y + 6, { align: "center" });
      }

      addPDFFooter(doc, agency, "Journal comptable");
      doc.save(`journal-comptable-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Journal comptable PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const exportTresorerie = async () => {
    try {
      const doc = await createPDFDocument();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = await addPDFHeader(doc, agency, "FLUX DE TRÉSORERIE", `Période : ${periodLabel}`);

      // Table header
      const cols = [18, 36, 54, 72, 90, 108, 126, 145, 165];
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.text("Mois", cols[0], y + 5.5);
      doc.text("Loyers", cols[1], y + 5.5);
      doc.text("Ventes", cols[2], y + 5.5);
      doc.text("Achats", cols[3], y + 5.5);
      doc.text("Lotissem.", cols[4], y + 5.5);
      doc.text("Cautions", cols[5], y + 5.5);
      doc.text("Entrées", cols[6], y + 5.5);
      doc.text("Dépenses", cols[7], y + 5.5);
      doc.text("Flux Net", cols[8], y + 5.5);
      y += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      let cumul = 0;
      data.monthlyData.forEach((m, i) => {
        const entrees = m.loyers + m.ventes + m.achats + m.lotissements + m.cautions;
        const flux = entrees - m.depenses;
        cumul += flux;

        if (i % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, y, pageWidth - 30, 9, "F");
        }
        doc.setTextColor(...textColor);
        doc.text(m.name, cols[0], y + 6);
        doc.text(formatAmountForPDF(m.loyers), cols[1], y + 6);
        doc.text(formatAmountForPDF(m.ventes), cols[2], y + 6);
        doc.text(formatAmountForPDF(m.achats), cols[3], y + 6);
        doc.text(formatAmountForPDF(m.lotissements), cols[4], y + 6);
        doc.text(formatAmountForPDF(m.cautions), cols[5], y + 6);
        doc.text(formatAmountForPDF(entrees), cols[6], y + 6);
        doc.setTextColor(...dangerColor);
        doc.text(formatAmountForPDF(m.depenses), cols[7], y + 6);
        if (flux >= 0) doc.setTextColor(...successColor);
        else doc.setTextColor(...dangerColor);
        doc.text(formatAmountForPDF(flux), cols[8], y + 6);
        y += 9;
      });

      // Total row
      const totalEntrees = totalRevenue;
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", cols[0], y + 6);
      doc.text(formatAmountForPDF(data.monthlyData.reduce((s, r) => s + r.loyers, 0)), cols[1], y + 6);
      doc.text(formatAmountForPDF(data.monthlyData.reduce((s, r) => s + r.ventes, 0)), cols[2], y + 6);
      doc.text(formatAmountForPDF(data.monthlyData.reduce((s, r) => s + r.achats, 0)), cols[3], y + 6);
      doc.text(formatAmountForPDF(data.monthlyData.reduce((s, r) => s + r.lotissements, 0)), cols[4], y + 6);
      doc.text(formatAmountForPDF(data.monthlyData.reduce((s, r) => s + r.cautions, 0)), cols[5], y + 6);
      doc.text(formatAmountForPDF(totalEntrees), cols[6], y + 6);
      doc.text(formatAmountForPDF(data.totalExpenses), cols[7], y + 6);
      doc.text(formatAmountForPDF(benefice), cols[8], y + 6);
      y += 20;

      // Solde cumulé box
      doc.setFillColor(...lightGray);
      doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, "F");
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SOLDE CUMULÉ", 20, y + 10);
      if (benefice >= 0) doc.setTextColor(...successColor);
      else doc.setTextColor(...dangerColor);
      doc.setFontSize(14);
      doc.text(formatAmountWithCurrency(benefice), pageWidth - 25, y + 16, { align: "right" });

      addPDFFooter(doc, agency, "Flux de trésorerie");
      doc.save(`tresorerie-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Flux de trésorerie PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCompteResultat} className="gap-2">
          <FileText className="h-4 w-4" />
          Compte de résultat (SYSCOHADA)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJournal} className="gap-2">
          <FileText className="h-4 w-4" />
          Journal comptable
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTresorerie} className="gap-2">
          <FileText className="h-4 w-4" />
          Flux de trésorerie
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
