import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GitMerge, Loader2, ChevronRight, User } from "lucide-react";
import { toast } from "sonner";
import { useTenants, TenantWithDetails, useUpdateTenant, useDeleteTenant } from "@/hooks/useTenants";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { findDuplicateGroups } from "@/lib/duplicateDetection";
import { Progress } from "@/components/ui/progress";

interface MergedTenant {
  name: string;
  email: string;
  phone: string | null;
  property_id: string | null;
}

interface DuplicateGroup {
  group: TenantWithDetails[];
  score: number;
  reasons: string[];
}

export function MergeTenantsDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "merge">("select");
  const [selectedTenants, setSelectedTenants] = useState<TenantWithDetails[]>([]);
  const [selectedGroupInfo, setSelectedGroupInfo] = useState<{ score: number; reasons: string[] } | null>(null);
  const [mergedData, setMergedData] = useState<MergedTenant | null>(null);
  const [primaryId, setPrimaryId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  
  const { data: tenants } = useTenants();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  // Find potential duplicates using advanced algorithm
  const duplicateGroups = useMemo((): DuplicateGroup[] => {
    if (!tenants) return [];
    return findDuplicateGroups(tenants, 0.5);
  }, [tenants]);

  const resetState = () => {
    setStep("select");
    setSelectedTenants([]);
    setSelectedGroupInfo(null);
    setMergedData(null);
    setPrimaryId("");
    setIsMerging(false);
  };

  const handleSelectGroup = ({ group, score, reasons }: DuplicateGroup) => {
    setSelectedTenants(group);
    setSelectedGroupInfo({ score, reasons });
    setPrimaryId(group[0].id);
    
    // Pre-merge: take the most complete data
    const merged: MergedTenant = {
      name: group.reduce((best, t) => t.name.length > best.length ? t.name : best, ""),
      email: group[0].email,
      phone: group.find((t) => t.phone)?.phone || null,
      property_id: group.find((t) => t.property_id)?.property_id || null,
    };
    
    setMergedData(merged);
    setStep("merge");
  };

  const handleFieldSelect = (field: keyof MergedTenant, tenantId: string) => {
    const tenant = selectedTenants.find((t) => t.id === tenantId);
    if (!tenant || !mergedData) return;
    
    setMergedData({
      ...mergedData,
      [field]: tenant[field],
    });
  };

  const handleMerge = async () => {
    if (!mergedData || !primaryId) return;
    
    setIsMerging(true);
    
    try {
      // Update the primary tenant with merged data
      await updateTenant.mutateAsync({
        id: primaryId,
        name: mergedData.name,
        email: mergedData.email,
        phone: mergedData.phone,
        property_id: mergedData.property_id,
      });
      
      // Delete the other tenants
      const toDelete = selectedTenants.filter((t) => t.id !== primaryId);
      for (const tenant of toDelete) {
        await deleteTenant.mutateAsync({ id: tenant.id, name: tenant.name });
      }
      
      toast.success(`${toDelete.length + 1} locataires fusionnés avec succès`);
      setOpen(false);
      resetState();
    } catch (error) {
      console.error("Error merging tenants:", error);
      toast.error("Erreur lors de la fusion");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitMerge className="h-4 w-4" />
          Fusionner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fusionner des locataires</DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? "Sélectionnez un groupe de locataires potentiellement en doublon à fusionner."
              : "Choisissez les informations à conserver pour chaque champ."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "select" && (
            <>
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun doublon potentiel détecté.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {duplicateGroups.map((duplicateGroup, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectGroup(duplicateGroup)}
                        className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              {duplicateGroup.group.length} entrées
                            </Badge>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              {Math.round(duplicateGroup.score * 100)}% similaire
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          {duplicateGroup.group.map((tenant) => (
                            <div key={tenant.id} className="text-sm">
                              <span className="font-medium">{tenant.name}</span>
                              <span className="text-muted-foreground ml-2">({tenant.email})</span>
                            </div>
                          ))}
                        </div>
                        {duplicateGroup.reasons.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {duplicateGroup.reasons.map((reason, i) => (
                              <span key={i} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}

          {step === "merge" && mergedData && (
            <>
              <div className="space-y-4">
                {/* Name selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nom</Label>
                  <RadioGroup value={mergedData.name} onValueChange={(v) => setMergedData({ ...mergedData, name: v })}>
                    <div className="grid gap-2">
                      {[...new Set(selectedTenants.map((t) => t.name))].map((name) => (
                        <div key={name} className="flex items-center space-x-2">
                          <RadioGroupItem value={name} id={`name-${name}`} />
                          <Label htmlFor={`name-${name}`} className="font-normal cursor-pointer">{name}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Email selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <RadioGroup value={mergedData.email} onValueChange={(v) => setMergedData({ ...mergedData, email: v })}>
                    <div className="grid gap-2">
                      {[...new Set(selectedTenants.map((t) => t.email))].map((email) => (
                        <div key={email} className="flex items-center space-x-2">
                          <RadioGroupItem value={email} id={`email-${email}`} />
                          <Label htmlFor={`email-${email}`} className="font-normal cursor-pointer">{email}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Phone selection */}
                {selectedTenants.some((t) => t.phone) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Téléphone</Label>
                    <RadioGroup 
                      value={mergedData.phone || ""} 
                      onValueChange={(v) => setMergedData({ ...mergedData, phone: v || null })}
                    >
                      <div className="grid gap-2">
                        {[...new Set(selectedTenants.map((t) => t.phone).filter(Boolean))].map((phone) => (
                          <div key={phone} className="flex items-center space-x-2">
                            <RadioGroupItem value={phone!} id={`phone-${phone}`} />
                            <Label htmlFor={`phone-${phone}`} className="font-normal cursor-pointer">{phone}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Property selection */}
                {selectedTenants.some((t) => t.property) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Bien associé</Label>
                    <RadioGroup 
                      value={mergedData.property_id || ""} 
                      onValueChange={(v) => setMergedData({ ...mergedData, property_id: v || null })}
                    >
                      <div className="grid gap-2">
                        {selectedTenants.filter((t) => t.property).map((tenant) => (
                          <div key={tenant.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={tenant.property_id!} id={`property-${tenant.id}`} />
                            <Label htmlFor={`property-${tenant.id}`} className="font-normal cursor-pointer">
                              {tenant.property?.title}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Primary record selection */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium">Fiche principale (les autres seront supprimées)</Label>
                  <RadioGroup value={primaryId} onValueChange={setPrimaryId}>
                    <div className="grid gap-2">
                      {selectedTenants.map((tenant) => (
                        <div key={tenant.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={tenant.id} id={`primary-${tenant.id}`} />
                          <Label htmlFor={`primary-${tenant.id}`} className="font-normal cursor-pointer">
                            {tenant.name} ({tenant.email})
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Preview */}
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Aperçu du résultat</p>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Nom:</span> {mergedData.name}</p>
                    <p><span className="text-muted-foreground">Email:</span> {mergedData.email}</p>
                    <p><span className="text-muted-foreground">Téléphone:</span> {mergedData.phone || "—"}</p>
                    <p><span className="text-muted-foreground">Bien:</span> {selectedTenants.find(t => t.property_id === mergedData.property_id)?.property?.title || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("select")}>
                  Retour
                </Button>
                <Button onClick={handleMerge} disabled={isMerging}>
                  {isMerging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fusion en cours...
                    </>
                  ) : (
                    `Fusionner ${selectedTenants.length} locataires`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
