import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Plus, Trash2, Download, Loader2, Upload, Image as ImageIcon, Eye, X } from "lucide-react";
import { useDocumentsAchats, useCreateDocumentAchat, useDeleteDocumentAchat, DOCUMENT_TYPES } from "@/hooks/useDocumentsAchats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BienAchat } from "@/hooks/useBiensAchat";

interface Props {
  bien: BienAchat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((t) => [t.value, t.label])
);

export function DocumentsAchatDialog({ bien, open, onOpenChange }: Props) {
  const { data: documents = [], isLoading } = useDocumentsAchats(bien.id);
  const createMutation = useCreateDocumentAchat();
  const deleteMutation = useDeleteDocumentAchat();

  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("autre");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const resetForm = () => {
    setName("");
    setType("autre");
    setNotes("");
    setFile(null);
    setShowAdd(false);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createMutation.mutate(
      { bien_id: bien.id, name: name.trim(), type, notes, file: file || undefined },
      { onSuccess: resetForm }
    );
  };

  const getSignedUrl = useCallback(async (fileUrl: string): Promise<string | null> => {
    if (fileUrl.startsWith('http')) return fileUrl;
    const { data, error } = await supabase.storage
      .from("documents-achats")
      .createSignedUrl(fileUrl, 300);
    if (error || !data?.signedUrl) {
      toast.error("Impossible d'accéder au fichier");
      return null;
    }
    return data.signedUrl;
  }, []);

  const handlePreview = async (fileUrl: string) => {
    setPreviewLoading(true);
    const url = await getSignedUrl(fileUrl);
    if (!url) {
      setPreviewLoading(false);
      return;
    }
    const isImg = /\.(jpg|jpeg|png|webp)$/i.test(fileUrl);
    setPreviewType(isImg ? "image" : "pdf");
    setPreviewUrl(url);
    setPreviewLoading(false);
  };

  const handleDownload = async (fileUrl: string) => {
    const url = await getSignedUrl(fileUrl);
    if (url) window.open(url, '_blank');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents - {bien.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!showAdd ? (
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un document
              </Button>
            ) : (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Nom du document *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Compromis signé" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Fichier (PDF ou image)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent text-sm">
                      <Upload className="h-4 w-4" />
                      {file ? file.name : "Choisir un fichier"}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {file && (
                      <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Retirer</Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WEBP (max 10 Mo)</p>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes optionnelles..." />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmit} disabled={!name.trim() || createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetForm}>Annuler</Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !documents.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Aucun document pour ce bien</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const isImage = doc.file_url && /\.(jpg|jpeg|png|webp)$/i.test(doc.file_url);
                  const isPdf = doc.file_url && /\.pdf$/i.test(doc.file_url);
                  const canPreview = doc.file_url && (isImage || isPdf);

                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isImage ? (
                            <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                          ) : isPdf ? (
                            <FileText className="h-4 w-4 text-destructive shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-medium text-sm truncate">{doc.name}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {TYPE_LABELS[doc.type] || doc.type}
                          </Badge>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6 truncate">{doc.notes}</p>
                        )}
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1 ml-6">
                          {doc.file_size && <span>{doc.file_size}</span>}
                          <span>{new Date(doc.created_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {canPreview && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePreview(doc.file_url!)}
                            disabled={previewLoading}
                          >
                            {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                        {doc.file_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc.file_url!)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>

        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteId) deleteMutation.mutate(deleteId, { onSettled: () => setDeleteId(null) });
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Dialog>

      {/* Preview overlay */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => { setPreviewUrl(null); setPreviewType(null); }}>
          <div className="relative w-full max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-12 right-0 h-10 w-10 rounded-full"
              onClick={() => { setPreviewUrl(null); setPreviewType(null); }}
            >
              <X className="h-5 w-5" />
            </Button>
            {previewType === "image" ? (
              <img
                src={previewUrl}
                alt="Aperçu"
                className="w-full max-h-[85vh] object-contain rounded-lg"
              />
            ) : (
              <iframe
                src={previewUrl}
                className="w-full h-[85vh] rounded-lg bg-white"
                title="Aperçu PDF"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
