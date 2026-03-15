import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEcheancesAchats, usePayEcheanceAchat } from "@/hooks/useEcheancesAchats";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/pdfFormat";
import { format, differenceInDays, isPast, isToday, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { generateEcheanceReceipt } from "@/lib/generateEcheanceReceipt";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Check, Clock, AlertTriangle, Loader2, Search, X, Download, Mail } from "lucide-react";
import { SendAchatReminderDialog } from "./SendAchatReminderDialog";

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte bancaire" },
];

export function EcheancesAchatsList() {
  const { data: echeances, isLoading } = useEcheancesAchats();
  const { data: agency } = useAgency();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canEditAchats = hasPermission("can_edit_achats");
  const payMutation = usePayEcheanceAchat();

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedEcheance, setSelectedEcheance] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const fetchUserName = async () => {
    if (!user) return "Agent";
    const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    return data?.full_name || "Agent";
  };

  const availableMonths = useMemo(() => {
    if (!echeances) return [];
    const monthsSet = new Set<string>();
    echeances.forEach((e) => {
      monthsSet.add(format(parseISO(e.due_date), "yyyy-MM"));
    });
    return Array.from(monthsSet).sort().map((m) => ({
      value: m,
      label: format(parseISO(`${m}-01`), "MMMM yyyy", { locale: fr }),
    }));
  }, [echeances]);

  const filteredEcheances = useMemo(() => {
    if (!echeances) return [];
    return echeances.filter((ech) => {
      if (selectedMonth !== "all") {
        const d = parseISO(ech.due_date);
        const sd = parseISO(`${selectedMonth}-01`);
        if (!isWithinInterval(d, { start: startOfMonth(sd), end: endOfMonth(sd) })) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = ech.achats_immobiliers?.biens_achat?.title?.toLowerCase() || "";
        const vendeur = ech.achats_immobiliers?.vendeurs?.name?.toLowerCase() || "";
        const acquereur = ech.achats_immobiliers?.acquereurs?.name?.toLowerCase() || "";
        const amount = ech.amount.toString();
        return title.includes(q) || vendeur.includes(q) || acquereur.includes(q) || amount.includes(q);
      }
      return true;
    });
  }, [echeances, selectedMonth, searchQuery]);

  const getStatusBadge = (ech: any) => {
    if (ech.status === "paye") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          <Check className="h-3 w-3 mr-1" />
          Payé
        </Badge>
      );
    }
    const dueDate = new Date(ech.due_date);
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

  const handlePayClick = (ech: any) => {
    setSelectedEcheance(ech);
    setPaymentMethod("especes");
    setPayDialogOpen(true);
  };

  const handleDownloadReceipt = async (ech: any, validatedByName?: string) => {
    try {
      const sameAchat = echeances?.filter(e => e.achat_id === ech.achat_id).sort((a, b) => a.due_date.localeCompare(b.due_date)) || [];
      const echeanceNumber = sameAchat.findIndex(e => e.id === ech.id) + 1;
      let name = validatedByName;
      if (!name) name = await fetchUserName();

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

  const handleConfirmPay = async () => {
    if (!selectedEcheance) return;
    try {
      const userName = await fetchUserName();
      const methodLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod;
      await payMutation.mutateAsync({ id: selectedEcheance.id, paid_amount: Number(selectedEcheance.amount), payment_method: paymentMethod });
      toast.success("Échéance payée");
      setPayDialogOpen(false);

      const updatedEch = {
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
        <CardHeader><CardTitle>Échéances</CardTitle></CardHeader>
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
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Échéances de paiement
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 w-full sm:w-64"
                />
                {searchQuery && (
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0" onClick={() => setSearchQuery("")}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Tous les mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!echeances?.length ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune échéance d'achat</p>
              <p className="text-sm text-muted-foreground mt-1">Les échéances apparaîtront ici lors d'achats échelonnés</p>
            </div>
          ) : filteredEcheances.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune échéance trouvée</p>
              <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedMonth("all"); }}>
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bien</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Date d'échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEcheances.map((ech) => (
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
                      <TableCell className="font-medium">
                        {formatCurrency(ech.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(ech)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ech.status !== "paye" && canEditAchats && (
                            <Button size="sm" onClick={() => handlePayClick(ech)} disabled={payMutation.isPending}>
                              <Check className="h-4 w-4 mr-2" />
                              Encaisser
                            </Button>
                          )}
                          {ech.status === "paye" && (
                            <div className="flex items-center gap-2">
                              {ech.paid_date && (
                                <span className="text-sm text-muted-foreground">
                                  Payé le {format(new Date(ech.paid_date), "dd/MM/yyyy")}
                                </span>
                              )}
                              <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(ech)}>
                                <Download className="h-4 w-4 mr-1" />
                                Reçu
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment dialog */}
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
