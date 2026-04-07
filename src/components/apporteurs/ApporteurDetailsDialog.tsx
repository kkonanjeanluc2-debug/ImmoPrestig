import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Phone, Mail, MapPin, CreditCard, FileText, Download } from "lucide-react";
import { useApports, useCreateApport, useUpdateApport, useDeleteApport, type ApporteurAffaires } from "@/hooks/useApporteursAffaires";
import { useState } from "react";
import { AddApportDialog } from "./AddApportDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAgency } from "@/hooks/useAgency";
import { generateApportCommissionReceipt } from "@/lib/generateApportCommissionReceipt";
import { useReceiptTemplates } from "@/hooks/useReceiptTemplates";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apporteur: ApporteurAffaires;
}

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  payee: "Payée",
  annulee: "Annulée",
};

export function ApporteurDetailsDialog({ open, onOpenChange, apporteur }: Props) {
  const { data: apports, isLoading } = useApports(apporteur.id);
  const { data: agency } = useAgency();
  const { data: receiptTemplates } = useReceiptTemplates();
  const updateApport = useUpdateApport();
  const deleteApport = useDeleteApport();
  const [showAddApport, setShowAddApport] = useState(false);

  const defaultTemplate = receiptTemplates?.find(t => t.is_default) || receiptTemplates?.[0];

  const handleDownloadReceipt = async (apport: any) => {
    try {
      await generateApportCommissionReceipt({
        apporteurName: apporteur.name,
        apporteurPhone: apporteur.phone,
        apporteurEmail: apporteur.email,
        apporteurAddress: apporteur.address,
        apporteurCni: apporteur.cni_number,
        commissionPercentage: apport.commission_percentage,
        commissionAmount: apport.commission_amount || 0,
        apportDate: apport.apport_date,
        paidAt: apport.paid_at || new Date().toISOString(),
        description: apport.description,
        tenantName: apport.tenant?.name,
        propertyTitle: apport.property?.title,
        agency: agency || null,
        stampImageUrl: defaultTemplate?.stamp_image_url || null,
      });
      toast.success("Reçu téléchargé");
    } catch {
      toast.error("Erreur lors de la génération du reçu");
    }
  };

  const totalCommissions = apports?.reduce((sum, a) => sum + (a.commission_amount || 0), 0) || 0;
  const paidCommissions = apports?.filter(a => a.status === "payee").reduce((sum, a) => sum + (a.commission_amount || 0), 0) || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {apporteur.name}
              <Badge variant={apporteur.status === "actif" ? "default" : "outline"}>
                {apporteur.status === "actif" ? "Actif" : "Inactif"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Info section */}
          <div className="grid grid-cols-2 gap-4 py-2">
            {apporteur.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {apporteur.phone}
              </div>
            )}
            {apporteur.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {apporteur.email}
              </div>
            )}
            {apporteur.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {apporteur.address}
              </div>
            )}
            {apporteur.cni_number && (
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                CNI: {apporteur.cni_number}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Commission: {apporteur.commission_percentage}%
            </div>
          </div>

          {apporteur.notes && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{apporteur.notes}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-lg font-bold">{apports?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Apports</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-lg font-bold">{totalCommissions.toLocaleString()} F</div>
                <p className="text-xs text-muted-foreground">Total commissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-lg font-bold text-emerald-600">{paidCommissions.toLocaleString()} F</div>
                <p className="text-xs text-muted-foreground">Payées</p>
              </CardContent>
            </Card>
          </div>

          {/* Apports table */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Historique des apports</h3>
            <Button size="sm" onClick={() => setShowAddApport(true)} className="gap-1">
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-4">Chargement...</p>
          ) : !apports?.length ? (
            <p className="text-center text-muted-foreground py-6">Aucun apport enregistré</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apports.map(apport => (
                  <TableRow key={apport.id}>
                    <TableCell className="text-sm">
                      {format(new Date(apport.apport_date), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {apport.description || "-"}
                      {apport.tenant && <div className="text-xs text-muted-foreground">Locataire: {apport.tenant.name}</div>}
                      {apport.property && <div className="text-xs text-muted-foreground">Bien: {apport.property.title}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{apport.commission_amount?.toLocaleString() || "-"} F</div>
                      <div className="text-xs text-muted-foreground">{apport.commission_percentage}%</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={apport.status === "payee" ? "default" : apport.status === "annulee" ? "destructive" : "secondary"}>
                        {STATUS_LABELS[apport.status] || apport.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {apport.status === "payee" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReceipt(apport)}
                            title="Télécharger le reçu"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        {apport.status === "en_attente" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateApport.mutate({ id: apport.id, status: "payee", paid_at: new Date().toISOString() } as any)}
                          >
                            Payer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteApport.mutate(apport.id)}
                        >
                          Suppr.
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <AddApportDialog
        open={showAddApport}
        onOpenChange={setShowAddApport}
        apporteur={apporteur}
      />
    </>
  );
}
