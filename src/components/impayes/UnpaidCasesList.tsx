import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Search,
  Eye,
  FileText,
  Loader2,
  Plus,
  Scale,
  Gavel,
  CheckCircle,
  Clock,
  Mail,
  Filter,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnpaidCases, STATUS_LABELS, type UnpaidCase } from "@/hooks/useUnpaidCases";
import { usePayments } from "@/hooks/usePayments";
import { usePermissions } from "@/hooks/usePermissions";
import { UnpaidCaseDetailDialog } from "./UnpaidCaseDetailDialog";
import { CreateUnpaidCaseDialog } from "./CreateUnpaidCaseDialog";
import { differenceInDays } from "date-fns";

const STATUS_CONFIG: Record<string, { icon: typeof AlertTriangle; className: string }> = {
  detected: { icon: AlertTriangle, className: "bg-red-500/10 text-red-500 border-red-500/20" },
  reminded: { icon: Mail, className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  formal_notice: { icon: FileText, className: "bg-amber-500/10 text-amber-600 border-amber-600/20" },
  legal_proceedings: { icon: Scale, className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  awaiting_judgment: { icon: Clock, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  eviction_validated: { icon: Gavel, className: "bg-red-600/10 text-red-600 border-red-600/20" },
  eviction_executed: { icon: Gavel, className: "bg-red-700/10 text-red-700 border-red-700/20" },
  eviction_cancelled: { icon: CheckCircle, className: "bg-emerald/10 text-emerald border-emerald/20" },
  resolved: { icon: CheckCircle, className: "bg-emerald/10 text-emerald border-emerald/20" },
};

interface DetectedLatePayment {
  tenantName: string;
  propertyTitle: string;
  totalAmount: number;
  maxDaysLate: number;
  earliestDueDate: string;
  tenantId: string;
  propertyId: string | null;
  payments: { id: string; amount: number; dueDate: string }[];
}

export function UnpaidCasesList() {
  const { data: cases, isLoading } = useUnpaidCases();
  const { data: payments, isLoading: isLoadingPayments } = usePayments();
  const { hasPermission } = usePermissions();
  const canViewImpayes = hasPermission("can_view_impayes");
  const canCreateImpayes = hasPermission("can_create_impayes");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState<UnpaidCase | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [preselectedTenantId, setPreselectedTenantId] = useState<string | null>(null);

  // Auto-detect late payments not yet converted to unpaid cases
  const latePaymentsDetected = useMemo<DetectedLatePayment[]>(() => {
    if (!payments) return [];
    const existingPaymentIds = new Set((cases || []).map(c => c.payment_id).filter(Boolean));
    const tenantIdsWithCase = new Set((cases || []).map(c => c.tenant_id));
    
    const latePayments = payments.filter(p => {
      if (existingPaymentIds.has(p.id)) return false;
      if (tenantIdsWithCase.has(p.tenant_id)) return false;
      if (p.status === "paid" || p.status === "cancelled") return false;
      return new Date(p.due_date) < new Date();
    });

    // Group by tenant
    const grouped = new Map<string, DetectedLatePayment>();
    for (const p of latePayments) {
      const tenant = p.tenant as any;
      const daysLate = Math.max(0, differenceInDays(new Date(), new Date(p.due_date)));
      const existing = grouped.get(p.tenant_id);
      if (existing) {
        existing.totalAmount += Number(p.amount);
        existing.maxDaysLate = Math.max(existing.maxDaysLate, daysLate);
        if (p.due_date < existing.earliestDueDate) existing.earliestDueDate = p.due_date;
        existing.payments.push({ id: p.id, amount: Number(p.amount), dueDate: p.due_date });
      } else {
        grouped.set(p.tenant_id, {
          tenantName: tenant?.name || "Locataire inconnu",
          propertyTitle: tenant?.property?.title || "Bien non assigné",
          totalAmount: Number(p.amount),
          maxDaysLate: daysLate,
          earliestDueDate: p.due_date,
          tenantId: p.tenant_id,
          propertyId: tenant?.property_id || null,
          payments: [{ id: p.id, amount: Number(p.amount), dueDate: p.due_date }],
        });
      }
    }
    return Array.from(grouped.values());
  }, [payments, cases]);

  const filteredCases = (cases || []).filter((c) => {
    const tenantName = c.tenant?.name || "";
    const propertyTitle = c.tenant?.property?.title || c.property?.title || "";
    const matchesSearch =
      tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propertyTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredDetected = latePaymentsDetected.filter(p => {
    if (statusFilter !== "all" && statusFilter !== "detected_auto") return false;
    return p.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Stats
  const totalCaseAmount = (cases || []).filter(c => c.status !== "resolved").reduce((s, c) => s + Number(c.amount_due), 0);
  const totalDetectedAmount = latePaymentsDetected.reduce((s, p) => s + p.totalAmount, 0);
  const totalAmount = totalCaseAmount + totalDetectedAmount;
  const activeCount = (cases || []).filter(c => !["resolved", "eviction_cancelled"].includes(c.status)).length;
  const detectedCount = latePaymentsDetected.length;
  const formalNoticeCount = (cases || []).filter(c => ["formal_notice", "legal_proceedings", "awaiting_judgment"].includes(c.status)).length;

  const loading = isLoading || isLoadingPayments;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Impayés détectés</p>
              <p className="text-xl font-bold">{detectedCount}</p>
              {detectedCount > 0 && (
                <p className="text-xs text-orange-500 font-medium">
                  {totalDetectedAmount.toLocaleString("fr-FR")} F CFA
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dossiers actifs</p>
              <p className="text-xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Scale className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En procédure</p>
              <p className="text-xl font-bold">{formalNoticeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <FileText className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Montant total impayé</p>
              <p className="text-xl font-bold text-destructive">{totalAmount.toLocaleString("fr-FR")} F CFA</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un locataire..."
              className="pl-10 h-9 w-full sm:w-52"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="detected_auto">🔍 Détectés automatiquement</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreateImpayes && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau dossier
          </Button>
        )}
      </div>

      {/* Auto-detected late payments */}
      {filteredDetected.length > 0 && (statusFilter === "all" || statusFilter === "detected_auto") && (
        <Card className="border-orange-500/30">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border bg-orange-500/5 rounded-t-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-600">
                  Impayés détectés automatiquement ({filteredDetected.length})
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Paiements en retard non encore convertis en dossier de recouvrement
              </p>
            </div>
            <div className="divide-y divide-border">
              {filteredDetected.map((item) => (
                <div
                  key={item.tenantId}
                  className="p-4 sm:p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{item.tenantName}</p>
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">
                            Non traité
                          </Badge>
                          {item.payments.length > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {item.payments.length} paiements
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.propertyTitle}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="text-orange-500 font-medium">{item.maxDaysLate} jour{item.maxDaysLate > 1 ? "s" : ""} de retard</span>
                          <span>•</span>
                          <span>Échéance : {new Date(item.earliestDueDate).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-11 sm:pl-0">
                      <span className="text-lg font-bold text-destructive whitespace-nowrap">
                        {item.totalAmount.toLocaleString("fr-FR")} F CFA
                      </span>
                      {canCreateImpayes && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setPreselectedTenantId(item.tenantId);
                            setShowCreateDialog(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Créer dossier
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing cases list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCases.length === 0 && filteredDetected.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {(cases?.length === 0 && latePaymentsDetected.length === 0) ? "Aucun dossier d'impayé" : "Aucun résultat trouvé"}
            </p>
          </CardContent>
        </Card>
      ) : filteredCases.length > 0 ? (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {filteredCases.map((unpaidCase) => {
              const config = STATUS_CONFIG[unpaidCase.status] || STATUS_CONFIG.detected;
              const StatusIcon = config.icon;
              const tenantName = unpaidCase.tenant?.name || "Locataire inconnu";
              const propertyTitle = unpaidCase.tenant?.property?.title || unpaidCase.property?.title || "Bien non assigné";

              return (
                <div
                  key={unpaidCase.id}
                  className="p-4 sm:p-5 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCase(unpaidCase)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", config.className.split(" ").slice(0, 1).join(" "))}>
                        <StatusIcon className={cn("h-4 w-4", config.className.split(" ").find(c => c.startsWith("text-")))} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{tenantName}</p>
                          <Badge variant="outline" className={cn("text-xs", config.className)}>
                            {STATUS_LABELS[unpaidCase.status] || unpaidCase.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{propertyTitle}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{unpaidCase.days_late} jour{unpaidCase.days_late > 1 ? "s" : ""} de retard</span>
                          <span>•</span>
                          <span>Échéance : {new Date(unpaidCase.due_date).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-11 sm:pl-0">
                      <span className="text-lg font-bold text-foreground whitespace-nowrap">
                        {Number(unpaidCase.amount_due).toLocaleString("fr-FR")} F CFA
                      </span>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedCase(unpaidCase); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* Dialogs */}
      {selectedCase && (
        <UnpaidCaseDetailDialog
          unpaidCase={selectedCase}
          open={!!selectedCase}
          onOpenChange={(open) => !open && setSelectedCase(null)}
        />
      )}
      <CreateUnpaidCaseDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setPreselectedTenantId(null);
        }}
        preselectedTenantId={preselectedTenantId}
      />
    </div>
  );
}
