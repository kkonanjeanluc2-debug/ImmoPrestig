import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  TrendingUp,
  MessageSquare,
  DollarSign,
  Clock,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { type ParcelleProspect, type ProspectStatus, type InterestLevel } from "@/hooks/useParcelleProspects";

interface ViewProspectDialogProps {
  prospect: ParcelleProspect | null;
  parcelleNumber: string;
  lotissementName: string;
  managerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<ProspectStatus, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  contacte: { label: "Contacté", className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  interesse: { label: "Intéressé", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  negociation: { label: "Négociation", className: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  perdu: { label: "Perdu", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  converti: { label: "Converti", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
};

const INTEREST_CONFIG: Record<InterestLevel, { label: string; className: string }> = {
  faible: { label: "Faible", className: "bg-muted text-muted-foreground" },
  moyen: { label: "Moyen", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  eleve: { label: "Élevé", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
};

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

export function ViewProspectDialog({
  prospect,
  parcelleNumber,
  lotissementName,
  managerName,
  open,
  onOpenChange,
}: ViewProspectDialogProps) {
  if (!prospect) return null;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "d MMMM yyyy", { locale: fr });
  };

  const formatBudget = () => {
    if (!prospect.budget_min && !prospect.budget_max) return null;
    const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
    if (prospect.budget_min && prospect.budget_max) {
      return `${fmt(prospect.budget_min)} - ${fmt(prospect.budget_max)} F CFA`;
    }
    if (prospect.budget_min) return `À partir de ${fmt(prospect.budget_min)} F CFA`;
    return `Jusqu'à ${fmt(prospect.budget_max!)} F CFA`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p>{prospect.name}</p>
              <p className="text-sm font-normal text-muted-foreground">
                Lot {parcelleNumber} — {lotissementName}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className={STATUS_CONFIG[prospect.status].className}>
            {STATUS_CONFIG[prospect.status].label}
          </Badge>
          <Badge variant="outline" className={INTEREST_CONFIG[prospect.interest_level].className}>
            Intérêt : {INTEREST_CONFIG[prospect.interest_level].label}
          </Badge>
        </div>

        <Separator className="my-2" />

        {/* Contact */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact</h4>
          {prospect.phone && (
            <div className="flex items-center justify-between">
              <DetailRow icon={Phone} label="Téléphone" value={prospect.phone} />
              <WhatsAppButton
                phone={prospect.phone}
                message={`Bonjour ${prospect.name}, concernant le lot ${parcelleNumber} du lotissement ${lotissementName}...`}
                variant="outline"
                size="sm"
              />
            </div>
          )}
          <DetailRow icon={Mail} label="Email" value={prospect.email} />
        </div>

        <Separator className="my-2" />

        {/* Suivi */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Suivi</h4>
          <DetailRow icon={Tag} label="Source" value={prospect.source} />
          <DetailRow icon={Calendar} label="Premier contact" value={formatDate(prospect.first_contact_date)} />
          <DetailRow icon={Clock} label="Dernier contact" value={formatDate(prospect.last_contact_date)} />
          <DetailRow
            icon={Calendar}
            label="Prochain suivi"
            value={
              prospect.next_followup_date ? (
                <span className={
                  new Date(prospect.next_followup_date) < new Date() ? "text-destructive" : ""
                }>
                  {formatDate(prospect.next_followup_date)}
                </span>
              ) : null
            }
          />
        </div>

        {/* Budget */}
        {formatBudget() && (
          <>
            <Separator className="my-2" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Budget</h4>
              <DetailRow icon={DollarSign} label="Budget estimé" value={formatBudget()} />
            </div>
          </>
        )}

        {/* Notes */}
        {prospect.notes && (
          <>
            <Separator className="my-2" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</h4>
              <div className="flex items-start gap-3 py-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm whitespace-pre-wrap">{prospect.notes}</p>
              </div>
            </div>
          </>
        )}

        {/* Gestionnaire */}
        {managerName && (
          <>
            <Separator className="my-2" />
            <DetailRow icon={User} label="Gestionnaire" value={managerName} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
