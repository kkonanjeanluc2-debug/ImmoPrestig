import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Users,
  TrendingUp,
  Building2,
  Wallet,
  Target,
  BarChart3,
  Loader2,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  ShoppingCart,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useActivityReport, useAllManagersReport, ActivityReportData } from "@/hooks/useActivityReport";
import { generateSingleActivityReport, generateConsolidatedReport } from "@/lib/activityReportPDF";
import { useAgency } from "@/hooks/useAgency";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { useIsAgencyOwner } from "@/hooks/useAssignableUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function getPeriodOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = subMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    options.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: fr }),
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    });
  }
  return options;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}

function ManagerReportCard({
  report,
  onExport,
  isExporting,
}: {
  report: ActivityReportData;
  onExport: () => void;
  isExporting: boolean;
}) {
  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrateur",
    gestionnaire: "Commercial",
    comptable: "Comptable",
    caissiere: "Caissière",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {report.userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            </div>
            <div>
              <CardTitle className="text-base">{report.userName}</CardTitle>
              <Badge variant="outline" className="text-[10px] mt-1">
                {ROLE_LABELS[report.role] || report.role}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">PDF</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{report.prospectsContacted}</p>
            <p className="text-[10px] text-muted-foreground">Prospects</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{report.ventesConclues + report.parcellesVendues}</p>
            <p className="text-[10px] text-muted-foreground">Ventes</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{report.contratsSignes}</p>
            <p className="text-[10px] text-muted-foreground">Contrats</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-emerald font-bold">{report.tauxConversion}%</p>
            <p className="text-[10px] text-muted-foreground">Conversion</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Loyers encaissés</span>
            <span className="font-medium">{report.loyersEncaisses.toLocaleString("fr-FR")} F CFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant recouvré</span>
            <span className="font-medium">{report.montantRecouvre.toLocaleString("fr-FR")} F CFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Impayés suivis</span>
            <span className="font-medium text-destructive">{report.impayesSuivis}</span>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Total revenus générés</span>
            <span className="text-lg font-bold text-primary">
              {report.totalRevenue.toLocaleString("fr-FR")} F CFA
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Rapports() {
  const navigate = useNavigate();
  const periodOptions = useMemo(() => getPeriodOptions(), []);
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[0].value);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const period = periodOptions.find((p) => p.value === selectedPeriod)!;
  const { data: agency } = useAgency();
  const { data: roleData } = useCurrentUserRole();
  const { isOwner: isAgencyOwner } = useIsAgencyOwner();
  const { hasPermission, role, isLoading: permLoading } = usePermissions();

  const isAdmin = roleData?.role === "admin" || roleData?.role === "super_admin" || isAgencyOwner;
  const isGestionnaire = roleData?.role === "gestionnaire";

  // Permission guard
  useEffect(() => {
    if (!permLoading && !isAdmin && !hasPermission("can_view_reports")) {
      toast.error("Vous n'avez pas la permission d'accéder aux rapports");
      navigate("/dashboard", { replace: true });
    }
  }, [permLoading, isAdmin, hasPermission, navigate]);

  // Individual report for gestionnaires
  const { data: myReport, isLoading: myReportLoading } = useActivityReport(
    period.from,
    period.to
  );

  // All managers report for admins
  const { data: allReports, isLoading: allReportsLoading } = useAllManagersReport(
    isAdmin ? period.from : "",
    isAdmin ? period.to : ""
  );

  const handleExportSingle = async (report: ActivityReportData) => {
    setIsExporting(report.userId);
    try {
      await generateSingleActivityReport(report, period.label, agency);
      toast.success("Rapport PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
    setIsExporting(null);
  };

  const handleExportConsolidated = async () => {
    if (!allReports?.length) return;
    setIsExporting("all");
    try {
      await generateConsolidatedReport(allReports, period.label, agency);
      toast.success("Rapport général PDF téléchargé");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
    setIsExporting(null);
  };

  const isLoading = myReportLoading || (isAdmin && allReportsLoading);

  // Summary totals for admin
  const totals = useMemo(() => {
    if (!allReports?.length) return null;
    return {
      prospects: allReports.reduce((s, r) => s + r.prospectsContacted, 0),
      ventes: allReports.reduce((s, r) => s + r.ventesConclues + r.parcellesVendues, 0),
      contrats: allReports.reduce((s, r) => s + r.contratsSignes, 0),
      loyers: allReports.reduce((s, r) => s + r.loyersEncaisses, 0),
      recouvre: allReports.reduce((s, r) => s + r.montantRecouvre, 0),
      impayes: allReports.reduce((s, r) => s + r.impayesSuivis, 0),
      total: allReports.reduce((s, r) => s + r.totalRevenue, 0),
      conversion: allReports.length > 0
        ? Math.round(allReports.reduce((s, r) => s + r.tauxConversion, 0) / allReports.length)
        : 0,
    };
  }, [allReports]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Rapports d'activité
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isAdmin
                ? "Suivi de la performance de votre équipe"
                : "Suivez vos performances et votre activité"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="capitalize">{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && allReports && allReports.length > 0 && (
              <Button onClick={handleExportConsolidated} disabled={isExporting === "all"}>
                {isExporting === "all" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Rapport général
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <>
            {/* Admin view: Summary + all managers */}
            {isAdmin && totals && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Target} label="Prospects" value={totals.prospects} color="bg-blue-500" />
                  <StatCard icon={Building2} label="Ventes" value={totals.ventes} color="bg-emerald-500" />
                  <StatCard icon={FileText} label="Contrats" value={totals.contrats} color="bg-violet-500" />
                  <StatCard
                    icon={Wallet}
                    label="Revenus totaux"
                    value={`${totals.total.toLocaleString("fr-FR")} F`}
                    color="bg-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    icon={CheckCircle}
                    label="Loyers encaissés"
                    value={`${totals.loyers.toLocaleString("fr-FR")} F`}
                    color="bg-green-500"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Montant recouvré"
                    value={`${totals.recouvre.toLocaleString("fr-FR")} F`}
                    color="bg-teal-500"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    label="Impayés suivis"
                    value={totals.impayes}
                    color="bg-red-500"
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Détail par membre
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {allReports?.map((report) => (
                      <ManagerReportCard
                        key={report.userId}
                        report={report}
                        onExport={() => handleExportSingle(report)}
                        isExporting={isExporting === report.userId}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Gestionnaire view: own report */}
            {!isAdmin && myReport && (
              <ManagerReportCard
                report={myReport}
                onExport={() => handleExportSingle(myReport)}
                isExporting={isExporting === myReport.userId}
              />
            )}

            {/* Empty state */}
            {!isAdmin && !myReport && !isLoading && (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Aucune donnée d'activité pour cette période
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
