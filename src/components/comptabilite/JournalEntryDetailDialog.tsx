import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  User,
  Home,
  DoorOpen,
  Hash,
  FileText,
  CreditCard,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  StickyNote,
  Building2,
  Mail,
  Phone,
} from "lucide-react";

export type JournalEntryType = "loyer" | "depense" | "reversement";

export interface JournalEntryDetail {
  id: string;
  date: string;
  type: JournalEntryType;
  account: string;
  label: string;
  debit: number;
  credit: number;
  reference?: string | null;
  // Source brute pour affichage détaillé
  source: any;
  tenantName?: string | null;
  propertyTitle?: string | null;
  propertyAddress?: string | null;
  unitNumber?: string | null;
  ownerName?: string | null;
}

interface Props {
  entry: JournalEntryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCFA(amount: number) {
  if (!amount) return "0 F CFA";
  return `${Math.round(amount).toLocaleString("fr-FR")} F CFA`;
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement bancaire",
  cheque: "Chèque",
  mobile_money: "Mobile Money",
  wave: "Wave",
  kkiapay: "KKiaPay",
  card: "Carte bancaire",
};

function methodLabel(m?: string | null) {
  if (!m) return "—";
  return PAYMENT_METHOD_LABELS[m] || m;
}

const TYPE_META: Record<
  JournalEntryType,
  { label: string; color: string; icon: typeof Receipt }
> = {
  loyer: {
    label: "Encaissement de loyer",
    color: "bg-emerald/10 text-emerald border-emerald/30",
    icon: Receipt,
  },
  depense: {
    label: "Dépense",
    color: "bg-destructive/10 text-destructive border-destructive/30",
    icon: Wallet,
  },
  reversement: {
    label: "Reversement propriétaire",
    color: "bg-primary/10 text-primary border-primary/30",
    icon: ArrowUpRight,
  },
};

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Receipt;
  label: string;
  value: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "" || value === "—")
    return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export function JournalEntryDetailDialog({ entry, open, onOpenChange }: Props) {
  if (!entry) return null;
  const meta = TYPE_META[entry.type];
  const Icon = meta.icon;
  const src = entry.source || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg border ${meta.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold">
                Détail de l'écriture
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={meta.color}>
                  {meta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(entry.date)}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-4">
            {/* Montants */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase">
                  <ArrowUpRight className="h-3 w-3 text-emerald" />
                  Crédit (entrée)
                </div>
                <p className="text-base font-bold text-emerald mt-1">
                  {entry.credit ? formatCFA(entry.credit) : "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase">
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                  Débit (sortie)
                </div>
                <p className="text-base font-bold text-destructive mt-1">
                  {entry.debit ? formatCFA(entry.debit) : "—"}
                </p>
              </div>
            </div>

            {/* Bloc général */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                Informations comptables
              </p>
              <Row icon={Calendar} label="Date d'opération" value={formatDate(entry.date)} />
              <Row icon={Hash} label="Compte SYSCOHADA" value={entry.account} />
              <Row icon={FileText} label="Libellé" value={entry.label} />
              <Row icon={Tag} label="Référence" value={entry.reference} />
            </div>

            <Separator />

            {/* Bloc spécifique selon le type */}
            {entry.type === "loyer" && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                  Source : Paiement de loyer
                </p>
                <Row icon={User} label="Locataire" value={entry.tenantName} />
                <Row
                  icon={Phone}
                  label="Téléphone locataire"
                  value={src.tenant?.phone}
                />
                <Row
                  icon={Mail}
                  label="Email locataire"
                  value={src.tenant?.email}
                />
                <Row icon={Home} label="Bien" value={entry.propertyTitle} />
                <Row
                  icon={Building2}
                  label="Adresse du bien"
                  value={entry.propertyAddress}
                />
                <Row
                  icon={DoorOpen}
                  label="Numéro de porte"
                  value={entry.unitNumber}
                />
                <Row
                  icon={Calendar}
                  label="Période concernée"
                  value={
                    src.payment_period_start && src.payment_period_end
                      ? `${formatDate(src.payment_period_start)} → ${formatDate(src.payment_period_end)}`
                      : src.due_date
                        ? `Échéance ${formatDate(src.due_date)}`
                        : null
                  }
                />
                <Row
                  icon={CreditCard}
                  label="Mode de paiement"
                  value={methodLabel(src.payment_method)}
                />
                <Row
                  icon={Receipt}
                  label="N° quittance"
                  value={src.receipt_number}
                />
                <Row
                  icon={Wallet}
                  label="Montant attendu"
                  value={src.amount ? formatCFA(Number(src.amount)) : null}
                />
                <Row
                  icon={Wallet}
                  label="Montant payé cumulé"
                  value={src.paid_amount ? formatCFA(Number(src.paid_amount)) : null}
                />
                <Row icon={StickyNote} label="Notes" value={src.notes} />
              </div>
            )}

            {entry.type === "depense" && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                  Source : Dépense
                </p>
                <Row icon={Tag} label="Catégorie" value={src.category} />
                <Row icon={FileText} label="Description" value={src.description} />
                <Row icon={Home} label="Bien concerné" value={entry.propertyTitle} />
                <Row
                  icon={Building2}
                  label="Adresse"
                  value={entry.propertyAddress}
                />
                <Row
                  icon={CreditCard}
                  label="Mode de règlement"
                  value={methodLabel(src.payment_method)}
                />
                <Row
                  icon={Receipt}
                  label="N° pièce / facture"
                  value={src.invoice_number || src.reference_number}
                />
                <Row
                  icon={User}
                  label="Bénéficiaire"
                  value={src.beneficiary || src.supplier}
                />
                <Row icon={StickyNote} label="Notes" value={src.notes} />
                {src.receipt_url && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <a
                      href={src.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Voir le justificatif joint
                    </a>
                  </div>
                )}
              </div>
            )}

            {entry.type === "reversement" && (
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                  Source : Reversement propriétaire
                </p>
                <Row icon={User} label="Propriétaire" value={entry.ownerName} />
                <Row
                  icon={Mail}
                  label="Email propriétaire"
                  value={src.owner?.email}
                />
                <Row
                  icon={Calendar}
                  label="Mois de reversement"
                  value={src.payout_month}
                />
                <Row
                  icon={CreditCard}
                  label="Méthode"
                  value={methodLabel(src.payment_method)}
                />
                <Row
                  icon={Receipt}
                  label="Référence transaction"
                  value={src.transaction_reference}
                />
                <Row
                  icon={Wallet}
                  label="Loyers collectés"
                  value={
                    src.total_collected
                      ? formatCFA(Number(src.total_collected))
                      : null
                  }
                />
                <Row
                  icon={Wallet}
                  label="Commission agence"
                  value={
                    src.commission_amount
                      ? formatCFA(Number(src.commission_amount))
                      : null
                  }
                />
                <Row icon={StickyNote} label="Notes" value={src.notes} />
              </div>
            )}

            {/* Identifiant technique */}
            <div className="text-[10px] text-muted-foreground/70 text-right pt-2">
              ID interne : {entry.id}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
