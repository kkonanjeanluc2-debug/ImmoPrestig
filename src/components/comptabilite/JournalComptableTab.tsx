import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, ArrowUpRight, ArrowDownRight, Lock } from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { useExpenses, EXPENSE_CATEGORIES } from "@/hooks/useExpenses";
import { useTenants } from "@/hooks/useTenants";
import { useProperties } from "@/hooks/useProperties";
import { useOwnerPayouts } from "@/hooks/useOwnerPayouts";
import { usePermissions } from "@/hooks/usePermissions";
import {
  JournalEntryDetailDialog,
  type JournalEntryDetail,
} from "./JournalEntryDetailDialog";

type EntryType = "loyer" | "depense" | "reversement";

interface JournalEntry extends JournalEntryDetail {
  tenantId?: string | null;
  propertyId?: string | null;
}

interface JournalComptableTabProps {
  periodFrom: Date;
  periodTo: Date;
  periodLabel: string;
}

function formatCFA(amount: number) {
  if (!amount) return "—";
  return `${Math.round(amount).toLocaleString("fr-FR")} F CFA`;
}

function formatDate(date: string) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("fr-FR");
  } catch {
    return date;
  }
}

function getCategoryAccount(category: string) {
  const cat = EXPENSE_CATEGORIES.find((c) => c.value === category);
  return cat ? `${cat.syscohada} - ${cat.label}` : category;
}

const TYPE_LABELS: Record<EntryType, { label: string; color: string }> = {
  loyer: { label: "Loyer", color: "bg-emerald/10 text-emerald border-emerald/30" },
  depense: { label: "Dépense", color: "bg-destructive/10 text-destructive border-destructive/30" },
  reversement: { label: "Reversement", color: "bg-primary/10 text-primary border-primary/30" },
};

export function JournalComptableTab({
  periodFrom,
  periodTo,
  periodLabel,
}: JournalComptableTabProps) {
  const { role, hasPermission } = usePermissions();
  const isAdminOrOwner = role === "super_admin" || role === "admin";
  const canExport = isAdminOrOwner || hasPermission("can_export_comptabilite");

  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses(periodFrom, periodTo);
  const { data: tenants = [] } = useTenants();
  const { data: properties = [] } = useProperties();
  const fromStr = periodFrom.toISOString().split("T")[0];
  const toStr = periodTo.toISOString().split("T")[0];
  const { data: payouts = [] } = useOwnerPayouts(fromStr, toStr);

  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (e: JournalEntry) => {
    setSelectedEntry(e);
    setDetailOpen(true);
  };

  const entries = useMemo<JournalEntry[]>(() => {
    const list: JournalEntry[] = [];

    // Loyers encaissés (paid + partial avec paid_date dans la période)
    payments.forEach((p: any) => {
      if (p._isVirtual) return;
      const paidDate = p.paid_date?.substring(0, 10);
      if (!paidDate) return;
      if (paidDate < fromStr || paidDate > toStr) return;

      const isPaid = p.status === "paid";
      const isPartial = !isPaid && Number(p.paid_amount) > 0;
      if (!isPaid && !isPartial) return;

      const amount = isPaid
        ? Number(p.last_collected_amount) || Number(p.paid_amount) || Number(p.amount) || 0
        : Number(p.paid_amount) || 0;

      const tenant = p.tenant || tenants.find((t) => t.id === p.tenant_id);
      const property = tenant?.property || properties.find((pr) => pr.id === tenant?.property_id);

      list.push({
        id: `pay-${p.id}`,
        date: paidDate,
        type: "loyer",
        account: "706 - Loyers encaissés",
        label: isPartial ? "Encaissement partiel de loyer" : "Encaissement loyer",
        tenantId: p.tenant_id,
        tenantName: tenant?.name || null,
        propertyId: property?.id || null,
        propertyTitle: property?.title || null,
        propertyAddress: property?.address || null,
        unitNumber: p.tenant?.unit?.unit_number || tenant?.unit?.unit_number || null,
        debit: 0,
        credit: amount,
        reference: p.receipt_number || p.id.substring(0, 8),
        source: { ...p, tenant },
      });
    });

    // Dépenses
    expenses.forEach((e) => {
      const property = properties.find((pr) => pr.id === (e as any).property_id);
      list.push({
        id: `exp-${e.id}`,
        date: e.expense_date,
        type: "depense",
        account: getCategoryAccount(e.category),
        label: e.description,
        tenantId: null,
        tenantName: null,
        propertyId: property?.id || null,
        propertyTitle: property?.title || null,
        propertyAddress: property?.address || null,
        debit: Number(e.amount) || 0,
        credit: 0,
        reference: e.id.substring(0, 8),
        source: e,
      });
    });

    // Reversements aux propriétaires (sortie de trésorerie)
    payouts
      .filter((po) => po.status === "completed" && po.payout_date)
      .forEach((po) => {
        const dateOnly = po.payout_date.substring(0, 10);
        list.push({
          id: `payout-${po.id}`,
          date: dateOnly,
          type: "reversement",
          account: "467 - Comptes propriétaires",
          label: `Reversement à ${(po as any).owner?.name || "propriétaire"}`,
          tenantId: null,
          tenantName: null,
          propertyId: null,
          propertyTitle: null,
          ownerName: (po as any).owner?.name || null,
          debit: Number(po.amount) || 0,
          credit: 0,
          reference: po.id.substring(0, 8),
          source: po,
        });
      });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, expenses, payouts, tenants, properties, fromStr, toStr]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (tenantFilter !== "all" && e.tenantId !== tenantFilter) return false;
      if (propertyFilter !== "all" && e.propertyId !== propertyFilter) return false;
      if (q) {
        const haystack = [
          e.label,
          e.tenantName,
          e.propertyTitle,
          e.account,
          e.reference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, typeFilter, tenantFilter, propertyFilter]);

  const totals = useMemo(() => {
    const debit = filteredEntries.reduce((s, e) => s + e.debit, 0);
    const credit = filteredEntries.reduce((s, e) => s + e.credit, 0);
    return { debit, credit, solde: credit - debit };
  }, [filteredEntries]);

  const handleExportCSV = () => {
    const header = [
      "Date",
      "Type",
      "Compte",
      "Libellé",
      "Locataire",
      "Bien",
      "Référence",
      "Débit",
      "Crédit",
    ];
    const rows = filteredEntries.map((e) => [
      formatDate(e.date),
      TYPE_LABELS[e.type].label,
      e.account,
      e.label,
      e.tenantName || "",
      e.propertyTitle || "",
      e.reference || "",
      e.debit ? String(e.debit) : "",
      e.credit ? String(e.credit) : "",
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-comptable-${fromStr}-${toStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Notice rôle comptable */}
      {role === "comptable" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Vue lecture seule. En tant que comptable, vous pouvez consulter et
            exporter les écritures, mais les modifications et suppressions sont
            réservées aux administrateurs.
          </p>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (libellé, réf...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Type d'écriture" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="loyer">Loyers</SelectItem>
                <SelectItem value="depense">Dépenses</SelectItem>
                <SelectItem value="reversement">Reversements</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Locataire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous locataires</SelectItem>
                {tenants
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Bien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous biens</SelectItem>
                {properties
                  .slice()
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {filteredEntries.length} écriture{filteredEntries.length > 1 ? "s" : ""} — {periodLabel}
            </p>
            {canExport && filteredEntries.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="h-8 gap-1 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Exporter CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Totaux */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total crédit</p>
                <p className="text-sm sm:text-base font-bold text-emerald truncate">
                  {formatCFA(totals.credit)}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-emerald shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total débit</p>
                <p className="text-sm sm:text-base font-bold text-destructive truncate">
                  {formatCFA(totals.debit)}
                </p>
              </div>
              <ArrowDownRight className="h-4 w-4 text-destructive shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Solde</p>
                <p
                  className={`text-sm sm:text-base font-bold truncate ${
                    totals.solde >= 0 ? "text-foreground" : "text-destructive"
                  }`}
                >
                  {formatCFA(totals.solde)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Journal comptable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Compte</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Libellé</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium hidden md:table-cell">
                    Locataire / Bien
                  </th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Débit</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Crédit</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">
                      Aucune écriture trouvée pour ces filtres.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => openDetail(e)}
                      className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-2 whitespace-nowrap text-foreground">
                        {formatDate(e.date)}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className={`text-[10px] ${TYPE_LABELS[e.type].color}`}>
                          {TYPE_LABELS[e.type].label}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                        {e.account}
                      </td>
                      <td className="py-2 px-2 text-foreground max-w-[260px] truncate" title={e.label}>
                        {e.label}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                        {e.tenantName && <div className="truncate">{e.tenantName}</div>}
                        {e.propertyTitle && (
                          <div className="text-[10px] text-muted-foreground/80 truncate">
                            {e.propertyTitle}
                          </div>
                        )}
                        {!e.tenantName && !e.propertyTitle && "—"}
                      </td>
                      <td className="py-2 px-2 text-right text-destructive font-medium whitespace-nowrap">
                        {e.debit ? formatCFA(e.debit) : "—"}
                      </td>
                      <td className="py-2 px-2 text-right text-emerald font-medium whitespace-nowrap">
                        {e.credit ? formatCFA(e.credit) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredEntries.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/50 font-semibold border-t border-border">
                    <td colSpan={5} className="py-2 px-2 text-foreground">
                      Total
                    </td>
                    <td className="py-2 px-2 text-right text-destructive">
                      {formatCFA(totals.debit)}
                    </td>
                    <td className="py-2 px-2 text-right text-emerald">
                      {formatCFA(totals.credit)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <JournalEntryDetailDialog
        entry={selectedEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
