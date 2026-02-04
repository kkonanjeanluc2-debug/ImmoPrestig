import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Phone, Mail, MapPin, CreditCard, Calendar, Briefcase, MapPinned } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Acquereur } from "@/hooks/useAcquereurs";

interface AcquereurDetailsDialogProps {
  acquereur: Acquereur;
  children: React.ReactNode;
}

export function AcquereurDetailsDialog({ acquereur, children }: AcquereurDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "dd MMMM yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Détails de l'acquéreur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with name */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{acquereur.name}</h3>
              {acquereur.profession && (
                <p className="text-muted-foreground">{acquereur.profession}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Informations de contact
            </h4>
            
            {acquereur.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${acquereur.phone}`} className="text-primary hover:underline">
                  {acquereur.phone}
                </a>
              </div>
            )}
            
            {acquereur.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${acquereur.email}`} className="text-primary hover:underline">
                  {acquereur.email}
                </a>
              </div>
            )}
            
            {acquereur.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{acquereur.address}</span>
              </div>
            )}

            {!acquereur.phone && !acquereur.email && !acquereur.address && (
              <p className="text-sm text-muted-foreground italic">
                Aucune information de contact renseignée
              </p>
            )}
          </Card>

          {/* Personal Info */}
          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Informations personnelles
            </h4>
            
            {acquereur.cni_number && (
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>CNI: {acquereur.cni_number}</span>
              </div>
            )}
            
            {acquereur.birth_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Né(e) le {formatDate(acquereur.birth_date)}</span>
              </div>
            )}
            
            {acquereur.birth_place && (
              <div className="flex items-center gap-3">
                <MapPinned className="h-4 w-4 text-muted-foreground" />
                <span>Lieu de naissance: {acquereur.birth_place}</span>
              </div>
            )}
            
            {acquereur.profession && (
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{acquereur.profession}</span>
              </div>
            )}

            {!acquereur.cni_number && !acquereur.birth_date && !acquereur.birth_place && !acquereur.profession && (
              <p className="text-sm text-muted-foreground italic">
                Aucune information personnelle renseignée
              </p>
            )}
          </Card>

          {/* Metadata */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Créé le {formatDate(acquereur.created_at)}</span>
            {acquereur.updated_at !== acquereur.created_at && (
              <span>Modifié le {formatDate(acquereur.updated_at)}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
