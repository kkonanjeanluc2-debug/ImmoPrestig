import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, UserMinus, Crown, Download, Loader2, Phone, Mail, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useColocationTenants, useAddColocationTenant, useRemoveColocationTenant } from "@/hooks/useColocationTenants";
import { useTenants, useCreateTenant } from "@/hooks/useTenants";
import { generateColocationContractPDF } from "@/lib/generateColocationContract";
import { DEFAULT_COLOCATION_CONTRACT_TEMPLATE } from "@/lib/colocationContractDefaults";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

interface ColocationTenantsManagerProps {
  contractId: string;
  contract: {
    id: string;
    start_date: string;
    end_date: string;
    rent_amount: number;
    deposit: number | null;
    status: string;
    property_id?: string;
    property?: {
      title?: string;
      address?: string;
    } | null;
    unit?: { unit_number?: string } | null;
    tenant?: { id: string; name: string } | null;
  };
  canEdit?: boolean;
}

export function ColocationTenantsManager({ contractId, contract, canEdit = true }: ColocationTenantsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantPhone, setNewTenantPhone] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantProfession, setNewTenantProfession] = useState("");
  const [rentShare, setRentShare] = useState("");

  const { data: colocationTenants = [], isLoading } = useColocationTenants(contractId);
  const { data: allTenants = [] } = useTenants();
  const { data: agency } = useAgency();
  const addColocationTenant = useAddColocationTenant();
  const removeColocationTenant = useRemoveColocationTenant();
  const createTenant = useCreateTenant();

  // Filter out tenants already in this colocation
  const existingTenantIds = colocationTenants.map(ct => ct.tenant_id);
  const availableTenants = allTenants.filter(
    t => !existingTenantIds.includes(t.id) && !t.deleted_at
  );

  const resetNewTenantForm = () => {
    setNewTenantName("");
    setNewTenantPhone("");
    setNewTenantEmail("");
    setNewTenantProfession("");
  };

  const handleAddExistingTenant = async () => {
    if (!selectedTenantId) return;
    try {
      await addColocationTenant.mutateAsync({
        contract_id: contractId,
        tenant_id: selectedTenantId,
        is_principal: colocationTenants.length === 0,
        start_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Colocataire ajouté avec succès");
      setAddDialogOpen(false);
      setSelectedTenantId("");
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'ajout du colocataire");
    }
  };

  const handleAddNewTenant = async () => {
    if (!newTenantName.trim()) return;
    try {
      // Create tenant first
      const newTenant = await createTenant.mutateAsync({
        name: newTenantName.trim(),
        phone: newTenantPhone.trim() || null,
        email: newTenantEmail.trim() || null,
        profession: newTenantProfession.trim() || null,
        property_id: contract.property_id || null,
      });

      // Then add as colocation tenant
      await addColocationTenant.mutateAsync({
        contract_id: contractId,
        tenant_id: newTenant.id,
        is_principal: colocationTenants.length === 0,
        start_date: new Date().toISOString().split("T")[0],
      });

      toast.success("Nouveau colocataire créé et ajouté");
      setAddDialogOpen(false);
      resetNewTenantForm();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la création du colocataire");
    }
  };

  const handleRemoveTenant = async (id: string) => {
    try {
      await removeColocationTenant.mutateAsync({ id, contractId });
      toast.success("Colocataire retiré avec succès");
      setRemoveDialogOpen(null);
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du retrait du colocataire");
    }
  };

  const handleDownloadContract = async () => {
    setDownloading(true);
    try {
      const colocataires = colocationTenants
        .filter(ct => ct.status === "active")
        .map(ct => ({
          name: ct.tenant?.name || "Inconnu",
          phone: ct.tenant?.phone,
          email: ct.tenant?.email,
          profession: ct.tenant?.profession,
          isPrincipal: ct.is_principal,
        }));

      if (colocataires.length === 0) {
        toast.error("Aucun colocataire actif pour générer le contrat");
        return;
      }

      await generateColocationContractPDF({
        templateContent: DEFAULT_COLOCATION_CONTRACT_TEMPLATE,
        colocataires,
        propertyTitle: contract.property?.title || "",
        propertyAddress: contract.property?.address,
        unitNumber: contract.unit?.unit_number,
        rentAmount: contract.rent_amount,
        deposit: contract.deposit || undefined,
        startDate: contract.start_date,
        endDate: contract.end_date,
        agencyName: agency?.name || "",
        agencyEmail: agency?.email,
        agencyPhone: agency?.phone || undefined,
        agencyAddress: agency?.address || undefined,
        agencyCity: agency?.city || undefined,
        logoUrl: agency?.logo_url,
      });
      toast.success("Contrat de colocation téléchargé");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération du contrat");
    } finally {
      setDownloading(false);
    }
  };

  const activeTenants = colocationTenants.filter(ct => ct.status === "active");
  const departedTenants = colocationTenants.filter(ct => ct.status === "departed");
  const isAdding = addColocationTenant.isPending || createTenant.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Colocataires ({activeTenants.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          {activeTenants.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadContract}
              disabled={downloading}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              Contrat
            </Button>
          )}
          {canEdit && contract.status === "active" && (
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeTenants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun colocataire ajouté. Cliquez sur "Ajouter" pour commencer.
          </p>
        ) : (
          <>
            {activeTenants.map((ct) => (
              <div key={ct.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ct.tenant?.name}</span>
                    {ct.is_principal && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        <Crown className="h-3 w-3 mr-1" />
                        Principal
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {ct.tenant?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {ct.tenant.phone}
                      </span>
                    )}
                    {ct.tenant?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {ct.tenant.email}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && contract.status === "active" && !ct.is_principal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveDialogOpen(ct.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </>
        )}

        {departedTenants.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Anciens colocataires</p>
            {departedTenants.map((ct) => (
              <div key={ct.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 mb-1">
                <span className="text-sm text-muted-foreground">{ct.tenant?.name}</span>
                <Badge variant="secondary" className="text-xs">Parti</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Colocataire Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) {
          setSelectedTenantId("");
          resetNewTenantForm();
          setAddMode("existing");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un colocataire</DialogTitle>
          </DialogHeader>
          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "existing" | "new")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Existant
              </TabsTrigger>
              <TabsTrigger value="new" className="flex items-center gap-1">
                <UserPlus className="h-3.5 w-3.5" />
                Nouveau
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4 pt-2">
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un locataire" />
                </SelectTrigger>
                <SelectContent>
                  {availableTenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.phone ? `(${t.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableTenants.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun locataire disponible. Utilisez l'onglet "Nouveau" pour en créer un.
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddExistingTenant} disabled={!selectedTenantId || isAdding}>
                  {isAdding && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Ajouter
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="new" className="space-y-3 pt-2">
              <div>
                <Label>Nom complet *</Label>
                <Input value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} placeholder="Nom et prénom" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={newTenantPhone} onChange={(e) => setNewTenantPhone(e.target.value)} placeholder="07 XX XX XX XX" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newTenantEmail} onChange={(e) => setNewTenantEmail(e.target.value)} placeholder="email@exemple.com" />
              </div>
              <div>
                <Label>Profession</Label>
                <Input value={newTenantProfession} onChange={(e) => setNewTenantProfession(e.target.value)} placeholder="Profession" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddNewTenant} disabled={!newTenantName.trim() || isAdding}>
                  {isAdding && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Créer et ajouter
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeDialogOpen} onOpenChange={() => setRemoveDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce colocataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le colocataire sera marqué comme "Parti" et restera solidairement responsable pendant 6 mois conformément au contrat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeDialogOpen && handleRemoveTenant(removeDialogOpen)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}