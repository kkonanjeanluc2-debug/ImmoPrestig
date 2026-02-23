import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePayments } from "@/hooks/usePayments";
import { useCreateUnpaidCase, useUnpaidCases } from "@/hooks/useUnpaidCases";
import { differenceInDays } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTenantId?: string | null;
}

export function CreateUnpaidCaseDialog({ open, onOpenChange, preselectedTenantId }: Props) {
  const { data: payments } = usePayments();
  const { data: existingCases } = useUnpaidCases();
  const createCase = useCreateUnpaidCase();
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [notes, setNotes] = useState("");

  // Tenant IDs that already have an unpaid case
  const tenantIdsWithCase = new Set(
    (existingCases || []).map((c) => c.tenant_id)
  );

  // Only show late/pending payments for tenants without an existing case
  // If preselectedTenantId, filter to only that tenant
  const latePayments = (payments || []).filter(
    (p) =>
      (p.status === "late" || (p.status === "pending" && new Date(p.due_date) < new Date())) &&
      !tenantIdsWithCase.has(p.tenant_id) &&
      (!preselectedTenantId || p.tenant_id === preselectedTenantId)
  );

  const isPreselected = !!preselectedTenantId;

  // Auto-select first payment when dialog opens with preselection
  useEffect(() => {
    if (open && preselectedTenantId && latePayments.length > 0) {
      setSelectedPaymentId(latePayments[0].id);
    }
    if (!open) {
      setSelectedPaymentId("");
      setNotes("");
    }
  }, [open, preselectedTenantId]);

  const selectedPayment = latePayments.find((p) => p.id === selectedPaymentId);
  const tenant = selectedPayment?.tenant as any;

  const handleSubmit = async () => {
    if (!selectedPayment || !tenant) return;

    const daysLate = differenceInDays(new Date(), new Date(selectedPayment.due_date));

    try {
      await createCase.mutateAsync({
        tenant_id: selectedPayment.tenant_id,
        property_id: tenant?.property_id || null,
        payment_id: selectedPayment.id,
        amount_due: Number(selectedPayment.amount),
        due_date: selectedPayment.due_date,
        days_late: Math.max(0, daysLate),
        notes: notes || null,
      });
      toast.success("Dossier d'impayé créé avec succès");
      onOpenChange(false);
    } catch (err) {
      toast.error("Erreur lors de la création du dossier");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un dossier d'impayé</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paiement en retard</Label>
            <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId} disabled={isPreselected}>
              <SelectTrigger disabled={isPreselected}>
                <SelectValue placeholder="Sélectionner un paiement en retard" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {latePayments.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Aucun paiement en retard
                  </SelectItem>
                ) : (
                  latePayments.map((p) => {
                    const t = p.tenant as any;
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {t?.name || "Locataire"} - {Number(p.amount).toLocaleString("fr-FR")} F CFA
                        ({new Date(p.due_date).toLocaleDateString("fr-FR")})
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPayment && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Locataire :</span> <strong>{tenant?.name}</strong></p>
              <p><span className="text-muted-foreground">Bien :</span> {tenant?.property?.title || "—"}</p>
              <p><span className="text-muted-foreground">Montant :</span> {Number(selectedPayment.amount).toLocaleString("fr-FR")} F CFA</p>
              <p><span className="text-muted-foreground">Échéance :</span> {new Date(selectedPayment.due_date).toLocaleDateString("fr-FR")}</p>
              <p><span className="text-muted-foreground">Retard :</span> {differenceInDays(new Date(), new Date(selectedPayment.due_date))} jours</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea
              placeholder="Observations sur le dossier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedPaymentId || createCase.isPending}
            >
              {createCase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le dossier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
