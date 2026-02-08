import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Trash2,
  Filter,
  FolderOpen,
  FileCheck,
  Receipt,
  File,
  Calendar,
  Building2,
  User,
  Loader2
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocuments, useDeleteDocument, DocumentWithDetails } from "@/hooks/useDocuments";
import { AddDocumentDialog } from "@/components/document/AddDocumentDialog";
import { ViewDocumentDialog } from "@/components/document/ViewDocumentDialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  contract: { label: "Contrat", icon: FileCheck, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  receipt: { label: "Quittance", icon: Receipt, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  invoice: { label: "Facture", icon: FileText, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  other: { label: "Autre", icon: File, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" }
};

const statusConfig: Record<string, { label: string; color: string }> = {
  valid: { label: "Valide", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  expired: { label: "Expiré", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
};

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full ${color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentCard({ document, onDelete, canDelete }: { document: DocumentWithDetails; onDelete: (id: string, name: string) => void; canDelete: boolean }) {
  const [viewOpen, setViewOpen] = useState(false);
  const typeInfo = typeConfig[document.type] || typeConfig.other;
  const statusInfo = statusConfig[document.status] || statusConfig.valid;
  const TypeIcon = typeInfo.icon;

  const handleDownload = () => {
    if (document.file_url) {
      const link = window.document.createElement("a");
      link.href = document.file_url;
      link.download = document.name;
      link.target = "_blank";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } else {
      toast.error("Aucun fichier disponible pour ce document");
    }
  };

  const handleView = () => {
    if (document.file_url) {
      setViewOpen(true);
    } else {
      toast.error("Aucun fichier disponible pour ce document");
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Icon */}
            <div className={`h-12 w-12 rounded-lg ${typeInfo.color} flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className="h-6 w-6" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{document.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className={typeInfo.color}>
                      {typeInfo.label}
                    </Badge>
                    <Badge variant="secondary" className={statusInfo.color}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{document.file_size || '-'}</span>
              </div>

              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {document.property && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{(document.property as any)?.title || 'Bien non assigné'}</span>
                  </div>
                )}
                {document.tenant && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{(document.tenant as any)?.name || 'Locataire non assigné'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>{new Date(document.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none"
                  onClick={handleView}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Voir</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-none"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Télécharger</span>
                </Button>
                {canDelete && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(document.id, document.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ViewDocumentDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        document={{
          name: document.name,
          file_url: document.file_url,
          type: document.type,
        }}
      />
    </>
  );
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("can_create_documents");
  const canDelete = hasPermission("can_delete_documents");

  const { data: documents, isLoading, error } = useDocuments();
  const deleteDocument = useDeleteDocument();

  const stats = {
    total: documents?.length || 0,
    contracts: documents?.filter(d => d.type === "contract").length || 0,
    receipts: documents?.filter(d => d.type === "receipt").length || 0,
    expired: documents?.filter(d => d.status === "expired").length || 0
  };

  const filteredDocuments = (documents || []).filter(doc => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.property as any)?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tenant as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteDocument.mutateAsync({ id, name });
      toast.success("Document supprimé avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Documents</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos contrats, quittances et fichiers
            </p>
          </div>
          {canCreate && <AddDocumentDialog />}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total documents" 
            value={stats.total} 
            icon={FolderOpen} 
            color="bg-navy" 
          />
          <StatCard 
            title="Contrats" 
            value={stats.contracts} 
            icon={FileCheck} 
            color="bg-blue-500" 
          />
          <StatCard 
            title="Quittances" 
            value={stats.receipts} 
            icon={Receipt} 
            color="bg-emerald" 
          />
          <StatCard 
            title="Expirés" 
            value={stats.expired} 
            icon={FileText} 
            color="bg-red-500" 
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    <SelectItem value="contract">Contrats</SelectItem>
                    <SelectItem value="receipt">Quittances</SelectItem>
                    <SelectItem value="invoice">Factures</SelectItem>
                    <SelectItem value="other">Autres</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="valid">Valide</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="expired">Expiré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Erreur lors du chargement des documents.</p>
          </div>
        )}

        {/* Documents List */}
        {!isLoading && !error && (
          <div className="grid gap-4">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((document) => (
                <DocumentCard key={document.id} document={document} onDelete={handleDelete} canDelete={canDelete} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {documents?.length === 0 
                      ? "Aucun document enregistré. Ajoutez votre premier document !"
                      : "Aucun document trouvé."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
