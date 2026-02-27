import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useCreateMutationAchat } from "@/hooks/useMutationsAchats";
import type { BienAchat } from "@/hooks/useBiensAchat";

interface Props {
  children: React.ReactNode;
  achats: { id: string; bien_id: string; sale_price: number; sale_date: string }[];
  biens: BienAchat[];
}

export function AddMutationDialog({ children, achats, biens }: Props) {
  const [open, setOpen] = useState(false);
  const [achatId, setAchatId] = useState("");
  const [typeMutation] = useState("vente");
  const [notaireName, setNotaireName] = useState("");
  const [notairePhone, setNotairePhone] = useState("");
  const [notaireEmail, setNotaireEmail] = useState("");
  const [notes, setNotes] = useState("");
  const createMutation = useCreateMutationAchat();

  const selectedAchat = achats.find((a) => a.id === achatId);
  const selectedBien = selectedAchat ? biens.find((b) => b.id === selectedAchat.bien_id) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAchat) return;

    createMutation.mutate(
      {
        achat_id: selectedAchat.id,
        bien_id: selectedAchat.bien_id,
        type_mutation: typeMutation,
        notaire_name: notaireName || undefined,
        notaire_phone: notairePhone || undefined,
        notaire_email: notaireEmail || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setAchatId("");
          setNotaireName("");
          setNotairePhone("");
          setNotaireEmail("");
          setNotes("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau dossier de mutation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Achat concerné *</Label>
            <Select value={achatId} onValueChange={setAchatId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un achat" />
              </SelectTrigger>
              <SelectContent>
                {achats.map((a) => {
                  const bien = biens.find((b) => b.id === a.bien_id);
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      {bien?.title || "Bien"} — {Number(a.sale_price).toLocaleString("fr-FR")} FCFA
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>


          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Informations du notaire (optionnel)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom</Label>
                <Input value={notaireName} onChange={(e) => setNotaireName(e.target.value)} placeholder="Me Kouassi" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={notairePhone} onChange={(e) => setNotairePhone(e.target.value)} placeholder="+225..." />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input value={notaireEmail} onChange={(e) => setNotaireEmail(e.target.value)} placeholder="notaire@email.com" type="email" />
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations..." rows={2} />
          </div>

          <Button type="submit" className="w-full" disabled={!achatId || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Créer le dossier
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
