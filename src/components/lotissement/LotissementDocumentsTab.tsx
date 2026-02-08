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
  Plus,
  FileText,
  Download,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useLotissementDocuments, useDeleteLotissementDocument } from "@/hooks/useLotissementDocuments";
import { usePermissions } from "@/hooks/usePermissions";
import { AddLotissementDocumentDialog } from "./AddLotissementDocumentDialog";
import { toast } from "sonner";

interface LotissementDocumentsTabProps {
  lotissementId: string;
  lotissementName: string;
}

const documentTypeLabels: Record<string, string> = {
  titre_foncier: "Titre foncier",
  permis_lotir: "Permis de lotir",
  arrete_approbation: "Arrêté d'approbation",
  plan_cadastral: "Plan cadastral",
  certificat_conformite: "Certificat de conformité",
  pv_famille: "PV de famille",
  convention: "Convention",
  contrat_prefinancement: "Contrat de préfinancement",
  attestation_villageoise: "Attestation villageoise",
  lettre_attribution: "Lettre d'attribution",
  certificat_propriete: "Certificat de propriété coutumière",
  acd: "Arrêté de Concession Définitive (ACD)",
  autre: "Autre document",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "En attente", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  valid: { label: "Valide", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  expired: { label: "Expiré", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  rejected: { label: "Rejeté", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export function LotissementDocumentsTab({ lotissementId, lotissementName }: LotissementDocumentsTabProps) {
  const { data: documents, isLoading } = useLotissementDocuments(lotissementId);
  const deleteDocument = useDeleteLotissementDocument();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("can_create_lotissement_documents");
  const canDelete = hasPermission("can_delete_lotissements");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le document "${name}" ?`)) return;
    try {
      await deleteDocument.mutateAsync({ id, name });
      toast.success("Document supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents légaux
        </CardTitle>
        {canCreate && (
          <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : !documents || documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun document légal enregistré
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Date d'émission</TableHead>
                <TableHead>Expiration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{documentTypeLabels[doc.type] || doc.type}</TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell>{doc.reference_number || "-"}</TableCell>
                  <TableCell>
                    {doc.issued_date
                      ? format(new Date(doc.issued_date), "dd MMM yyyy", { locale: fr })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {doc.expiry_date
                      ? format(new Date(doc.expiry_date), "dd MMM yyyy", { locale: fr })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {doc.file_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id, doc.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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

      <AddLotissementDocumentDialog
        lotissementId={lotissementId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </Card>
  );
}
