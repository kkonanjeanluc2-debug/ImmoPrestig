import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { FileDown, Loader2, Calendar } from "lucide-react";
import { useAllTransactions } from "@/hooks/useTransactions";
import { useAllAgencies } from "@/hooks/useSuperAdmin";
import { toast } from "sonner";

// Generate last 12 months options
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(now, i);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: fr }),
      date,
    });
  }
  return options;
}

export function MonthlyReportPDF() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions } = useAllTransactions();
  const { data: agencies } = useAllAgencies();

  const monthOptions = getMonthOptions();

  const generateReport = async () => {
    if (!transactions || !agencies) {
      toast.error("Données non disponibles");
      return;
    }

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const now = new Date();
      
      // Parse selected month
      const [year, month] = selectedMonth.split("-").map(Number);
      const selectedDate = new Date(year, month - 1, 1);
      const reportMonth = format(selectedDate, "MMMM yyyy", { locale: fr });
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      // Calculate monthly stats
      const monthlyTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.created_at);
        return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      });

      const completedTx = monthlyTransactions.filter(tx => tx.status === "completed");
      const pendingTx = monthlyTransactions.filter(tx => tx.status === "pending");
      const failedTx = monthlyTransactions.filter(tx => tx.status === "failed");

      const monthlyRevenue = completedTx.reduce((sum, tx) => sum + tx.amount, 0);
      const avgTransaction = completedTx.length > 0 ? Math.round(monthlyRevenue / completedTx.length) : 0;

      // Previous month comparison
      const prevMonthDate = subMonths(selectedDate, 1);
      const prevMonthStart = startOfMonth(prevMonthDate);
      const prevMonthEnd = endOfMonth(prevMonthDate);
      const prevMonthTx = transactions.filter(tx => {
        if (tx.status !== "completed") return false;
        const txDate = new Date(tx.created_at);
        return isWithinInterval(txDate, { start: prevMonthStart, end: prevMonthEnd });
      });
      const prevMonthRevenue = prevMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
      const growthRate = prevMonthRevenue > 0 
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)
        : "N/A";

      // Revenue by payment method
      const byMethod: Record<string, number> = {};
      completedTx.forEach(tx => {
        byMethod[tx.payment_method] = (byMethod[tx.payment_method] || 0) + tx.amount;
      });

      // Revenue by plan
      const byPlan: Record<string, number> = {};
      completedTx.forEach(tx => {
        const planName = tx.plan?.name || "Inconnu";
        byPlan[planName] = (byPlan[planName] || 0) + tx.amount;
      });

      // Agency stats (as of selected month end)
      const activeAgencies = agencies.filter(a => a.is_active).length;
      const newAgencies = agencies.filter(a => {
        const createdAt = new Date(a.created_at);
        return isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
      }).length;

      const totalProperties = agencies.reduce((sum, a) => sum + (a.stats?.properties_count || 0), 0);
      const totalTenants = agencies.reduce((sum, a) => sum + (a.stats?.tenants_count || 0), 0);

      // Payment method labels
      const methodLabels: Record<string, string> = {
        orange_money: "Orange Money",
        mtn_money: "MTN Money",
        wave: "Wave",
        moov: "Moov Money",
        card: "Carte bancaire",
      };

      // ==================== PDF Generation ====================
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFillColor(30, 58, 95); // Navy color
      doc.rect(0, 0, pageWidth, 45, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT MENSUEL", pageWidth / 2, 22, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(reportMonth.toUpperCase(), pageWidth / 2, 35, { align: "center" });

      y = 60;

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Generation info
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${format(now, "dd MMMM yyyy à HH:mm", { locale: fr })}`, margin, y);
      y += 15;

      // ==================== Revenue Section ====================
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REVENUS", margin, y);
      y += 8;

      doc.setDrawColor(46, 204, 113);
      doc.setLineWidth(2);
      doc.line(margin, y, margin + 40, y);
      y += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      const revenueData = [
        ["Revenus du mois", `${monthlyRevenue.toLocaleString("fr-FR")} XOF`],
        ["Mois précédent", `${prevMonthRevenue.toLocaleString("fr-FR")} XOF`],
        ["Croissance", `${growthRate}%`],
        ["Panier moyen", `${avgTransaction.toLocaleString("fr-FR")} XOF`],
      ];

      revenueData.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - margin, y, { align: "right" });
        y += 8;
      });

      y += 10;

      // ==================== Transactions Section ====================
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("TRANSACTIONS", margin, y);
      y += 8;

      doc.setDrawColor(52, 152, 219);
      doc.setLineWidth(2);
      doc.line(margin, y, margin + 40, y);
      y += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);

      const txData = [
        ["Total transactions", monthlyTransactions.length.toString()],
        ["Réussies", completedTx.length.toString()],
        ["En attente", pendingTx.length.toString()],
        ["Échouées", failedTx.length.toString()],
        ["Taux de succès", monthlyTransactions.length > 0 
          ? `${Math.round((completedTx.length / monthlyTransactions.length) * 100)}%` 
          : "N/A"],
      ];

      txData.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - margin, y, { align: "right" });
        y += 8;
      });

      y += 10;

      // ==================== Payment Methods Section ====================
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REVENUS PAR MODE DE PAIEMENT", margin, y);
      y += 8;

      doc.setDrawColor(241, 196, 15);
      doc.setLineWidth(2);
      doc.line(margin, y, margin + 40, y);
      y += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);

      Object.entries(byMethod)
        .sort((a, b) => b[1] - a[1])
        .forEach(([method, amount]) => {
          const label = methodLabels[method] || method;
          doc.setFont("helvetica", "normal");
          doc.text(label, margin, y);
          doc.setFont("helvetica", "bold");
          doc.text(`${amount.toLocaleString("fr-FR")} XOF`, pageWidth - margin, y, { align: "right" });
          y += 8;
        });

      if (Object.keys(byMethod).length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(128, 128, 128);
        doc.text("Aucune transaction ce mois", margin, y);
        y += 8;
      }

      y += 10;

      // ==================== Plans Section ====================
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REVENUS PAR FORFAIT", margin, y);
      y += 8;

      doc.setDrawColor(155, 89, 182);
      doc.setLineWidth(2);
      doc.line(margin, y, margin + 40, y);
      y += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);

      Object.entries(byPlan)
        .sort((a, b) => b[1] - a[1])
        .forEach(([plan, amount]) => {
          doc.setFont("helvetica", "normal");
          doc.text(plan, margin, y);
          doc.setFont("helvetica", "bold");
          doc.text(`${amount.toLocaleString("fr-FR")} XOF`, pageWidth - margin, y, { align: "right" });
          y += 8;
        });

      if (Object.keys(byPlan).length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(128, 128, 128);
        doc.text("Aucune transaction ce mois", margin, y);
        y += 8;
      }

      y += 10;

      // ==================== Platform Stats Section ====================
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("STATISTIQUES PLATEFORME", margin, y);
      y += 8;

      doc.setDrawColor(46, 204, 113);
      doc.setLineWidth(2);
      doc.line(margin, y, margin + 40, y);
      y += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);

      const platformData = [
        ["Total agences", agencies.length.toString()],
        ["Agences actives", activeAgencies.toString()],
        ["Nouvelles inscriptions (ce mois)", newAgencies.toString()],
        ["Total biens gérés", totalProperties.toString()],
        ["Total locataires", totalTenants.toString()],
      ];

      platformData.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, pageWidth - margin, y, { align: "right" });
        y += 8;
      });

      // ==================== Footer ====================
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(245, 245, 245);
      doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        "Ce rapport est généré automatiquement par la plateforme de gestion immobilière.",
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      // Save the PDF
      const fileName = `rapport-mensuel-${selectedMonth}.pdf`;
      doc.save(fileName);

      toast.success("Rapport PDF téléchargé avec succès");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du rapport");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-[180px]">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Sélectionner un mois" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="capitalize">{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        onClick={generateReport}
        disabled={isGenerating || !transactions || !agencies}
        variant="outline"
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        Télécharger PDF
      </Button>
    </div>
  );
}
