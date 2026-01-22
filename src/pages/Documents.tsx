import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Upload, 
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
  User
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DocumentType = "contract" | "receipt" | "invoice" | "other";
type DocumentStatus = "valid" | "expired" | "pending";

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  property: string;
  tenant?: string;
  date: string;
  size: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Contrat de bail - Apt 12B",
    type: "contract",
    status: "valid",
    property: "Résidence Les Palmiers",
    tenant: "Kouamé Yao",
    date: "2024-01-15",
    size: "2.4 MB"
  },
  {
    id: "2",
    name: "Quittance Janvier 2024",
    type: "receipt",
    status: "valid",
    property: "Villa Cocody",
    tenant: "Adjoua Bamba",
    date: "2024-01-31",
    size: "156 KB"
  },
  {
    id: "3",
    name: "Contrat de bail - Studio 3",
    type: "contract",
    status: "expired",
    property: "Immeuble Plateau",
    tenant: "Konan Serge",
    date: "2023-06-01",
    size: "1.8 MB"
  },
  {
    id: "4",
    name: "Facture travaux plomberie",
    type: "invoice",
    status: "valid",
    property: "Résidence Les Palmiers",
    date: "2024-01-20",
    size: "890 KB"
  },
  {
    id: "5",
    name: "État des lieux entrée",
    type: "other",
    status: "valid",
    property: "Villa Cocody",
    tenant: "Adjoua Bamba",
    date: "2024-01-10",
    size: "5.2 MB"
  },
  {
    id: "6",
    name: "Quittance Décembre 2023",
    type: "receipt",
    status: "valid",
    property: "Immeuble Plateau",
    tenant: "Diabaté Fanta",
    date: "2023-12-31",
    size: "148 KB"
  },
  {
    id: "7",
    name: "Avenant contrat - Apt 5A",
    type: "contract",
    status: "pending",
    property: "Résidence Les Palmiers",
    tenant: "Ouattara Ibrahim",
    date: "2024-01-25",
    size: "1.1 MB"
  },
  {
    id: "8",
    name: "Attestation d'assurance",
    type: "other",
    status: "valid",
    property: "Villa Cocody",
    date: "2024-01-05",
    size: "320 KB"
  }
];

const typeConfig: Record<DocumentType, { label: string; icon: React.ElementType; color: string }> = {
  contract: { label: "Contrat", icon: FileCheck, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  receipt: { label: "Quittance", icon: Receipt, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  invoice: { label: "Facture", icon: FileText, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  other: { label: "Autre", icon: File, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" }
};

const statusConfig: Record<DocumentStatus, { label: string; color: string }> = {
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

function DocumentCard({ document }: { document: Document }) {
  const typeInfo = typeConfig[document.type];
  const statusInfo = statusConfig[document.status];
  const TypeIcon = typeInfo.icon;

  return (
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
              <span className="text-xs text-muted-foreground whitespace-nowrap">{document.size}</span>
            </div>

            <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{document.property}</span>
              </div>
              {document.tenant && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{document.tenant}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{new Date(document.date).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Eye className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Voir</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Télécharger</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const stats = {
    total: mockDocuments.length,
    contracts: mockDocuments.filter(d => d.type === "contract").length,
    receipts: mockDocuments.filter(d => d.type === "receipt").length,
    expired: mockDocuments.filter(d => d.status === "expired").length
  };

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tenant && doc.tenant.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

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
          <Button className="bg-emerald hover:bg-emerald/90 w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
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

        {/* Documents List */}
        <div className="grid gap-4">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun document trouvé</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
