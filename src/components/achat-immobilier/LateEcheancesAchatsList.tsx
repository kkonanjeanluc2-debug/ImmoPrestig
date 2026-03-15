import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOverdueEcheancesAchats, useEcheancesAchats, usePayEcheanceAchat, type EcheanceAchat } from "@/hooks/useEcheancesAchats";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/pdfFormat";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar, Check, AlertTriangle, Loader2, Mail, Search, X, Download } from "lucide-react";
import { SendAchatReminderDialog } from "./SendAchatReminderDialog";
import { generateEcheanceReceipt } from "@/lib/generateEcheanceReceipt";
import { supabase } from "@/integrations/supabase/client";

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte bancaire" },
];

export function LateEcheancesAchatsList() {
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedEcheance, setSelectedEcheance] = useState<EcheanceAchat | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: overdueEcheances = [], isLoading } = useOverdueEcheancesAchats();
  const { data: allEcheances } = useEcheancesAchats();
  const payMutation = usePayEcheanceAchat();
  const { data: agency } = useAgency();
  const { user } = useAuth();

  const fetchUserName = async () => {
    if (!user) return "Agent";
    const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    return data?.full_name || "Agent";
  };

  const handleDownloadReceipt = async (ech: EcheanceAchat, validatedByName?: string) => {
    try {
      const sameAchat = allEcheances?.filter(e => e.achat_id === ech.achat_id).sort((a, b) => a.due_date.localeCompare(b.due_date)) || [];
      const echeanceNumber = sameAchat.findIndex(e => e.id === ech.id) + 1;
      const name = validatedByName || await fetchUserName();

      await generateEcheanceReceipt({
        echeanceId: ech.id,
        propertyTitle: ech.achats_immobiliers?.biens_achat?.title || "Bien",
        propertyAddress: ech.achats_immobiliers?.biens_achat?.address,
        amount: Number(ech.paid_amount || ech.amount),
        paidDate: ech.paid_date || new Date().toISOString(),
        dueDate: ech.due_date,
        paymentMethod: ech.payment_method || "Espèces",
        totalSalePrice: ech.achats_immobiliers?.sale_price || 0,
        echeanceNumber,
        totalEcheances: sameAchat.length,
        agencyName: agency?.name,
        agencyPhone: agency?.phone || undefined,
        agencyEmail: agency?.email,
        agencyAddress: [agency?.address, agency?.city, agency?.country].filter(Boolean).join(", ") || undefined,
        agencyLogoUrl: agency?.logo_url,
        validatedBy: name,
        vendeur: ech.achats_immobiliers?.vendeurs ? {
          name: ech.achats_immobiliers.vendeurs.name,
          phone: ech.achats_immobiliers.vendeurs.phone,
          address: ech.achats_immobiliers.vendeurs.address,
          cniNumber: ech.achats_immobiliers.vendeurs.cni_number,
        } : undefined,
        acquereur: ech.achats_immobiliers?.acquereurs ? {
          name: ech.achats_immobiliers.acquereurs.name,
          phone: ech.achats_immobiliers.acquereurs.phone,
          address: ech.achats_immobiliers.acquereurs.address,
          cniNumber: ech.achats_immobiliers.acquereurs.cni_number,
        } : undefined,
      });
      toast.success("Reçu téléchargé");
    } catch {
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  const lateEcheances = useMemo(() => {
    if (!searchQuery.trim()) return overdueEcheances;
    const q = searchQuery.toLowerCase();
    return overdueEcheances.filter((ech) => {
      const title = ech.achats_immobiliers?.biens_achat?.title?.toLowerCase() || "";
      const vendeur = ech.achats_immobiliers?.vendeurs?.name?.toLowerCase() || "";
      const amount = ech.amount.toString();
      return title.includes(q) || vendeur.includes(q) || amount.includes(q);
    });
  }, [overdueEcheances, searchQuery]);

  const stats = useMemo(() => {
    const total = lateEcheances.length;
    const totalAmount = lateEcheances.reduce((sum, e) => sum + e.amount, 0);
    const avgDaysLate = total > 0
      ? Math.round(lateEcheances.reduce((sum, e) => sum + differenceInDays(new Date(), new Date(e.due_date)), 0) / total)
      : 0;
    const criticalCount = lateEcheances.filter(e => differenceInDays(new Date(), new Date(e.due_date)) > 30).length;
    return { total, totalAmount, avgDaysLate, criticalCount };
  }, [lateEcheances]);

  const handlePayClick = (ech: EcheanceAchat) => {
    setSelectedEcheance(ech);
    setPaymentMethod("especes");
    setPayDialogOpen(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedEcheance) return;
    try {
      const userName = await fetchUserName();
      const methodLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod;
      await payMutation.mutateAsync({ id: selectedEcheance.id, paid_amount: Number(selectedEcheance.amount), payment_method: paymentMethod });
      toast.success("Échéance payée");
      setPayDialogOpen(false);

      const updatedEch: EcheanceAchat = {
        ...selectedEcheance,
        status: "paye",
        paid_amount: selectedEcheance.amount,
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: methodLabel,
      };
      await handleDownloadReceipt(updatedEch, userName);
    } catch {
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Échéances en retard</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-9 w-full sm:w-64" />
              {searchQuery && (
                <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setSearchQuery("")}>
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
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Date d'échéance</TableHead>
                    <TableHead>Retard</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lateEcheances.map((ech) => {
                    const daysLate = differenceInDays(new Date(), new Date(ech.due_date));
                    const isCritical = daysLate > 30;
                    return (
                      <TableRow key={ech.id}>
                        <TableCell>
                          <p className="font-medium">{ech.achats_immobiliers?.biens_achat?.title || "Bien"}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{ech.achats_immobiliers?.vendeurs?.name || "-"}</p>
                          <p className="text-sm text-muted-foreground">{ech.achats_immobiliers?.vendeurs?.phone || ""}</p>
                        </TableCell>
                        <TableCell>
                          {format(new Date(ech.due_date), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge className={isCritical ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-destructive/10 text-destructive border-destructive/30"}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {daysLate}j de retard
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(ech.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <SendAchatReminderDialog
                              echeanceId={ech.id}
                              vendeurName={ech.achats_immobiliers?.vendeurs?.name || "Vendeur"}
                              vendeurPhone={ech.achats_immobiliers?.vendeurs?.phone}
                              vendeurEmail={ech.achats_immobiliers?.vendeurs?.email}
                              bienTitle={ech.achats_immobiliers?.biens_achat?.title || "Bien"}
                              amount={ech.amount}
                              dueDate={ech.due_date}
                              isLate={true}
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Relancer
                                </Button>
                              }
                            />
                            <Button size="sm" onClick={() => handlePayClick(ech)} disabled={payMutation.isPending}>
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

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaisser l'échéance</DialogTitle>
          </DialogHeader>
          {selectedEcheance && (
            <div className="space-y-4">
              <div>
                <Label>Montant attendu</Label>
                <p className="text-lg font-semibold">{formatCurrency(selectedEcheance.amount)}</p>
              </div>
              <div>
                <Label>Bien</Label>
                <p className="font-medium">{selectedEcheance.achats_immobiliers?.biens_achat?.title || "Bien"}</p>
              </div>
              <div>
                <Label>Date d'échéance</Label>
                <p>{format(new Date(selectedEcheance.due_date), "dd MMMM yyyy", { locale: fr })}</p>
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleConfirmPay} disabled={payMutation.isPending}>
                  {payMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmer le paiement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
