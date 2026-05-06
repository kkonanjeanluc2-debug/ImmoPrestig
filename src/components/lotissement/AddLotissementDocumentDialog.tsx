import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { useCreateLotissementDocument } from "@/hooks/useLotissementDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddLotissementDocumentDialogProps {
  lotissementId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentTypes = [
  { value: "titre_foncier", label: "Titre foncier" },
  { value: "permis_lotir", label: "Permis de lotir" },
  { value: "arrete_approbation", label: "Arrêté d'approbation" },
  { value: "plan_cadastral", label: "Plan cadastral" },
  { value: "certificat_conformite", label: "Certificat de conformité" },
  { value: "attestation_villageoise", label: "Attestation villageoise" },
  { value: "lettre_attribution", label: "Lettre d'attribution" },
  { value: "certificat_propriete", label: "Certificat de propriété coutumière" },
  { value: "acd", label: "Arrêté de Concession Définitive (ACD)" },
  { value: "autre", label: "Autre document" },
];

const documentStatuses = [
  { value: "pending", label: "En attente" },
  { value: "valid", label: "Valide" },
  { value: "expired", label: "Expiré" },
  { value: "rejected", label: "Rejeté" },
];

export function AddLotissementDocumentDialog({
  lotissementId,
  open,
  onOpenChange,
}: AddLotissementDocumentDialogProps) {
  const createDocument = useCreateLotissementDocument();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "titre_foncier",
    status: "pending",
    reference_number: "",
    issued_by: "",
    issued_date: "",
    expiry_date: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "titre_foncier",
      status: "pending",
      reference_number: "",
      issued_by: "",
      issued_date: "",
      expiry_date: "",
      notes: "",
    });
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Veuillez saisir un nom de document");
      return;
    }

    if (file && file.size > 20 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 20 Mo");
      return;
    }

    setIsUploading(true);
    try {
      let file_url: string | null = null;
      let file_size: string | null = null;

      if (file && user?.id) {
        const safeName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "-");
        const filePath = `${user.id}/lotissement-documents/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("documents-achats")
          .upload(filePath, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;

        const { data: signed } = await supabase.storage
          .from("documents-achats")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 5);

        file_url = signed?.signedUrl || filePath;
        file_size = String(file.size);
      }

      await createDocument.mutateAsync({
        lotissement_id: lotissementId,
        name: formData.name.trim(),
        type: formData.type,
        status: formData.status,
        reference_number: formData.reference_number.trim() || null,
        issued_by: formData.issued_by.trim() || null,
        issued_date: formData.issued_date || null,
        expiry_date: formData.expiry_date || null,
        notes: formData.notes.trim() || null,
        file_url,
        file_size,
      });

      toast.success("Document ajouté avec succès");
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      console.error("Add document error:", err);
      toast.error(err?.message || "Erreur lors de l'ajout du document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un document légal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du document *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="ex: Titre foncier N°12345"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Fichier du document (PDF, image)</Label>
            <Input
              id="file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate">{file.name}</span>
                <span className="ml-auto text-xs">
                  {(file.size / 1024 / 1024).toFixed(2)} Mo
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Optionnel — max 20 Mo. Le fichier sera téléchargeable depuis la liste.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference_number">Numéro de référence</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="ex: TF-2024-12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issued_by">Émis par</Label>
              <Input
                id="issued_by"
                value={formData.issued_by}
                onChange={(e) => setFormData({ ...formData, issued_by: e.target.value })}
                placeholder="ex: Conservation foncière"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issued_date">Date d'émission</Label>
              <Input
                id="issued_date"
                type="date"
                value={formData.issued_date}
                onChange={(e) => setFormData({ ...formData, issued_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Date d'expiration</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Remarques ou informations complémentaires..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isUploading || createDocument.isPending}>
              {(isUploading || createDocument.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
