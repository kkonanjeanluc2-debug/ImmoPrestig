import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateClientAcheteur,
  useUpdateClientAcheteur,
  type ClientAcheteur,
  type TypeClient,
} from "@/hooks/useClientsAcheteurs";

const TYPE_CLIENT_LABELS: Record<TypeClient, string> = {
  particulier: "Particulier",
  entreprise: "Entreprise",
  diaspora: "Diaspora",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientAcheteur | null;
  onCreated?: (client: ClientAcheteur) => void;
}

type FormData = {
  nom: string;
  prenoms: string;
  telephone: string;
  telephone_2: string;
  email: string;
  adresse: string;
  commune: string;
  ville: string;
  nationalite: string;
  numero_cni: string;
  date_expiration_cni: string;
  profession: string;
  employeur: string;
  type_client: TypeClient;
  nom_entreprise: string;
  numero_rccm: string;
};

const defaultForm: FormData = {
  nom: "",
  prenoms: "",
  telephone: "",
  telephone_2: "",
  email: "",
  adresse: "",
  commune: "",
  ville: "Abidjan",
  nationalite: "Ivoirienne",
  numero_cni: "",
  date_expiration_cni: "",
  profession: "",
  employeur: "",
  type_client: "particulier",
  nom_entreprise: "",
  numero_rccm: "",
};

export function ClientFormDialog({ open, onOpenChange, client, onCreated }: Props) {
  const createClient = useCreateClientAcheteur();
  const updateClient = useUpdateClientAcheteur();
  const isEdit = !!client;

  const [form, setForm] = useState<FormData>(() =>
    client
      ? {
          nom: client.nom,
          prenoms: client.prenoms,
          telephone: client.telephone,
          telephone_2: client.telephone_2 || "",
          email: client.email || "",
          adresse: client.adresse || "",
          commune: client.commune || "",
          ville: client.ville,
          nationalite: client.nationalite,
          numero_cni: client.numero_cni || "",
          date_expiration_cni: client.date_expiration_cni || "",
          profession: client.profession || "",
          employeur: client.employeur || "",
          type_client: client.type_client,
          nom_entreprise: client.nom_entreprise || "",
          numero_rccm: client.numero_rccm || "",
        }
      : defaultForm
  );

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenoms.trim() || !form.telephone.trim()) {
      toast.error("Nom, prénoms et téléphone sont obligatoires");
      return;
    }
    const payload = {
      nom: form.nom.trim(),
      prenoms: form.prenoms.trim(),
      telephone: form.telephone.trim(),
      telephone_2: form.telephone_2.trim() || null,
      email: form.email.trim() || null,
      adresse: form.adresse.trim() || null,
      commune: form.commune.trim() || null,
      ville: form.ville.trim() || "Abidjan",
      nationalite: form.nationalite.trim() || "Ivoirienne",
      numero_cni: form.numero_cni.trim() || null,
      date_expiration_cni: form.date_expiration_cni || null,
      profession: form.profession.trim() || null,
      employeur: form.employeur.trim() || null,
      type_client: form.type_client,
      nom_entreprise: form.type_client === "entreprise" ? (form.nom_entreprise.trim() || null) : null,
      numero_rccm: form.type_client === "entreprise" ? (form.numero_rccm.trim() || null) : null,
    };

    try {
      if (isEdit && client) {
        await updateClient.mutateAsync({ id: client.id, ...payload });
        toast.success("Client mis à jour");
        onOpenChange(false);
      } else {
        const created = await createClient.mutateAsync(payload);
        toast.success("Client créé");
        onCreated?.(created);
        onOpenChange(false);
        setForm(defaultForm);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la sauvegarde");
    }
  };

  const isPending = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le client" : "Nouveau client acheteur"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Identité */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => set("nom", e.target.value)} placeholder="KOUASSI" />
              </div>
              <div className="space-y-1.5">
                <Label>Prénoms *</Label>
                <Input value={form.prenoms} onChange={(e) => set("prenoms", e.target.value)} placeholder="Jean-Luc" />
              </div>
              <div className="space-y-1.5">
                <Label>Type de client</Label>
                <Select value={form.type_client} onValueChange={(v) => set("type_client", v as TypeClient)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_CLIENT_LABELS) as [TypeClient, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nationalité</Label>
                <Input value={form.nationalite} onChange={(e) => set("nationalite", e.target.value)} placeholder="Ivoirienne" />
              </div>
            </div>
          </div>

          {/* Champs entreprise */}
          {form.type_client === "entreprise" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entreprise</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nom de l'entreprise</Label>
                  <Input value={form.nom_entreprise} onChange={(e) => set("nom_entreprise", e.target.value)} placeholder="SARL EXEMPLE CI" />
                </div>
                <div className="space-y-1.5">
                  <Label>N° RCCM</Label>
                  <Input value={form.numero_rccm} onChange={(e) => set("numero_rccm", e.target.value)} placeholder="CI-ABJ-2020-B-XXXXX" />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Contacts */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contacts</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Téléphone *</Label>
                <Input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="07 XX XX XX XX" />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone 2</Label>
                <Input value={form.telephone_2} onChange={(e) => set("telephone_2", e.target.value)} placeholder="05 XX XX XX XX" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="exemple@mail.com" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Adresse */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adresse</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Adresse</Label>
                <Input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="Cocody Angré, Rue des Jardins" />
              </div>
              <div className="space-y-1.5">
                <Label>Commune</Label>
                <Input value={form.commune} onChange={(e) => set("commune", e.target.value)} placeholder="Cocody" />
              </div>
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Input value={form.ville} onChange={(e) => set("ville", e.target.value)} placeholder="Abidjan" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Profession */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Situation professionnelle</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Profession</Label>
                <Input value={form.profession} onChange={(e) => set("profession", e.target.value)} placeholder="Ingénieur informatique" />
              </div>
              <div className="space-y-1.5">
                <Label>Employeur</Label>
                <Input value={form.employeur} onChange={(e) => set("employeur", e.target.value)} placeholder="SGCI SA" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pièce d'identité */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pièce d'identité</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>N° CNI / Passeport</Label>
                <Input value={form.numero_cni} onChange={(e) => set("numero_cni", e.target.value)} placeholder="CI XXXXXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label>Date d'expiration</Label>
                <Input type="date" value={form.date_expiration_cni} onChange={(e) => set("date_expiration_cni", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? "Mettre à jour" : "Créer le client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
