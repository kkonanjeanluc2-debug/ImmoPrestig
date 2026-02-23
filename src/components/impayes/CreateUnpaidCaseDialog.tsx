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

  // All late/pending payments for tenants without an existing case
  const allLatePayments = (payments || []).filter(
    (p) =>
      (p.status === "late" || (p.status === "pending" && new Date(p.due_date) < new Date())) &&
      !tenantIdsWithCase.has(p.tenant_id)
  );

  // For the select dropdown (when no preselection): group by tenant, show one entry per tenant
  const tenantGroups = new Map<string, { tenantId: string; tenantName: string; payments: typeof allLatePayments }>();
  for (const p of allLatePayments) {
    const t = p.tenant as any;
    if (!tenantGroups.has(p.tenant_id)) {
      tenantGroups.set(p.tenant_id, { tenantId: p.tenant_id, tenantName: t?.name || "Locataire", payments: [] });
    }
    tenantGroups.get(p.tenant_id)!.payments.push(p);
  }

  const isPreselected = !!preselectedTenantId;

  // The active tenant ID: either preselected or chosen from dropdown
  const activeTenantId = isPreselected ? preselectedTenantId : selectedPaymentId;
  
  // All late payments for the active tenant
  const tenantPayments = allLatePayments.filter(p => p.tenant_id === activeTenantId);
  const firstPayment = tenantPayments[0];
  const tenant = firstPayment?.tenant as any;

  // Aggregated values
  const totalAmount = tenantPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const earliestDueDate = tenantPayments.length > 0
    ? tenantPayments.reduce((earliest, p) => p.due_date < earliest ? p.due_date : earliest, tenantPayments[0].due_date)
    : "";
  const maxDaysLate = tenantPayments.length > 0
    ? Math.max(...tenantPayments.map(p => Math.max(0, differenceInDays(new Date(), new Date(p.due_date)))))
    : 0;

  // Auto-select when dialog opens with preselection
  useEffect(() => {
    if (!open) {
      setSelectedPaymentId("");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!firstPayment || !tenant || !activeTenantId) return;

    try {
      await createCase.mutateAsync({
        tenant_id: activeTenantId,
        property_id: tenant?.property_id || null,
        payment_id: firstPayment.id,
        amount_due: totalAmount,
        due_date: earliestDueDate,
        days_late: maxDaysLate,
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
            <Label>Locataire en retard</Label>
            {isPreselected ? (
              <Input value={tenant?.name || "Locataire"} disabled />
            ) : (
              <Select value={selectedPaymentId} onValueChange={setSelectedPaymentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un locataire" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {tenantGroups.size === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucun paiement en retard
                    </SelectItem>
                  ) : (
                    Array.from(tenantGroups.values()).map((group) => {
                      const total = group.payments.reduce((s, p) => s + Number(p.amount), 0);
                      return (
                        <SelectItem key={group.tenantId} value={group.tenantId}>
                          {group.tenantName} - {total.toLocaleString("fr-FR")} F CFA
                          {group.payments.length > 1 ? ` (${group.payments.length} paiements)` : ""}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {activeTenantId && tenantPayments.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Locataire :</span> <strong>{tenant?.name}</strong></p>
              <p><span className="text-muted-foreground">Bien :</span> {tenant?.property?.title || "—"}</p>
              <p><span className="text-muted-foreground">Montant total :</span> <strong>{totalAmount.toLocaleString("fr-FR")} F CFA</strong></p>
              {tenantPayments.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  ({tenantPayments.length} paiements : {tenantPayments.map(p => `${Number(p.amount).toLocaleString("fr-FR")} F`).join(" + ")})
                </p>
              )}
              <p><span className="text-muted-foreground">Échéance :</span> {new Date(earliestDueDate).toLocaleDateString("fr-FR")}</p>
              <p><span className="text-muted-foreground">Retard :</span> {maxDaysLate} jours</p>
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
              disabled={!activeTenantId || tenantPayments.length === 0 || createCase.isPending}
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
