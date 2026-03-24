import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  ArrowDownToLine,
  Plus,
  Trash2,
  User,
  Calendar,
  CreditCard,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOwnerPayouts,
  useCreateOwnerPayout,
  useDeleteOwnerPayout,
} from "@/hooks/useOwnerPayouts";
import { useOwners } from "@/hooks/useOwners";
import { PAYMENT_OPERATORS } from "@/hooks/useAgency";
import { useCommissions } from "@/hooks/useCommissions";
import { useProperties } from "@/hooks/useProperties";
import { usePropertyInterventions } from "@/hooks/usePropertyInterventions";
import { useTenants } from "@/hooks/useTenants";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("fr-FR") + " F CFA";
}

interface OwnerPayoutsSectionProps {
  fromDate: string;
  toDate: string;
  totalReversements: number;
}

export function OwnerPayoutsSection({
  fromDate,
  toDate,
  totalReversements,
}: OwnerPayoutsSectionProps) {
  const { data: payouts = [], isLoading } = useOwnerPayouts(fromDate, toDate);
  const { data: owners = [] } = useOwners();
  const { data: properties = [] } = useProperties();
  const { data: allInterventions = [] } = usePropertyInterventions();
  const { data: tenants = [] } = useTenants();
  const createPayout = useCreateOwnerPayout();
  const deletePayout = useDeleteOwnerPayout();
  const commissionReport = useCommissions(fromDate, toDate);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    owner_id: "",
    amount: "",
    payout_date: new Date().toISOString().split("T")[0],
    payment_method: "especes",
    recipient_phone: "",
    notes: "",
  });

  // Auto-fill amount when owner is selected
  const handleOwnerChange = (ownerId: string) => {
    const ownerSummary = commissionReport.byOwner.find((o) => o.ownerId === ownerId);
    
    // Get owner's properties
    const ownerProps = properties.filter((p) => p.owner_id === ownerId);
    const ownerPropIds = ownerProps.map((p) => p.id);
    
    // Calculate interventions cost for the period
    const interventionsCost = allInterventions
      .filter((i) => {
        if (!ownerPropIds.includes(i.property_id)) return false;
        const startDate = i.start_date?.substring(0, 10);
        return startDate && startDate >= fromDate && startDate <= toDate;
      })
      .reduce((sum, i) => sum + (i.cost || 0), 0);
    
    // Calculate cautions (deposits from tenants created in the period)
    const totalCautions = tenants
      .filter((t) => {
        if (!t.property_id || !ownerPropIds.includes(t.property_id)) return false;
        const createdAt = t.created_at?.substring(0, 10);
        return createdAt && createdAt >= fromDate && createdAt <= toDate;
      })
      .reduce((sum, t) => {
        const deposit = (t as any).contracts?.find((c: any) => c.status === "active")?.deposit || 0;
        return sum + Number(deposit);
      }, 0);
    
    // Formula: totalRent - commission - interventions + cautions
    const totalRent = ownerSummary?.totalRent || 0;
    const totalCommission = ownerSummary?.totalCommission || 0;
    const netAmount = Math.max(0, totalRent - totalCommission - interventionsCost + totalCautions);
    
    setForm({ ...form, owner_id: ownerId, amount: netAmount > 0 ? String(netAmount) : "" });
  };

  const handleSubmit = () => {
    if (!form.owner_id || !form.amount || Number(form.amount) <= 0) return;
    createPayout.mutate(
      {
        owner_id: form.owner_id,
        amount: Number(form.amount),
        payout_date: form.payout_date,
        payment_method: form.payment_method,
        recipient_phone: form.recipient_phone || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({
            owner_id: "",
            amount: "",
            payout_date: new Date().toISOString().split("T")[0],
            payment_method: "especes",
            recipient_phone: "",
            notes: "",
          });
        },
      }
    );
  };

  const getOperatorLabel = (value: string): string => {
    const op = PAYMENT_OPERATORS.find((o) => o.value === value);
    return op?.label || value;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total reversé</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(totalReversements)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowDownToLine className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Nb reversements</p>
                <p className="text-lg font-bold text-foreground">
                  {payouts.length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add button + Dialog */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nouveau reversement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enregistrer un reversement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Propriétaire *</Label>
                <Select
                  value={form.owner_id}
                  onValueChange={handleOwnerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un propriétaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Montant (F CFA) *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Date du reversement</Label>
                <Input
                  type="date"
                  value={form.payout_date}
                  onChange={(e) =>
                    setForm({ ...form, payout_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(v) =>
                    setForm({ ...form, payment_method: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="virement">Virement bancaire</SelectItem>
                    {PAYMENT_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Téléphone destinataire</Label>
                <Input
                  value={form.recipient_phone}
                  onChange={(e) =>
                    setForm({ ...form, recipient_phone: e.target.value })
                  }
                  placeholder="Ex: +229 97 00 00 00"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes optionnelles..."
                  rows={2}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  !form.owner_id ||
                  !form.amount ||
                  Number(form.amount) <= 0 ||
                  createPayout.isPending
                }
              >
                {createPayout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historique des reversements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-8 text-center">
              <ArrowDownToLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucun reversement pour cette période.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ArrowDownToLine className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">
                            {payout.owner?.name || "Propriétaire"}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald/10 text-emerald border-emerald/20"
                          >
                            Effectué
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {getOperatorLabel(payout.payment_method)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(payout.payout_date).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        {payout.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {payout.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(Number(payout.amount))}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer ce reversement ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le montant de{" "}
                              {formatCurrency(Number(payout.amount))} sera
                              retiré de l'historique.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePayout.mutate(payout.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
