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
import { useOwners, Owner, useUpdateOwner, useDeleteOwner } from "@/hooks/useOwners";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface MergedOwner {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
}

export function MergeOwnersDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "merge">("select");
  const [selectedOwners, setSelectedOwners] = useState<Owner[]>([]);
  const [mergedData, setMergedData] = useState<MergedOwner | null>(null);
  const [primaryId, setPrimaryId] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  
  const { data: owners } = useOwners();
  const updateOwner = useUpdateOwner();
  const deleteOwner = useDeleteOwner();

  // Find potential duplicates (same email or phone)
  const duplicateGroups = useMemo(() => {
    if (!owners) return [];
    
    const groups: Owner[][] = [];
    const processed = new Set<string>();
    
    owners.forEach((owner) => {
      if (processed.has(owner.id)) return;
      
      const duplicates = owners.filter((o) => {
        if (o.id === owner.id || processed.has(o.id)) return false;
        
        // Check for similar names
        const nameSimilar = o.name.toLowerCase().includes(owner.name.toLowerCase().split(' ')[0]) ||
                           owner.name.toLowerCase().includes(o.name.toLowerCase().split(' ')[0]);
        
        // Check for same email domain or similar email
        const emailSimilar = o.email.split('@')[0].toLowerCase() === owner.email.split('@')[0].toLowerCase();
        
        // Check for same phone
        const phoneSimilar = o.phone && owner.phone && 
                            o.phone.replace(/\D/g, '') === owner.phone.replace(/\D/g, '');
        
        return nameSimilar || emailSimilar || phoneSimilar;
      });
      
      if (duplicates.length > 0) {
        const group = [owner, ...duplicates];
        group.forEach((o) => processed.add(o.id));
        groups.push(group);
      }
    });
    
    return groups;
  }, [owners]);

  const resetState = () => {
    setStep("select");
    setSelectedOwners([]);
    setMergedData(null);
    setPrimaryId("");
    setIsMerging(false);
  };

  const handleSelectGroup = (group: Owner[]) => {
    setSelectedOwners(group);
    setPrimaryId(group[0].id);
    
    // Pre-merge: take the most complete data
    const merged: MergedOwner = {
      name: group.reduce((best, o) => o.name.length > best.length ? o.name : best, ""),
      email: group[0].email,
      phone: group.find((o) => o.phone)?.phone || null,
      address: group.find((o) => o.address)?.address || null,
      status: group.some((o) => o.status === "actif") ? "actif" : "inactif",
    };
    
    setMergedData(merged);
    setStep("merge");
  };

  const handleMerge = async () => {
    if (!mergedData || !primaryId) return;
    
    setIsMerging(true);
    
    try {
      // Update the primary owner with merged data
      await updateOwner.mutateAsync({
        id: primaryId,
        name: mergedData.name,
        email: mergedData.email,
        phone: mergedData.phone,
        address: mergedData.address,
        status: mergedData.status,
      });
      
      // Delete the other owners
      const toDelete = selectedOwners.filter((o) => o.id !== primaryId);
      for (const owner of toDelete) {
        await deleteOwner.mutateAsync({ id: owner.id, name: owner.name });
      }
      
      toast.success(`${toDelete.length + 1} propriétaires fusionnés avec succès`);
      setOpen(false);
      resetState();
    } catch (error) {
      console.error("Error merging owners:", error);
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
          <DialogTitle>Fusionner des propriétaires</DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? "Sélectionnez un groupe de propriétaires potentiellement en doublon à fusionner."
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
                    {duplicateGroups.map((group, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectGroup(group)}
                        className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            {group.length} entrées similaires
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          {group.map((owner) => (
                            <div key={owner.id} className="text-sm">
                              <span className="font-medium">{owner.name}</span>
                              <span className="text-muted-foreground ml-2">({owner.email})</span>
                            </div>
                          ))}
                        </div>
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
                      {[...new Set(selectedOwners.map((o) => o.name))].map((name) => (
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
                      {[...new Set(selectedOwners.map((o) => o.email))].map((email) => (
                        <div key={email} className="flex items-center space-x-2">
                          <RadioGroupItem value={email} id={`email-${email}`} />
                          <Label htmlFor={`email-${email}`} className="font-normal cursor-pointer">{email}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Phone selection */}
                {selectedOwners.some((o) => o.phone) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Téléphone</Label>
                    <RadioGroup 
                      value={mergedData.phone || ""} 
                      onValueChange={(v) => setMergedData({ ...mergedData, phone: v || null })}
                    >
                      <div className="grid gap-2">
                        {[...new Set(selectedOwners.map((o) => o.phone).filter(Boolean))].map((phone) => (
                          <div key={phone} className="flex items-center space-x-2">
                            <RadioGroupItem value={phone!} id={`phone-${phone}`} />
                            <Label htmlFor={`phone-${phone}`} className="font-normal cursor-pointer">{phone}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Address selection */}
                {selectedOwners.some((o) => o.address) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Adresse</Label>
                    <RadioGroup 
                      value={mergedData.address || ""} 
                      onValueChange={(v) => setMergedData({ ...mergedData, address: v || null })}
                    >
                      <div className="grid gap-2">
                        {[...new Set(selectedOwners.map((o) => o.address).filter(Boolean))].map((address) => (
                          <div key={address} className="flex items-center space-x-2">
                            <RadioGroupItem value={address!} id={`address-${address}`} />
                            <Label htmlFor={`address-${address}`} className="font-normal cursor-pointer">{address}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Status selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Statut</Label>
                  <RadioGroup value={mergedData.status} onValueChange={(v) => setMergedData({ ...mergedData, status: v })}>
                    <div className="grid gap-2">
                      {[...new Set(selectedOwners.map((o) => o.status))].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <RadioGroupItem value={status} id={`status-${status}`} />
                          <Label htmlFor={`status-${status}`} className="font-normal cursor-pointer capitalize">{status}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Primary record selection */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium">Fiche principale (les autres seront supprimées)</Label>
                  <RadioGroup value={primaryId} onValueChange={setPrimaryId}>
                    <div className="grid gap-2">
                      {selectedOwners.map((owner) => (
                        <div key={owner.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={owner.id} id={`primary-${owner.id}`} />
                          <Label htmlFor={`primary-${owner.id}`} className="font-normal cursor-pointer">
                            {owner.name} ({owner.email})
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
                    <p><span className="text-muted-foreground">Adresse:</span> {mergedData.address || "—"}</p>
                    <p><span className="text-muted-foreground">Statut:</span> {mergedData.status}</p>
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
                    `Fusionner ${selectedOwners.length} propriétaires`
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
