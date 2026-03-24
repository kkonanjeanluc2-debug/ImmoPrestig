import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, MoreVertical, Download, ArrowRightLeft, Trash2, Eye, Send, CheckCircle, XCircle } from "lucide-react";
import { useProformaInvoices, useConvertToInvoice, useUpdateProformaStatus, useDeleteProforma, ProformaInvoice } from "@/hooks/useProformaInvoices";
import { CreateProformaDialog } from "./CreateProformaDialog";
import { generateProformaPDF } from "@/lib/generateProformaPDF";
import { useAgency } from "@/hooks/useAgency";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  sent: { label: "Envoyée", variant: "outline" },
  validated: { label: "Validée", variant: "default" },
  converted: { label: "Convertie", variant: "default" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  proforma: { label: "Proforma", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  definitive: { label: "Facture", color: "bg-emerald/10 text-emerald" },
};

interface Props {
  tenantId?: string;
  compact?: boolean;
}

export function ProformaInvoicesList({ tenantId, compact = false }: Props) {
  const { data: invoices, isLoading } = useProformaInvoices(tenantId);
  const convertToInvoice = useConvertToInvoice();
  const updateStatus = useUpdateProformaStatus();
  const deleteProforma = useDeleteProforma();
  const { data: agency } = useAgency();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "proforma" | "definitive">("all");

  const filtered = (invoices || []).filter((inv) =>
    filter === "all" ? true : inv.invoice_type === filter
  );

  const handleExportPDF = (invoice: ProformaInvoice) => {
    generateProformaPDF(invoice, agency);
  };

  const handleConvert = (id: string) => {
    convertToInvoice.mutate(id);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteProforma.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Factures</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!compact && (
              <div className="flex gap-1">
                {(["all", "proforma", "definitive"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "Toutes" : f === "proforma" ? "Proforma" : "Définitives"}
                  </Button>
                ))}
              </div>
            )}
            <CreateProformaDialog preselectedTenantId={tenantId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune facture trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">N°</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  {!compact && <TableHead className="text-xs">Bien</TableHead>}
                  <TableHead className="text-xs text-right">Montant</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const st = statusConfig[inv.status] || statusConfig.draft;
                  const tp = typeConfig[inv.invoice_type] || typeConfig.proforma;

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-mono font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tp.color}`}>
                          {tp.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <span className="font-medium">{inv.tenant_name}</span>
                          {inv.unit_number && (
                            <span className="text-muted-foreground"> ({inv.unit_number})</span>
                          )}
                        </div>
                      </TableCell>
                      {!compact && (
                        <TableCell className="text-xs text-muted-foreground">{inv.property_name || "—"}</TableCell>
                      )}
                      <TableCell className="text-xs text-right font-semibold">
                        {inv.total_amount.toLocaleString("fr-FR")} F CFA
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(inv.created_at), "dd MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover z-50">
                            <DropdownMenuItem onClick={() => handleExportPDF(inv)} className="gap-2 text-xs">
                              <Download className="h-3.5 w-3.5" /> Télécharger PDF
                            </DropdownMenuItem>
                            {inv.invoice_type === "proforma" && inv.status !== "converted" && inv.status !== "cancelled" && (
                              <>
                                {inv.status === "draft" && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "sent")} className="gap-2 text-xs">
                                    <Send className="h-3.5 w-3.5" /> Marquer envoyée
                                  </DropdownMenuItem>
                                )}
                                {(inv.status === "draft" || inv.status === "sent") && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "validated")} className="gap-2 text-xs">
                                    <CheckCircle className="h-3.5 w-3.5" /> Valider
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleConvert(inv.id)} className="gap-2 text-xs">
                                  <ArrowRightLeft className="h-3.5 w-3.5" /> Convertir en facture
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, "cancelled")} className="gap-2 text-xs text-destructive">
                                  <XCircle className="h-3.5 w-3.5" /> Annuler
                                </DropdownMenuItem>
                              </>
                            )}
                            {inv.status === "draft" && (
                              <DropdownMenuItem onClick={() => setDeleteId(inv.id)} className="gap-2 text-xs text-destructive">
                                <Trash2 className="h-3.5 w-3.5" /> Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
