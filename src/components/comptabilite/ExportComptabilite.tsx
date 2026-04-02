import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { ComptabiliteData, PaidRentDetail, ManagerRentGroup, ManagerRevenueGroup } from "@/hooks/useComptabilite";
import { Expense, getSyscohadaAccount, REVENUE_ACCOUNTS } from "@/hooks/useExpenses";
import { toast } from "sonner";
import { createPDFDocument } from "@/lib/pdfFont";
import { addPDFHeader, addPDFFooter, PDFAgencyInfo } from "@/lib/pdfHeader";
import { formatAmountForPDF, formatAmountWithCurrency } from "@/lib/pdfFormat";
import ExcelJS from "exceljs";

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
          doc.text("Propriétaire", 58, y + 5);
          doc.text("Bien loué", 88, y + 5);
          doc.text("Mois concerné(s)", 118, y + 5);
          doc.text("Montant", pageWidth - 30, y + 5, { align: "right" });
          y += 7;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);

          // Column widths for splitTextToSize
          const colWidths = { name: 28, owner: 28, prop: 28, months: 38 };

          // Group details by property title for subtotals
          const detailsByProperty = new Map<string, { details: typeof group.details; total: number }>();
          group.details.forEach((detail) => {
            const key = detail.propertyTitle || "—";
            if (!detailsByProperty.has(key)) {
              detailsByProperty.set(key, { details: [], total: 0 });
            }
            const entry = detailsByProperty.get(key)!;
            entry.details.push(detail);
            entry.total += detail.amount;
          });

          let rowIdx = 0;
          Array.from(detailsByProperty.entries()).forEach(([propName, propGroup]) => {
            propGroup.details.forEach((detail) => {
              const nameLines = doc.splitTextToSize(detail.tenantName, colWidths.name);
              const ownerLines = doc.splitTextToSize(detail.ownerName || "—", colWidths.owner);
              const propLines = doc.splitTextToSize(detail.propertyTitle || "—", colWidths.prop);
              const monthsText = detail.months.length > 0 ? detail.months.join(", ") : new Date(detail.paidDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
              const monthsLines = doc.splitTextToSize(monthsText, colWidths.months);
              const maxLines = Math.max(nameLines.length, ownerLines.length, propLines.length, monthsLines.length);
              const rowHeight = Math.max(7, maxLines * 3.5 + 3);

              if (y + rowHeight > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
              if (rowIdx % 2 === 0) { doc.setFillColor(245, 248, 252); doc.rect(25, y, pageWidth - 50, rowHeight, "F"); }
              doc.setTextColor(...textColor);
              doc.text(nameLines, 28, y + 4);
              doc.text(ownerLines, 58, y + 4);
              doc.text(propLines, 88, y + 4);
              doc.text(monthsLines, 118, y + 4);
              doc.text(formatAmountWithCurrency(detail.amount), pageWidth - 30, y + 4, { align: "right" });
              y += rowHeight;
              rowIdx++;
            });

            // Subtotal row per property
            if (detailsByProperty.size > 1 || propGroup.details.length > 1) {
              if (y + 7 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
              doc.setFillColor(220, 230, 242);
              doc.rect(25, y, pageWidth - 50, 7, "F");
              doc.setTextColor(...primaryColor);
              doc.setFontSize(7);
              doc.setFont("helvetica", "bold");
              const subtotalLabel = propName.length > 30 ? propName.substring(0, 28) + "..." : propName;
              doc.text(`Sous-total : ${subtotalLabel}`, 28, y + 5);
              doc.text(formatAmountWithCurrency(propGroup.total), pageWidth - 30, y + 5, { align: "right" });
              y += 7;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              rowIdx++;
            }
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
            const labelLines = doc.splitTextToSize(detail.label, 78);
            const descLines = doc.splitTextToSize(detail.description, 45);
            const maxLines = Math.max(labelLines.length, descLines.length);
            const rowHeight = Math.max(7, maxLines * 3.5 + 3);
            if (y + rowHeight > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20; }
            if (j % 2 === 0) { doc.setFillColor(245, 248, 252); doc.rect(25, y, pageWidth - 50, rowHeight, "F"); }
            doc.setTextColor(...textColor);
            doc.text(labelLines, 28, y + 4);
            doc.text(descLines, 110, y + 4);
            doc.text(formatAmountWithCurrency(detail.amount), pageWidth - 30, y + 4, { align: "right" });
            y += rowHeight;
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
            // Always include these base methods even if no data
            const allMethods = new Set<string>(["especes", "mobile_money", "virement"]);
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
          // Custom 4-column renderer for cautions (Locataire, Propriétaire, Bien, Montant)
          let cy = y + 2;
          data.cautionsByManager.forEach((group) => {
            if (cy + 20 > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); cy = 20; }
            doc.setFillColor(26, 54, 93);
            doc.rect(25, cy, pageWidth - 50, 8, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.text(`Gestionnaire : ${group.managerName}`, 28, cy + 5.5);
            doc.text(`Total : ${formatAmountWithCurrency(group.total)}`, pageWidth - 30, cy + 5.5, { align: "right" });
            cy += 8;
            doc.setFillColor(230, 237, 245);
            doc.rect(25, cy, pageWidth - 50, 7, "F");
            doc.setTextColor(...primaryColor);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.text("Locataire", 28, cy + 5);
            doc.text("Propriétaire", 68, cy + 5);
            doc.text("Bien", 108, cy + 5);
            doc.text("Montant", pageWidth - 30, cy + 5, { align: "right" });
            cy += 7;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            group.details.forEach((detail, j) => {
              const lblLines = doc.splitTextToSize(detail.label, 36);
              const ownerLines = doc.splitTextToSize(detail.ownerName || "—", 36);
              const desc = detail.description.replace(" (Caution)", "");
              const descLines = doc.splitTextToSize(desc, 40);
              const maxLines = Math.max(lblLines.length, ownerLines.length, descLines.length);
              const rowHeight = Math.max(7, maxLines * 3.5 + 3);
              if (cy + rowHeight > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); cy = 20; }
              if (j % 2 === 0) { doc.setFillColor(245, 248, 252); doc.rect(25, cy, pageWidth - 50, rowHeight, "F"); }
              doc.setTextColor(...textColor);
              doc.text(lblLines, 28, cy + 4);
              doc.text(ownerLines, 68, cy + 4);
              doc.text(descLines, 108, cy + 4);
              doc.text(formatAmountWithCurrency(detail.amount), pageWidth - 30, cy + 4, { align: "right" });
              cy += rowHeight;
            });
            cy += 3;
          });
          y = cy;
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

  const saveExcelFile = async (wb: ExcelJS.Workbook, filename: string) => {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A365D" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const currencyFmt = '#,##0" F CFA"';

  const exportCompteResultatExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Compte de résultat");

      ws.columns = [
        { header: "Compte", key: "compte", width: 15 },
        { header: "Libellé", key: "libelle", width: 40 },
        { header: "Montant (F CFA)", key: "montant", width: 22 },
      ];

      // Style header
      ws.getRow(1).eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; });

      // Title row
      ws.addRow(["", "CLASSE 7 — PRODUITS", ""]);
      ws.lastRow!.getCell(2).font = { bold: true, size: 11 };

      const revenueRows = [
        { account: REVENUE_ACCOUNTS.loyers, amount: data.loyersEncaisses },
        { account: REVENUE_ACCOUNTS.cautions, amount: data.cautionsEncaissees },
        { account: REVENUE_ACCOUNTS.ventes, amount: data.ventesEncaissees },
        { account: REVENUE_ACCOUNTS.achats, amount: data.achatsEncaisses },
        { account: REVENUE_ACCOUNTS.lotissements, amount: data.lotissementsEncaisses },
      ].filter(r => r.amount > 0);

      revenueRows.forEach((r) => {
        const row = ws.addRow([r.account.syscohada, r.account.label, r.amount]);
        row.getCell(3).numFmt = currencyFmt;
      });

      const totalProdRow = ws.addRow(["", "TOTAL PRODUITS", totalRevenue]);
      totalProdRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; });
      totalProdRow.getCell(3).numFmt = currencyFmt;

      ws.addRow([]);
      ws.addRow(["", "CLASSE 6 — CHARGES", ""]);
      ws.lastRow!.getCell(2).font = { bold: true, size: 11 };

      data.expensesByCategory.forEach((cat) => {
        const info = getSyscohadaAccount(cat.name);
        const row = ws.addRow([info?.syscohada || "658", info?.label || cat.name, cat.value]);
        row.getCell(3).numFmt = currencyFmt;
      });

      const totalChargesRow = ws.addRow(["", "TOTAL CHARGES", data.totalExpenses]);
      totalChargesRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; });
      totalChargesRow.getCell(3).numFmt = currencyFmt;

      ws.addRow([]);
      const resultRow = ws.addRow(["", "RÉSULTAT NET", benefice]);
      resultRow.getCell(2).font = { bold: true, size: 12 };
      resultRow.getCell(3).numFmt = currencyFmt;
      resultRow.getCell(3).font = { bold: true, size: 12, color: { argb: benefice >= 0 ? "FF22C55E" : "FFEF4444" } };

      await saveExcelFile(wb, `compte-resultat-syscohada-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Compte de résultat Excel téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération Excel");
    }
  };

  const exportJournalExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Journal comptable");

      ws.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Compte", key: "compte", width: 12 },
        { header: "Libellé", key: "libelle", width: 40 },
        { header: "Débit (F CFA)", key: "debit", width: 20 },
        { header: "Crédit (F CFA)", key: "credit", width: 20 },
      ];

      ws.getRow(1).eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; });

      expenses.forEach((exp) => {
        const info = getSyscohadaAccount(exp.category);
        const date = new Date(exp.expense_date).toLocaleDateString("fr-FR");
        const creditAccount = exp.payment_method === "especes" ? "571" : "521";

        // Debit line
        const dr = ws.addRow([date, info?.syscohada || "658", exp.description, Number(exp.amount), ""]);
        dr.getCell(4).numFmt = currencyFmt;

        // Credit line
        const cr = ws.addRow(["", creditAccount, exp.description, "", Number(exp.amount)]);
        cr.getCell(5).numFmt = currencyFmt;
      });

      await saveExcelFile(wb, `journal-comptable-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Journal comptable Excel téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération Excel");
    }
  };

  const exportTresorerieExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Flux de trésorerie");

      ws.columns = [
        { header: "Mois", key: "mois", width: 12 },
        { header: "Loyers", key: "loyers", width: 16 },
        { header: "Ventes", key: "ventes", width: 16 },
        { header: "Achats", key: "achats", width: 16 },
        { header: "Lotissements", key: "lotissements", width: 16 },
        { header: "Cautions", key: "cautions", width: 16 },
        { header: "Total Entrées", key: "entrees", width: 18 },
        { header: "Dépenses", key: "depenses", width: 16 },
        { header: "Flux Net", key: "flux", width: 16 },
      ];

      ws.getRow(1).eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; });

      data.monthlyData.forEach((m) => {
        const entrees = m.loyers + m.ventes + m.achats + m.lotissements + m.cautions;
        const flux = entrees - m.depenses;
        const row = ws.addRow([m.name, m.loyers, m.ventes, m.achats, m.lotissements, m.cautions, entrees, m.depenses, flux]);
        for (let i = 2; i <= 9; i++) row.getCell(i).numFmt = currencyFmt;
        if (flux < 0) row.getCell(9).font = { color: { argb: "FFEF4444" } };
      });

      // Total row
      const totals = data.monthlyData.reduce((acc, m) => ({
        loyers: acc.loyers + m.loyers, ventes: acc.ventes + m.ventes, achats: acc.achats + m.achats,
        lotissements: acc.lotissements + m.lotissements, cautions: acc.cautions + m.cautions, depenses: acc.depenses + m.depenses,
      }), { loyers: 0, ventes: 0, achats: 0, lotissements: 0, cautions: 0, depenses: 0 });

      const totalRow = ws.addRow(["TOTAL", totals.loyers, totals.ventes, totals.achats, totals.lotissements, totals.cautions, totalRevenue, data.totalExpenses, benefice]);
      totalRow.eachCell((cell) => { cell.fill = headerFill; cell.font = headerFont; });
      for (let i = 2; i <= 9; i++) totalRow.getCell(i).numFmt = currencyFmt;

      await saveExcelFile(wb, `tresorerie-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Flux de trésorerie Excel téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération Excel");
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
          Compte de résultat (PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJournal} className="gap-2">
          <FileText className="h-4 w-4" />
          Journal comptable (PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTresorerie} className="gap-2">
          <FileText className="h-4 w-4" />
          Flux de trésorerie (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportCompteResultatExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Compte de résultat (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJournalExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Journal comptable (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTresorerieExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Flux de trésorerie (Excel)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
