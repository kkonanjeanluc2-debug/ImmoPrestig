import { useState, useMemo } from "react";
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
import { useOverdueEcheancesVentes, usePayEcheanceVente, type EcheanceVenteWithDetails } from "@/hooks/useEcheancesVentes";
import { formatCurrency } from "@/lib/pdfFormat";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar, Check, AlertTriangle, Loader2, Mail, Search, X, Download } from "lucide-react";
import { SendVenteReminderDialog } from "./SendVenteReminderDialog";
import { generateEcheanceReceipt } from "@/lib/generateEcheanceReceipt";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEcheancesVentes } from "@/hooks/useEcheancesVentes";

export function LateEcheancesVentesList() {
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedEcheance, setSelectedEcheance] = useState<EcheanceVenteWithDetails | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Use dedicated server-filtered hook instead of loading all + client filter
  const { data: overdueEcheances = [], isLoading } = useOverdueEcheancesVentes();
  const { data: allEcheances } = useEcheancesVentes();
  const payEcheance = usePayEcheanceVente();
  const { data: agency } = useAgency();
  const { user } = useAuth();

  const fetchUserName = async () => {
    if (!user) return "Agent";
    const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    return data?.full_name || "Agent";
  };

  const handleDownloadReceipt = async (echeance: EcheanceVenteWithDetails, validatedByName?: string) => {
    try {
      const sameVente = allEcheances?.filter(e => e.vente_id === echeance.vente_id).sort((a, b) => a.due_date.localeCompare(b.due_date)) || [];
      const echeanceNumber = sameVente.findIndex(e => e.id === echeance.id) + 1;
      const name = validatedByName || await fetchUserName();

      await generateEcheanceReceipt({
        echeanceId: echeance.id,
        propertyTitle: echeance.vente?.bien?.title || "Bien",
        propertyAddress: echeance.vente?.bien?.address,
        amount: Number(echeance.paid_amount || echeance.amount),
        paidDate: echeance.paid_date || new Date().toISOString(),
        dueDate: echeance.due_date,
        paymentMethod: echeance.payment_method || "Espèces",
        totalSalePrice: 0,
        echeanceNumber,
        totalEcheances: sameVente.length,
        agencyName: agency?.name,
        agencyPhone: agency?.phone || undefined,
        agencyEmail: agency?.email,
        agencyAddress: [agency?.address, agency?.city, agency?.country].filter(Boolean).join(", ") || undefined,
        agencyLogoUrl: agency?.logo_url,
        validatedBy: name,
        acquereur: echeance.vente?.acquereur ? { name: echeance.vente.acquereur.name, phone: echeance.vente.acquereur.phone } : undefined,
      });
      toast.success("Reçu téléchargé");
    } catch {
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  // Only apply client-side search filter on already server-filtered data
  const lateEcheances = useMemo(() => {
    if (!searchQuery.trim()) return overdueEcheances;
    const query = searchQuery.toLowerCase();
    return overdueEcheances.filter((echeance) => {
      const bienTitle = echeance.vente?.bien?.title?.toLowerCase() || "";
      const acquereurName = echeance.vente?.acquereur?.name?.toLowerCase() || "";
      const acquereurPhone = echeance.vente?.acquereur?.phone?.toLowerCase() || "";
      const amount = echeance.amount.toString();
      return bienTitle.includes(query) || acquereurName.includes(query) || acquereurPhone.includes(query) || amount.includes(query);
    });
  }, [overdueEcheances, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = lateEcheances.length;
    const totalAmount = lateEcheances.reduce((sum, e) => sum + e.amount, 0);
    const avgDaysLate = total > 0 
      ? Math.round(lateEcheances.reduce((sum, e) => sum + differenceInDays(new Date(), new Date(e.due_date)), 0) / total)
      : 0;
    const criticalCount = lateEcheances.filter(e => differenceInDays(new Date(), new Date(e.due_date)) > 30).length;
    
    return { total, totalAmount, avgDaysLate, criticalCount };
  }, [lateEcheances]);

  const handlePayClick = (echeance: EcheanceVenteWithDetails) => {
    setSelectedEcheance(echeance);
    setPaidAmount(echeance.amount.toString());
    setPaidDate(format(new Date(), "yyyy-MM-dd"));
    setPayDialogOpen(true);
  };

  const handlePaySubmit = async () => {
    if (!selectedEcheance) return;

    try {
      const userName = await fetchUserName();
      const methodLabel = paymentMethod || "Espèces";
      await payEcheance.mutateAsync({
        id: selectedEcheance.id,
        paid_date: paidDate,
        paid_amount: parseFloat(paidAmount),
        payment_method: methodLabel,
        receipt_number: receiptNumber || undefined,
      });
      toast.success("Échéance marquée comme payée");
      setPayDialogOpen(false);

      const updatedEcheance: EcheanceVenteWithDetails = {
        ...selectedEcheance,
        status: "paid",
        paid_amount: parseFloat(paidAmount),
        paid_date: paidDate,
        payment_method: methodLabel,
      };
      await handleDownloadReceipt(updatedEcheance, userName);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Échéances en retard</CardTitle>
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
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">En retard</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Critique (+30j)</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.criticalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Retard moyen</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgDaysLate}j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Montant dû</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-destructive">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Échéances en retard
            </CardTitle>
            
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 w-full sm:w-64"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lateEcheances.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
              <p className="text-muted-foreground">Aucune échéance en retard</p>
              <p className="text-sm text-muted-foreground mt-1">Tous les paiements sont à jour</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bien</TableHead>
                    <TableHead>Acquéreur</TableHead>
                    <TableHead>Date d'échéance</TableHead>
                    <TableHead>Retard</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lateEcheances.map((echeance) => {
                    const daysLate = differenceInDays(new Date(), new Date(echeance.due_date));
                    const isCritical = daysLate > 30;
                    
                    return (
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
                        <TableCell>
                          <Badge className={isCritical 
                            ? "bg-destructive/20 text-destructive border-destructive/30" 
                            : "bg-destructive/10 text-destructive border-destructive/30"
                          }>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {daysLate}j de retard
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(echeance.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <SendVenteReminderDialog
                              echeanceId={echeance.id}
                              acquereurName={echeance.vente?.acquereur?.name || "Client"}
                              acquereurPhone={echeance.vente?.acquereur?.phone}
                              acquereurEmail={echeance.vente?.acquereur?.email}
                              bienTitle={echeance.vente?.bien?.title || "Bien"}
                              amount={echeance.amount}
                              dueDate={echeance.due_date}
                              isLate={true}
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Relancer
                                </Button>
                              }
                            />
                            <Button size="sm" onClick={() => handlePayClick(echeance)}>
                              <Check className="h-4 w-4 mr-2" />
                              Encaisser
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
