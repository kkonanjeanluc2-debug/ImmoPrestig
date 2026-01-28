import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Settings,
} from "lucide-react";
import { useParcelleAdminStatus, useUpsertParcelleAdminStatus } from "@/hooks/useParcelleAdminStatus";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

interface ParcelleAdminStatusCardProps {
  parcelleId: string;
  plotNumber: string;
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  en_attente: { label: "En attente", color: "bg-gray-100 text-gray-800", icon: <Clock className="h-3 w-3" /> },
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-800", icon: <Clock className="h-3 w-3" /> },
  valide: { label: "Validé", color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle className="h-3 w-3" /> },
  litige: { label: "En litige", color: "bg-amber-100 text-amber-800", icon: <AlertTriangle className="h-3 w-3" /> },
  bloque: { label: "Bloqué", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
};

const titreFoncierLabels: Record<string, string> = {
  non_demande: "Non demandé",
  en_cours: "En cours",
  obtenu: "Obtenu",
};

export function ParcelleAdminStatusCard({ parcelleId, plotNumber }: ParcelleAdminStatusCardProps) {
  const { data: adminStatus, isLoading } = useParcelleAdminStatus(parcelleId);
  const upsertStatus = useUpsertParcelleAdminStatus();
  const { canUpdate } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    status: adminStatus?.status || "en_attente",
    titre_foncier_status: adminStatus?.titre_foncier_status || "non_demande",
    titre_foncier_reference: adminStatus?.titre_foncier_reference || "",
    attestation_villageoise: adminStatus?.attestation_villageoise || false,
    certificat_propriete: adminStatus?.certificat_propriete || false,
    bornage_effectue: adminStatus?.bornage_effectue || false,
    notes: adminStatus?.notes || "",
  });

  // Reset form when sheet opens
  const handleOpenChange = (open: boolean) => {
    if (open && adminStatus) {
      setFormData({
        status: adminStatus.status,
        titre_foncier_status: adminStatus.titre_foncier_status,
        titre_foncier_reference: adminStatus.titre_foncier_reference || "",
        attestation_villageoise: adminStatus.attestation_villageoise,
        certificat_propriete: adminStatus.certificat_propriete,
        bornage_effectue: adminStatus.bornage_effectue,
        notes: adminStatus.notes || "",
      });
    }
    setIsOpen(open);
  };

  const handleSave = async () => {
    try {
      await upsertStatus.mutateAsync({
        parcelle_id: parcelleId,
        status: formData.status,
        titre_foncier_status: formData.titre_foncier_status,
        titre_foncier_reference: formData.titre_foncier_reference || null,
        attestation_villageoise: formData.attestation_villageoise,
        certificat_propriete: formData.certificat_propriete,
        bornage_effectue: formData.bornage_effectue,
        notes: formData.notes || null,
      });
      toast.success("Statut administratif mis à jour");
      setIsOpen(false);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const currentStatus = statusLabels[adminStatus?.status || "en_attente"];
  const completedChecks = [
    adminStatus?.attestation_villageoise,
    adminStatus?.certificat_propriete,
    adminStatus?.bornage_effectue,
    adminStatus?.titre_foncier_status === "obtenu",
  ].filter(Boolean).length;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          <Badge variant="outline" className={`${currentStatus.color} gap-1`}>
            {currentStatus.icon}
            {currentStatus.label}
          </Badge>
          <span className="text-xs text-muted-foreground">({completedChecks}/4)</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Statut administratif - {plotNumber}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status général */}
          <div className="space-y-2">
            <Label>Statut général</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              disabled={!canUpdate}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titre foncier */}
          <div className="space-y-2">
            <Label>Titre foncier</Label>
            <Select
              value={formData.titre_foncier_status}
              onValueChange={(value) => setFormData({ ...formData, titre_foncier_status: value })}
              disabled={!canUpdate}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(titreFoncierLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.titre_foncier_status === "obtenu" && (
              <Input
                placeholder="Numéro de référence"
                value={formData.titre_foncier_reference}
                onChange={(e) => setFormData({ ...formData, titre_foncier_reference: e.target.value })}
                disabled={!canUpdate}
              />
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            <Label>Documents et vérifications</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attestation"
                  checked={formData.attestation_villageoise}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, attestation_villageoise: !!checked })
                  }
                  disabled={!canUpdate}
                />
                <Label htmlFor="attestation" className="cursor-pointer">
                  Attestation villageoise
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="certificat"
                  checked={formData.certificat_propriete}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, certificat_propriete: !!checked })
                  }
                  disabled={!canUpdate}
                />
                <Label htmlFor="certificat" className="cursor-pointer">
                  Certificat de propriété
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bornage"
                  checked={formData.bornage_effectue}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, bornage_effectue: !!checked })
                  }
                  disabled={!canUpdate}
                />
                <Label htmlFor="bornage" className="cursor-pointer">
                  Bornage effectué
                </Label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Remarques ou informations complémentaires..."
              rows={4}
              disabled={!canUpdate}
            />
          </div>

          {canUpdate && (
            <Button onClick={handleSave} disabled={upsertStatus.isPending} className="w-full">
              {upsertStatus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
