import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { ComptabiliteData, MonthlyEntry } from "@/hooks/useComptabilite";
import { Expense, getSyscohadaAccount, REVENUE_ACCOUNTS } from "@/hooks/useExpenses";
import { toast } from "sonner";

interface Props {
  data: ComptabiliteData;
  totalRevenue: number;
  expenses: Expense[];
  periodLabel: string;
}

function formatNumber(n: number) {
  return n.toLocaleString("fr-FR");
}

function downloadCSV(content: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Export ${filename} téléchargé`);
}

export function ExportComptabilite({ data, totalRevenue, expenses, periodLabel }: Props) {
  const benefice = totalRevenue - data.totalExpenses;

  const exportCompteResultat = () => {
    const lines: string[] = [];
    lines.push("Compte de Résultat SYSCOHADA");
    lines.push(`Période;${periodLabel}`);
    lines.push("");
    lines.push("Compte SYSCOHADA;Libellé;Montant (F CFA)");
    lines.push("");
    lines.push("=== CLASSE 7 - PRODUITS ===;;");

    if (data.loyersEncaisses > 0) lines.push(`${REVENUE_ACCOUNTS.loyers.syscohada};${REVENUE_ACCOUNTS.loyers.label};${formatNumber(data.loyersEncaisses)}`);
    if (data.ventesEncaissees > 0) lines.push(`${REVENUE_ACCOUNTS.ventes.syscohada};${REVENUE_ACCOUNTS.ventes.label};${formatNumber(data.ventesEncaissees)}`);
    if (data.achatsEncaisses > 0) lines.push(`${REVENUE_ACCOUNTS.achats.syscohada};${REVENUE_ACCOUNTS.achats.label};${formatNumber(data.achatsEncaisses)}`);
    if (data.lotissementsEncaisses > 0) lines.push(`${REVENUE_ACCOUNTS.lotissements.syscohada};${REVENUE_ACCOUNTS.lotissements.label};${formatNumber(data.lotissementsEncaisses)}`);

    lines.push(`;TOTAL PRODUITS;${formatNumber(totalRevenue)}`);
    lines.push("");
    lines.push("=== CLASSE 6 - CHARGES ===;;");

    data.expensesByCategory.forEach((cat) => {
      const info = getSyscohadaAccount(cat.name);
      lines.push(`${info?.syscohada || "658"};${info?.label || cat.name};${formatNumber(cat.value)}`);
    });

    lines.push(`;TOTAL CHARGES;${formatNumber(data.totalExpenses)}`);
    lines.push("");
    lines.push(`;RÉSULTAT NET;${formatNumber(benefice)}`);

    downloadCSV(lines.join("\n"), `compte-resultat-syscohada-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportJournal = () => {
    const lines: string[] = [];
    lines.push("Journal Comptable - Écritures");
    lines.push(`Période;${periodLabel}`);
    lines.push("");
    lines.push("Date;Compte;Libellé;Débit (F CFA);Crédit (F CFA);Mode paiement");

    // Export expenses as journal entries
    expenses.forEach((exp) => {
      const info = getSyscohadaAccount(exp.category);
      const date = new Date(exp.expense_date).toLocaleDateString("fr-FR");
      // Débit: compte de charge
      lines.push(`${date};${info?.syscohada || "658"};${exp.description};${formatNumber(Number(exp.amount))};;${exp.payment_method || ""}`);
      // Crédit: trésorerie (521 = Banque ou 571 = Caisse)
      const creditAccount = exp.payment_method === "especes" ? "571" : "521";
      lines.push(`${date};${creditAccount};${exp.description};;${formatNumber(Number(exp.amount))};${exp.payment_method || ""}`);
    });

    downloadCSV(lines.join("\n"), `journal-comptable-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportTresorerie = () => {
    const lines: string[] = [];
    lines.push("Flux de Trésorerie");
    lines.push(`Période;${periodLabel}`);
    lines.push("");
    lines.push("Mois;Loyers;Ventes Immo.;Achats Immo.;Lotissements;Total Entrées;Dépenses;Flux Net;Solde Cumulé");

    let cumul = 0;
    data.monthlyData.forEach((m) => {
      const entrees = m.loyers + m.ventes + m.achats + m.lotissements;
      const flux = entrees - m.depenses;
      cumul += flux;
      lines.push(`${m.name};${formatNumber(m.loyers)};${formatNumber(m.ventes)};${formatNumber(m.achats)};${formatNumber(m.lotissements)};${formatNumber(entrees)};${formatNumber(m.depenses)};${formatNumber(flux)};${formatNumber(cumul)}`);
    });

    lines.push(`Total;${formatNumber(data.monthlyData.reduce((s, r) => s + r.loyers, 0))};${formatNumber(data.monthlyData.reduce((s, r) => s + r.ventes, 0))};${formatNumber(data.monthlyData.reduce((s, r) => s + r.achats, 0))};${formatNumber(data.monthlyData.reduce((s, r) => s + r.lotissements, 0))};${formatNumber(totalRevenue)};${formatNumber(data.totalExpenses)};${formatNumber(benefice)};${formatNumber(benefice)}`);

    downloadCSV(lines.join("\n"), `tresorerie-${new Date().toISOString().split("T")[0]}.csv`);
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
          <FileSpreadsheet className="h-4 w-4" />
          Compte de résultat (SYSCOHADA)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJournal} className="gap-2">
          <FileText className="h-4 w-4" />
          Journal comptable
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportTresorerie} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Flux de trésorerie
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
