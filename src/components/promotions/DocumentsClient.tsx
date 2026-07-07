import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, FileCheck, FileX, Loader2, Upload, FileText, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDocumentsClient,
  useAddDocumentClient,
  useToggleDocumentValide,
  useDeleteDocumentClient,
  useDocumentsRemis,
  useAddDocumentRemis,
  useDeleteDocumentRemis,
  TYPE_DOC_CLIENT_LABELS,
  TYPE_DOC_REMIS_LABELS,
  type TypeDocumentClient,
  type TypeDocumentRemis,
} from "@/hooks/useDocumentsPromotion";

// ── Utilitaire upload Supabase Storage ─────────────────────────────────

async function uploadDocumentFile(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/promotions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw new Error(`Upload échoué : ${error.message}`);
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl;
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp";
const MAX_SIZE_MB = 10;

// ── Composant de sélection de fichier réutilisable ─────────────────────

function FilePickerZone({
  file,
  onSelect,
  onClear,
}: {
  file: File | null;
  onSelect: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier ne doit pas dépasser ${MAX_SIZE_MB} Mo`);
      return;
    }
    onSelect(f);
  };

  const fmt = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <>
      <input ref={ref} type="file" accept={ACCEPTED_TYPES} onChange={handleChange} className="hidden" />
      {!file ? (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors"
        >
          <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Cliquez pour importer un fichier</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">PDF, Word, Excel, Image (max {MAX_SIZE_MB} Mo)</p>
        </button>
      ) : (
        <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg border">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">{fmt(file.size)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </>
  );
}

// ── Section documents reçus du client ──────────────────────────────────

function DocClientSection({ reservationId }: { reservationId: string }) {
  const { user } = useAuth();
  const { data: docs = [], isLoading } = useDocumentsClient(reservationId);
  const addDoc = useAddDocumentClient();
  const toggleValide = useToggleDocumentValide();
  const deleteDoc = useDeleteDocumentClient();

  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    type_document: "cni" as TypeDocumentClient,
    nom_document: "",
    date_reception: new Date().toISOString().split("T")[0],
    observations: "",
  });

  const handleFileSelect = (f: File) => {
    setSelectedFile(f);
    if (!form.nom_document) {
      setForm((prev) => ({ ...prev, nom_document: f.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_document.trim()) { toast.error("Nom du document requis"); return; }
    if (!selectedFile) { toast.error("Veuillez sélectionner un fichier"); return; }
    if (!user) return;

    setIsUploading(true);
    try {
      const url = await uploadDocumentFile(selectedFile, user.id);
      await addDoc.mutateAsync({
        reservation_id: reservationId,
        type_document: form.type_document,
        nom_document: form.nom_document.trim(),
        fichier_url: url,
        date_reception: form.date_reception,
        valide: false,
        observations: form.observations.trim() || null,
      });
      toast.success("Document ajouté");
      setShowForm(false);
      setSelectedFile(null);
      setForm({ type_document: "cni", nom_document: "", date_reception: new Date().toISOString().split("T")[0], observations: "" });
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'ajout");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{docs.length} document(s) reçu(s)</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Ajouter
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type *</Label>
              <Select value={form.type_document} onValueChange={(v) => setForm({ ...form, type_document: v as TypeDocumentClient })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_DOC_CLIENT_LABELS) as [TypeDocumentClient, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date réception</Label>
              <Input type="date" className="h-8 text-xs" value={form.date_reception}
                onChange={(e) => setForm({ ...form, date_reception: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nom / description *</Label>
            <Input className="h-8 text-xs" placeholder="CNI Dupont Jean (recto-verso)"
              value={form.nom_document} onChange={(e) => setForm({ ...form, nom_document: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fichier *</Label>
            <FilePickerZone file={selectedFile} onSelect={handleFileSelect} onClear={() => setSelectedFile(null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observations</Label>
            <Textarea className="text-xs min-h-[50px]" value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setSelectedFile(null); }}>Annuler</Button>
            <Button type="submit" size="sm" disabled={isUploading || !selectedFile}>
              {isUploading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {isUploading ? "Import en cours..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      )}

      {docs.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground py-2">Aucun document enregistré.</p>
      )}

      <div className="space-y-2">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-start gap-3 rounded-md border p-2.5 bg-background">
            <Checkbox checked={doc.valide}
              onCheckedChange={(checked) => toggleValide.mutate({ id: doc.id, valide: !!checked, reservationId })} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium truncate">{doc.nom_document}</span>
                <Badge variant={doc.valide ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                  {doc.valide
                    ? <><FileCheck className="h-2.5 w-2.5 mr-0.5" />Validé</>
                    : <><FileX className="h-2.5 w-2.5 mr-0.5" />En attente</>}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {TYPE_DOC_CLIENT_LABELS[doc.type_document]} · {new Date(doc.date_reception).toLocaleDateString("fr-FR")}
              </div>
              {doc.fichier_url && (
                <a href={doc.fichier_url} target="_blank" rel="noreferrer"
                  className="text-[11px] text-primary flex items-center gap-0.5 mt-0.5 hover:underline">
                  <ExternalLink className="h-2.5 w-2.5" /> Voir le fichier
                </a>
              )}
              {doc.observations && <p className="text-[11px] text-muted-foreground mt-0.5 italic">{doc.observations}</p>}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => deleteDoc.mutate({ id: doc.id, reservationId })}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section documents remis au client ──────────────────────────────────

function DocRemisSection({ reservationId }: { reservationId: string }) {
  const { user } = useAuth();
  const { data: docs = [], isLoading } = useDocumentsRemis(reservationId);
  const addDoc = useAddDocumentRemis();
  const deleteDoc = useDeleteDocumentRemis();

  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    type_document: "contrat_reservation" as TypeDocumentRemis,
    nom_document: "",
    date_remise: new Date().toISOString().split("T")[0],
    signe_client: false,
    observations: "",
  });

  const handleFileSelect = (f: File) => {
    setSelectedFile(f);
    if (!form.nom_document) {
      setForm((prev) => ({ ...prev, nom_document: f.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_document.trim()) { toast.error("Nom du document requis"); return; }
    if (!selectedFile) { toast.error("Veuillez sélectionner un fichier"); return; }
    if (!user) return;

    setIsUploading(true);
    try {
      const url = await uploadDocumentFile(selectedFile, user.id);
      await addDoc.mutateAsync({
        reservation_id: reservationId,
        type_document: form.type_document,
        nom_document: form.nom_document.trim(),
        fichier_url: url,
        date_remise: form.date_remise,
        signe_client: form.signe_client,
        date_signature: form.signe_client ? form.date_remise : null,
        observations: form.observations.trim() || null,
      });
      toast.success("Document ajouté");
      setShowForm(false);
      setSelectedFile(null);
      setForm({ type_document: "contrat_reservation", nom_document: "", date_remise: new Date().toISOString().split("T")[0], signe_client: false, observations: "" });
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'ajout");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{docs.length} document(s) remis</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Ajouter
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Type *</Label>
              <Select value={form.type_document} onValueChange={(v) => setForm({ ...form, type_document: v as TypeDocumentRemis })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYPE_DOC_REMIS_LABELS) as [TypeDocumentRemis, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date de remise</Label>
              <Input type="date" className="h-8 text-xs" value={form.date_remise}
                onChange={(e) => setForm({ ...form, date_remise: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nom / description *</Label>
            <Input className="h-8 text-xs" placeholder="Contrat de réservation N° CR-ABJ-202606-4521"
              value={form.nom_document} onChange={(e) => setForm({ ...form, nom_document: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fichier *</Label>
            <FilePickerZone file={selectedFile} onSelect={handleFileSelect} onClear={() => setSelectedFile(null)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="signe" checked={form.signe_client}
              onCheckedChange={(c) => setForm({ ...form, signe_client: !!c })} />
            <Label htmlFor="signe" className="text-xs cursor-pointer">Signé par le client</Label>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observations</Label>
            <Textarea className="text-xs min-h-[50px]" value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setSelectedFile(null); }}>Annuler</Button>
            <Button type="submit" size="sm" disabled={isUploading || !selectedFile}>
              {isUploading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {isUploading ? "Import en cours..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      )}

      {docs.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground py-2">Aucun document remis.</p>
      )}

      <div className="space-y-2">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-start gap-3 rounded-md border p-2.5 bg-background">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium truncate">{doc.nom_document}</span>
                {doc.signe_client && (
                  <Badge className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700">
                    <FileCheck className="h-2.5 w-2.5 mr-0.5" />Signé
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {TYPE_DOC_REMIS_LABELS[doc.type_document]} · Remis le {new Date(doc.date_remise).toLocaleDateString("fr-FR")}
              </div>
              {doc.fichier_url && (
                <a href={doc.fichier_url} target="_blank" rel="noreferrer"
                  className="text-[11px] text-primary flex items-center gap-0.5 mt-0.5 hover:underline">
                  <ExternalLink className="h-2.5 w-2.5" /> Voir le fichier
                </a>
              )}
              {doc.observations && <p className="text-[11px] text-muted-foreground mt-0.5 italic">{doc.observations}</p>}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => deleteDoc.mutate({ id: doc.id, reservationId })}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dialog principal ────────────────────────────────────────────────────

interface DocumentsClientProps {
  reservationId: string;
  clientNom: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentsClient({ reservationId, clientNom, open, onOpenChange }: DocumentsClientProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Documents — {clientNom}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="recus">
          <TabsList className="w-full">
            <TabsTrigger value="recus" className="flex-1 text-xs">Documents reçus</TabsTrigger>
            <TabsTrigger value="remis" className="flex-1 text-xs">Documents remis</TabsTrigger>
          </TabsList>
          <TabsContent value="recus" className="mt-3">
            <DocClientSection reservationId={reservationId} />
          </TabsContent>
          <TabsContent value="remis" className="mt-3">
            <DocRemisSection reservationId={reservationId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
