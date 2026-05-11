import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet } from "lucide-react";
import {
  useBeneficiairesLots,
  useCreateBeneficiaireLot,
} from "@/hooks/useBeneficiairesLots";
import { useUpdateParcelle, type Parcelle } from "@/hooks/useParcelles";
import { toast } from "sonner";

interface AssignPrefinanceurDialogProps {
  parcelle: Parcelle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignPrefinanceurDialog({
  parcelle,
  open,
  onOpenChange,
}: AssignPrefinanceurDialogProps) {
  const { data: beneficiaires = [] } = useBeneficiairesLots(parcelle.lotissement_id);
  const createBeneficiaire = useCreateBeneficiaireLot();
  const updateParcelle = useUpdateParcelle();

  const prefinanceurs = beneficiaires.filter((b) => b.partie === "prefinanceur");

  const [mode, setMode] = useState<"existing" | "new">(
    prefinanceurs.length > 0 ? "existing" : "new"
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [cni, setCni] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setSelectedId("");
    setNom("");
    setTelephone("");
    setCni("");
    setMode(prefinanceurs.length > 0 ? "existing" : "new");
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      let beneficiaireId = selectedId;
      if (mode === "new") {
        if (!nom.trim()) {
          toast.error("Le nom du préfinanceur est obligatoire");
          setIsSaving(false);
          return;
        }
        const created = await createBeneficiaire.mutateAsync({
          lotissement_id: parcelle.lotissement_id,
          nom: nom.trim(),
          telephone: telephone.trim() || null,
          cni_number: cni.trim() || null,
          partie: "prefinanceur",
        });
        beneficiaireId = created.id;
      } else if (!beneficiaireId) {
        toast.error("Veuillez sélectionner un préfinanceur");
        setIsSaving(false);
        return;
      }

      await updateParcelle.mutateAsync({
        id: parcelle.id,
        beneficiaire_id: beneficiaireId,
        attribution: "prefinanceur",
      } as any);

      toast.success("Préfinanceur attribué au lot");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'attribution");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Préfinancement — Lot {parcelle.plot_number}
          </DialogTitle>
          <DialogDescription>
            Attribuez ce lot à un préfinanceur. Son nom apparaîtra dans le guide
            de partage.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" disabled={prefinanceurs.length === 0}>
              Existant ({prefinanceurs.length})
            </TabsTrigger>
            <TabsTrigger value="new">Nouveau</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-2 pt-3">
            <Label>Préfinanceur</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un préfinanceur" />
              </SelectTrigger>
              <SelectContent>
                {prefinanceurs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                    {p.telephone ? ` — ${p.telephone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="new" className="space-y-3 pt-3">
            <div className="space-y-2">
              <Label htmlFor="prefi-nom">Nom complet *</Label>
              <Input
                id="prefi-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom et prénoms"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefi-tel">Téléphone</Label>
              <Input
                id="prefi-tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+225 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefi-cni">N° CNI</Label>
              <Input
                id="prefi-cni"
                value={cni}
                onChange={(e) => setCni(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Attribuer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
