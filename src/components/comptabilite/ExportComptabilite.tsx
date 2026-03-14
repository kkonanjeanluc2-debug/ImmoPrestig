import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText } from "lucide-react";
import { ComptabiliteData } from "@/hooks/useComptabilite";
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
        { account: REVENUE_ACCOUNTS.ventes, amount: data.ventesEncaissees },
        { account: REVENUE_ACCOUNTS.achats, amount: data.achatsEncaisses },
        { account: REVENUE_ACCOUNTS.lotissements, amount: data.lotissementsEncaisses },
      ].filter(r => r.amount > 0);

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
      const cols = [18, 38, 60, 80, 100, 122, 145, 165];
      doc.setFillColor(...primaryColor);
      doc.rect(15, y, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text("Mois", cols[0], y + 5.5);
      doc.text("Loyers", cols[1], y + 5.5);
      doc.text("Ventes", cols[2], y + 5.5);
      doc.text("Achats", cols[3], y + 5.5);
      doc.text("Lotissem.", cols[4], y + 5.5);
      doc.text("Entrées", cols[5], y + 5.5);
      doc.text("Dépenses", cols[6], y + 5.5);
      doc.text("Flux Net", cols[7], y + 5.5);
      y += 8;

      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      let cumul = 0;
      data.monthlyData.forEach((m, i) => {
        const entrees = m.loyers + m.ventes + m.achats + m.lotissements;
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
        doc.text(formatAmountForPDF(entrees), cols[5], y + 6);
        doc.setTextColor(...dangerColor);
        doc.text(formatAmountForPDF(m.depenses), cols[6], y + 6);
        if (flux >= 0) doc.setTextColor(...successColor);
        else doc.setTextColor(...dangerColor);
        doc.text(formatAmountForPDF(flux), cols[7], y + 6);
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
      doc.text(formatAmountForPDF(totalEntrees), cols[5], y + 6);
      doc.text(formatAmountForPDF(data.totalExpenses), cols[6], y + 6);
      doc.text(formatAmountForPDF(benefice), cols[7], y + 6);
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
