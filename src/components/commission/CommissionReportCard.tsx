import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Percent, 
  TrendingUp, 
  Download, 
  Calendar,
  Building2,
  Users,
  Banknote,
  FileText,
  Loader2
} from "lucide-react";
import { useCommissions } from "@/hooks/useCommissions";
import { useAgency } from "@/hooks/useAgency";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

export function CommissionReportCard() {
  const [dateRange, setDateRange] = useState<"month" | "quarter" | "year" | "custom">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { data: agency } = useAgency();

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfMonth(now);

    switch (dateRange) {
      case "month":
        start = startOfMonth(now);
        break;
      case "quarter":
        start = startOfMonth(subMonths(now, 2));
        break;
      case "year":
        start = startOfMonth(subMonths(now, 11));
        break;
      case "custom":
        return {
          startDate: customStart || undefined,
          endDate: customEnd || undefined,
        };
      default:
        start = startOfMonth(now);
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, [dateRange, customStart, customEnd]);

  const report = useCommissions(startDate, endDate);

  const formatCurrency = (value: number) =>
    value.toLocaleString("fr-FR") + " F CFA";

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT DE COMMISSIONS", pageWidth / 2, y, { align: "center" });
      y += 10;

      // Agency info
      if (agency) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(agency.name, pageWidth / 2, y, { align: "center" });
        y += 6;
      }

      // Period
      doc.setFontSize(10);
      doc.setTextColor(100);
      const periodLabel = startDate && endDate 
        ? `Période: ${format(new Date(startDate), "dd MMMM yyyy", { locale: fr })} - ${format(new Date(endDate), "dd MMMM yyyy", { locale: fr })}`
        : "Toutes périodes";
      doc.text(periodLabel, pageWidth / 2, y, { align: "center" });
      y += 15;

      // Summary box
      doc.setFillColor(240, 240, 240);
      doc.rect(15, y, pageWidth - 30, 30, "F");
      y += 10;

      doc.setTextColor(0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      
      const col1 = 25;
      const col2 = 80;
      const col3 = 140;

      doc.text("Total loyers encaissés", col1, y);
      doc.text("Total commissions", col2, y);
      doc.text("Nombre de paiements", col3, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.text(formatCurrency(report.totalRent), col1, y);
      doc.text(formatCurrency(report.totalCommission), col2, y);
      doc.text(report.paymentCount.toString(), col3, y);
      y += 20;

      // Commissions by owner
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Commissions par propriétaire", 15, y);
      y += 10;

      // Table header
      doc.setFontSize(9);
      doc.setFillColor(230, 230, 230);
      doc.rect(15, y - 4, pageWidth - 30, 8, "F");
      
      doc.text("Propriétaire", 17, y);
      doc.text("Type", 60, y);
      doc.text("%", 100, y);
      doc.text("Loyers", 115, y);
      doc.text("Commission", 150, y);
      y += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      for (const owner of report.byOwner) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(owner.ownerName.substring(0, 20), 17, y);
        doc.text(owner.managementTypeName.substring(0, 15), 60, y);
        doc.text(owner.commissionPercentage + "%", 100, y);
        doc.text(formatCurrency(owner.totalRent), 115, y);
        doc.text(formatCurrency(owner.totalCommission), 150, y);
        y += 7;
      }

      y += 10;

      // Detail section
      if (report.commissions.length > 0) {
        doc.addPage();
        y = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Détail des paiements", 15, y);
        y += 10;

        doc.setFontSize(8);
        doc.setFillColor(230, 230, 230);
        doc.rect(15, y - 4, pageWidth - 30, 8, "F");
        
        doc.text("Date", 17, y);
        doc.text("Locataire", 40, y);
        doc.text("Bien", 80, y);
        doc.text("Loyer", 120, y);
        doc.text("Commission", 150, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        for (const commission of report.commissions.slice(0, 50)) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.text(format(new Date(commission.paymentDate), "dd/MM/yy"), 17, y);
          doc.text(commission.tenantName.substring(0, 18), 40, y);
          doc.text(commission.propertyTitle.substring(0, 18), 80, y);
          doc.text(commission.rentAmount.toLocaleString("fr-FR"), 120, y);
          doc.text(commission.commissionAmount.toLocaleString("fr-FR"), 150, y);
          y += 6;
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}`,
        pageWidth / 2,
        285,
        { align: "center" }
      );

      doc.save(`rapport-commissions-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Rapport de commissions
            </CardTitle>
            <CardDescription>
              Suivi des commissions de gestion par propriétaire
            </CardDescription>
          </div>
          <Button onClick={generatePDF} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exporter PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period selector */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Période</Label>
            <div className="flex gap-2">
              {[
                { value: "month", label: "Ce mois" },
                { value: "quarter", label: "3 mois" },
                { value: "year", label: "12 mois" },
                { value: "custom", label: "Personnalisé" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={dateRange === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateRange(option.value as typeof dateRange)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          {dateRange === "custom" && (
            <div className="flex gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Du</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Au</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-36"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">{formatCurrency(report.totalRent)}</p>
                  <p className="text-xs text-muted-foreground">Loyers encaissés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald/10 border-emerald/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald" />
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald">{formatCurrency(report.totalCommission)}</p>
                  <p className="text-xs text-muted-foreground">Commissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy/10 rounded-lg">
                  <FileText className="h-5 w-5 text-navy" />
                </div>
                <div>
                  <p className="text-lg font-bold">{report.paymentCount}</p>
                  <p className="text-xs text-muted-foreground">Paiements</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sand/50 rounded-lg">
                  <Users className="h-5 w-5 text-navy" />
                </div>
                <div>
                  <p className="text-lg font-bold">{report.byOwner.length}</p>
                  <p className="text-xs text-muted-foreground">Propriétaires</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for details */}
        <Tabs defaultValue="byOwner" className="w-full">
          <TabsList>
            <TabsTrigger value="byOwner">Par propriétaire</TabsTrigger>
            <TabsTrigger value="details">Détail des paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="byOwner" className="mt-4">
            {report.byOwner.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune commission sur cette période
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>Type de gestion</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-right">Loyers</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byOwner.map((owner) => (
                      <TableRow key={owner.ownerId}>
                        <TableCell className="font-medium">{owner.ownerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{owner.managementTypeName}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{owner.commissionPercentage}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(owner.totalRent)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald">
                          {formatCurrency(owner.totalCommission)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            {report.commissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun paiement sur cette période
              </div>
            ) : (
              <div className="rounded-lg border max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Locataire</TableHead>
                      <TableHead>Bien</TableHead>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead className="text-right">Loyer</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.commissions.map((c) => (
                      <TableRow key={c.paymentId}>
                        <TableCell className="text-sm">
                          {format(new Date(c.paymentDate), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{c.tenantName}</TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {c.propertyTitle}
                        </TableCell>
                        <TableCell>{c.ownerName}</TableCell>
                        <TableCell className="text-right">
                          {c.rentAmount.toLocaleString("fr-FR")} F
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald">
                          {c.commissionAmount.toLocaleString("fr-FR")} F
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
