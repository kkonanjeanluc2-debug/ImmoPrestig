import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  FileText,
  Calendar,
  Building2,
  User,
  RefreshCw,
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  PenTool,
} from "lucide-react";
import { useContracts, useUpdateContract, useExpireContract } from "@/hooks/useContracts";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { useOwners } from "@/hooks/useOwners";
import { useCurrentUserRole } from "@/hooks/useUserRoles";
import { format, differenceInDays, addMonths, addYears } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { ExportDropdown } from "@/components/export/ExportDropdown";
import { GenerateContractDialog } from "@/components/contract/GenerateContractDialog";
import { SignContractDialog } from "@/components/signature/SignContractDialog";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Actif", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  expired: { label: "Expiré", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  terminated: { label: "Résilié", variant: "secondary", icon: <AlertTriangle className="h-3 w-3" /> },
};

const signatureStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Non signé", variant: "outline", icon: <PenTool className="h-3 w-3" /> },
  landlord_signed: { label: "Signé bailleur", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  tenant_signed: { label: "Signé locataire", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  fully_signed: { label: "Signé", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const Contracts = () => {
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: properties } = useProperties();
  const { data: tenants } = useTenants();
  const { data: owners } = useOwners();
  const { data: userRole } = useCurrentUserRole();
  const updateContract = useUpdateContract();
  const expireContract = useExpireContract();
  
  const isLocataire = userRole?.role === "locataire";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [signatureFilter, setSignatureFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [renewDuration, setRenewDuration] = useState("12");
  const [renewDurationType, setRenewDurationType] = useState<"months" | "years">("months");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [contractToGenerate, setContractToGenerate] = useState<any>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [contractToSign, setContractToSign] = useState<any>(null);

  // Get property and tenant names for display
  const getPropertyName = (propertyId: string) => {
    const property = properties?.find((p) => p.id === propertyId);
    return property?.title || "Bien inconnu";
  };

  const getTenantName = (tenantId: string) => {
    const tenant = tenants?.find((t) => t.id === tenantId);
    return tenant?.name || "Locataire inconnu";
  };

  // Filter contracts
  const filteredContracts = contracts?.filter((contract) => {
    const propertyName = getPropertyName(contract.property_id).toLowerCase();
    const tenantName = getTenantName(contract.tenant_id).toLowerCase();
    const matchesSearch =
      propertyName.includes(searchQuery.toLowerCase()) ||
      tenantName.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    const matchesSignature = signatureFilter === "all" || (contract.signature_status || "pending") === signatureFilter;
    
    // Filter by owner
    const property = properties?.find((p) => p.id === contract.property_id);
    const matchesOwner = ownerFilter === "all" || property?.owner_id === ownerFilter;
    
    return matchesSearch && matchesStatus && matchesSignature && matchesOwner;
  });

  // Calculate days remaining
  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(new Date(endDate), new Date());
    return days;
  };

  // Handle contract renewal
  const handleRenew = async () => {
    if (!selectedContract) return;

    try {
      const duration = parseInt(renewDuration);
      const currentEndDate = new Date(selectedContract.end_date);
      const newEndDate =
        renewDurationType === "months"
          ? addMonths(currentEndDate, duration)
          : addYears(currentEndDate, duration);

      await updateContract.mutateAsync({
        id: selectedContract.id,
        end_date: format(newEndDate, "yyyy-MM-dd"),
        status: "active",
      });

      toast.success("Contrat renouvelé avec succès");
      setRenewDialogOpen(false);
      setSelectedContract(null);
    } catch (error) {
      toast.error("Erreur lors du renouvellement du contrat");
    }
  };

  // Handle contract termination
  const handleTerminate = async (contract: any) => {
    try {
      await expireContract.mutateAsync({
        contractId: contract.id,
        propertyId: contract.property_id,
        unitId: contract.unit_id,
      });
      toast.success("Contrat résilié avec succès");
    } catch (error) {
      toast.error("Erreur lors de la résiliation du contrat");
    }
  };

  // Prepare data for export - transform to flat structure
  const exportData = filteredContracts?.map((contract) => ({
    tenantName: getTenantName(contract.tenant_id),
    propertyName: getPropertyName(contract.property_id),
    startDate: format(new Date(contract.start_date), "dd/MM/yyyy"),
    endDate: format(new Date(contract.end_date), "dd/MM/yyyy"),
    rentAmount: `${contract.rent_amount?.toLocaleString()} FCFA`,
    deposit: contract.deposit ? `${contract.deposit.toLocaleString()} FCFA` : "-",
    statusLabel: statusConfig[contract.status]?.label || contract.status,
  })) || [];

  const exportColumns = [
    { key: "tenantName" as const, label: "Locataire" },
    { key: "propertyName" as const, label: "Bien" },
    { key: "startDate" as const, label: "Date début" },
    { key: "endDate" as const, label: "Date fin" },
    { key: "rentAmount" as const, label: "Loyer" },
    { key: "deposit" as const, label: "Caution" },
    { key: "statusLabel" as const, label: "Statut" },
  ];
  if (contractsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Gestion des Contrats
            </h1>
            <p className="text-muted-foreground">
              {contracts?.length || 0} contrat{(contracts?.length || 0) > 1 ? "s" : ""} au total
            </p>
          </div>
          <ExportDropdown
            data={exportData}
            filename="contrats"
            columns={exportColumns}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contrats</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actifs</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {contracts?.filter((c) => c.status === "active").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expirés</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {contracts?.filter((c) => c.status === "expired").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expire bientôt</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {contracts?.filter((c) => c.status === "active" && getDaysRemaining(c.end_date) <= 30 && getDaysRemaining(c.end_date) > 0).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Dans les 30 jours</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par locataire ou bien..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="expired">Expirés</SelectItem>
                  <SelectItem value="terminated">Résiliés</SelectItem>
                </SelectContent>
              </Select>
              <Select value={signatureFilter} onValueChange={setSignatureFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Signature" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Toutes signatures</SelectItem>
                  <SelectItem value="pending">Non signés</SelectItem>
                  <SelectItem value="landlord_signed">Signés bailleur</SelectItem>
                  <SelectItem value="fully_signed">Signés complet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Propriétaire" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Tous les propriétaires</SelectItem>
                  {owners?.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contracts Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Bien</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Loyer</TableHead>
                  <TableHead>Jours restants</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun contrat trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts?.map((contract) => {
                    const daysRemaining = getDaysRemaining(contract.end_date);
                    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
                    const status = statusConfig[contract.status] || statusConfig.active;

                    return (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {getTenantName(contract.tenant_id)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{getPropertyName(contract.property_id)}</span>
                            {contract.unit && (
                              <Badge variant="outline" className="text-xs">
                                {contract.unit.unit_number}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(contract.start_date), "dd MMM yyyy", { locale: fr })}
                              {" → "}
                              {format(new Date(contract.end_date), "dd MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {contract.rent_amount?.toLocaleString()} FCFA
                          </span>
                        </TableCell>
                        <TableCell>
                          {contract.status === "active" ? (
                            <Badge
                              variant={daysRemaining <= 0 ? "destructive" : isExpiringSoon ? "outline" : "secondary"}
                              className={isExpiringSoon ? "border-orange-500 text-orange-600" : ""}
                            >
                              {daysRemaining <= 0 ? "Expiré" : `${daysRemaining} jours`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const sigStatus = signatureStatusConfig[contract.signature_status || "pending"];
                            return (
                              <Badge variant={sigStatus.variant} className="gap-1">
                                {sigStatus.icon}
                                {sigStatus.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Sign Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setContractToSign(contract);
                                setSignDialogOpen(true);
                              }}
                            >
                              <PenTool className="h-4 w-4 mr-1" />
                              Signer
                            </Button>
                            {/* Generate PDF Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setContractToGenerate(contract);
                                setGenerateDialogOpen(true);
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                            {/* Renew Button - Hidden for tenants */}
                            {!isLocataire && (
                            <Dialog open={renewDialogOpen && selectedContract?.id === contract.id} onOpenChange={(open) => {
                              setRenewDialogOpen(open);
                              if (!open) setSelectedContract(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedContract(contract)}
                                  disabled={contract.status === "terminated"}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Renouveler
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Renouveler le contrat</DialogTitle>
                                  <DialogDescription>
                                    Prolongez le contrat de {getTenantName(contract.tenant_id)} pour le bien {getPropertyName(contract.property_id)}.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Durée</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={renewDuration}
                                        onChange={(e) => setRenewDuration(e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Unité</Label>
                                      <Select value={renewDurationType} onValueChange={(v) => setRenewDurationType(v as "months" | "years")}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="months">Mois</SelectItem>
                                          <SelectItem value="years">Années</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                      Date de fin actuelle:{" "}
                                      <span className="font-medium text-foreground">
                                        {format(new Date(contract.end_date), "dd MMMM yyyy", { locale: fr })}
                                      </span>
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Nouvelle date de fin:{" "}
                                      <span className="font-medium text-green-600">
                                        {format(
                                          renewDurationType === "months"
                                            ? addMonths(new Date(contract.end_date), parseInt(renewDuration) || 0)
                                            : addYears(new Date(contract.end_date), parseInt(renewDuration) || 0),
                                          "dd MMMM yyyy",
                                          { locale: fr }
                                        )}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
                                    Annuler
                                  </Button>
                                  <Button onClick={handleRenew} disabled={updateContract.isPending}>
                                    {updateContract.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Confirmer le renouvellement
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            )}

                            {/* Terminate Button - Hidden for tenants */}
                            {!isLocataire && contract.status === "active" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Résilier
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Résilier le contrat ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action va résilier le contrat de{" "}
                                      <strong>{getTenantName(contract.tenant_id)}</strong> pour le bien{" "}
                                      <strong>{getPropertyName(contract.property_id)}</strong>.
                                      {contract.unit_id && " L'unité sera marquée comme disponible."}
                                      {!contract.unit_id && " Le bien sera marqué comme disponible."}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleTerminate(contract)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Confirmer la résiliation
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Generate Contract Dialog */}
        {contractToGenerate && (
          <GenerateContractDialog
            open={generateDialogOpen}
            onOpenChange={(open) => {
              setGenerateDialogOpen(open);
              if (!open) setContractToGenerate(null);
            }}
            contractData={{
              contractId: contractToGenerate.id,
              tenantName: getTenantName(contractToGenerate.tenant_id),
              tenantEmail: tenants?.find((t) => t.id === contractToGenerate.tenant_id)?.email,
              tenantPhone: tenants?.find((t) => t.id === contractToGenerate.tenant_id)?.phone || undefined,
              tenantBirthDate: (tenants?.find((t) => t.id === contractToGenerate.tenant_id) as any)?.birth_date || undefined,
              tenantBirthPlace: (tenants?.find((t) => t.id === contractToGenerate.tenant_id) as any)?.birth_place || undefined,
              tenantProfession: (tenants?.find((t) => t.id === contractToGenerate.tenant_id) as any)?.profession || undefined,
              tenantCniNumber: (tenants?.find((t) => t.id === contractToGenerate.tenant_id) as any)?.cni_number || undefined,
              tenantEmergencyContact: (tenants?.find((t) => t.id === contractToGenerate.tenant_id) as any)?.emergency_contact_name || undefined,
              tenantEmergencyPhone: (tenants?.find((t) => t.id === contractToGenerate.tenant_id) as any)?.emergency_contact_phone || undefined,
              propertyTitle: getPropertyName(contractToGenerate.property_id),
              propertyAddress: properties?.find((p) => p.id === contractToGenerate.property_id)?.address,
              unitNumber: contractToGenerate.unit?.unit_number,
              rentAmount: contractToGenerate.rent_amount,
              deposit: contractToGenerate.deposit || undefined,
              startDate: contractToGenerate.start_date,
              endDate: contractToGenerate.end_date,
              ownerName: (() => {
                const property = properties?.find((p) => p.id === contractToGenerate.property_id);
                if (property?.owner_id) {
                  return owners?.find((o) => o.id === property.owner_id)?.name;
                }
                return undefined;
              })(),
              owner: (() => {
                const property = properties?.find((p) => p.id === contractToGenerate.property_id);
                if (property?.owner_id) {
                  const owner = owners?.find((o) => o.id === property.owner_id) as any;
                  if (owner) {
                    return {
                      name: owner.name,
                      email: owner.email || undefined,
                      phone: owner.phone || undefined,
                      address: owner.address || undefined,
                      birth_date: owner.birth_date || undefined,
                      birth_place: owner.birth_place || undefined,
                      profession: owner.profession || undefined,
                      cni_number: owner.cni_number || undefined,
                      management_type: owner.management_type ? {
                        name: owner.management_type.name,
                        type: owner.management_type.type,
                        percentage: owner.management_type.percentage,
                      } : null,
                    };
                  }
                }
                return null;
              })(),
            }}
          />
        )}

        {/* Sign Contract Dialog */}
        {contractToSign && (
          <SignContractDialog
            open={signDialogOpen}
            onOpenChange={(open) => {
              setSignDialogOpen(open);
              if (!open) setContractToSign(null);
            }}
            contractData={{
              contractId: contractToSign.id,
              tenantName: getTenantName(contractToSign.tenant_id),
              tenantEmail: tenants?.find((t) => t.id === contractToSign.tenant_id)?.email,
              tenantHasPortalAccess: tenants?.find((t) => t.id === contractToSign.tenant_id)?.has_portal_access,
              propertyTitle: getPropertyName(contractToSign.property_id),
              rentAmount: contractToSign.rent_amount,
              startDate: contractToSign.start_date,
              endDate: contractToSign.end_date,
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Contracts;
