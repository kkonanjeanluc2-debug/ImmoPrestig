import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEcheancesVentes, usePayEcheanceVente, type EcheanceVenteWithDetails } from "@/hooks/useEcheancesVentes";
import { formatCurrency } from "@/lib/pdfFormat";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar, Check, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface EcheancesVentesListProps {
  venteId?: string;
}

export function EcheancesVentesList({ venteId }: EcheancesVentesListProps) {
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedEcheance, setSelectedEcheance] = useState<EcheanceVenteWithDetails | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");

  const { data: echeances, isLoading } = useEcheancesVentes(venteId);
  const payEcheance = usePayEcheanceVente();

  const handlePayClick = (echeance: EcheanceVenteWithDetails) => {
    setSelectedEcheance(echeance);
    setPaidAmount(echeance.amount.toString());
    setPaidDate(format(new Date(), "yyyy-MM-dd"));
    setPayDialogOpen(true);
  };

  const handlePaySubmit = async () => {
    if (!selectedEcheance) return;

    try {
      await payEcheance.mutateAsync({
        id: selectedEcheance.id,
        paid_date: paidDate,
        paid_amount: parseFloat(paidAmount),
        payment_method: paymentMethod || undefined,
        receipt_number: receiptNumber || undefined,
      });
      toast.success("Échéance marquée comme payée");
      setPayDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
  };

  const getStatusBadge = (echeance: EcheanceVenteWithDetails) => {
    if (echeance.status === "paid") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          <Check className="h-3 w-3 mr-1" />
          Payé
        </Badge>
      );
    }

    const dueDate = new Date(echeance.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) {
      const daysLate = differenceInDays(new Date(), dueDate);
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          En retard ({daysLate}j)
        </Badge>
      );
    }

    if (isToday(dueDate)) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Aujourd'hui
        </Badge>
      );
    }

    const daysUntil = differenceInDays(dueDate, new Date());
    if (daysUntil <= 7) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Calendar className="h-3 w-3 mr-1" />
          Dans {daysUntil}j
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Calendar className="h-3 w-3 mr-1" />
        En attente
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Échéances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Échéances de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {echeances?.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune échéance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bien</TableHead>
                    <TableHead>Acquéreur</TableHead>
                    <TableHead>Date d'échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {echeances?.map((echeance) => (
                    <TableRow key={echeance.id}>
                      <TableCell>
                        <p className="font-medium">{echeance.vente?.bien?.title}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{echeance.vente?.acquereur?.name}</p>
                        <p className="text-sm text-muted-foreground">{echeance.vente?.acquereur?.phone}</p>
                      </TableCell>
                      <TableCell>
                        {format(new Date(echeance.due_date), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(echeance.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(echeance)}</TableCell>
                      <TableCell className="text-right">
                        {echeance.status === "pending" && (
                          <Button size="sm" onClick={() => handlePayClick(echeance)}>
                            <Check className="h-4 w-4 mr-2" />
                            Encaisser
                          </Button>
                        )}
                        {echeance.status === "paid" && echeance.paid_date && (
                          <span className="text-sm text-muted-foreground">
                            Payé le {format(new Date(echeance.paid_date), "dd/MM/yyyy")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaisser l'échéance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Montant attendu</Label>
              <p className="text-lg font-semibold">{formatCurrency(selectedEcheance?.amount || 0)}</p>
            </div>

            <div>
              <Label htmlFor="paidAmount">Montant reçu (FCFA)</Label>
              <Input
                id="paidAmount"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="paidDate">Date de paiement</Label>
              <Input
                id="paidDate"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="receiptNumber">N° de reçu (optionnel)</Label>
              <Input
                id="receiptNumber"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="REC-XXXX"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handlePaySubmit} disabled={payEcheance.isPending}>
                {payEcheance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer le paiement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
