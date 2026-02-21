import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Scale,
  Gavel,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  useUnpaidCaseActions,
  useUpdateUnpaidCase,
  useAddUnpaidCaseAction,
  useDeleteUnpaidCase,
  STATUS_LABELS,
  ACTION_LABELS,
  type UnpaidCase,
} from "@/hooks/useUnpaidCases";
import { generateFormalNoticePDF } from "@/lib/generateFormalNoticePDF";
import { generateUnpaidDossierPDF } from "@/lib/generateUnpaidDossierPDF";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_STEPS = [
  { key: "detected", label: "Détecté", icon: AlertTriangle },
  { key: "reminded", label: "Relancé", icon: Mail },
  { key: "formal_notice", label: "Mise en demeure", icon: FileText },
  { key: "legal_proceedings", label: "Procédure", icon: Scale },
  { key: "awaiting_judgment", label: "Jugement", icon: Clock },
];

interface Props {
  unpaidCase: UnpaidCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnpaidCaseDetailDialog({ unpaidCase, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { data: actions, isLoading: actionsLoading } = useUnpaidCaseActions(unpaidCase.id);
  const updateCase = useUpdateUnpaidCase();
  const addAction = useAddUnpaidCaseAction();
  const deleteCase = useDeleteUnpaidCase();
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState(unpaidCase.status);
  const [lawyerName, setLawyerName] = useState(unpaidCase.lawyer_name || "");
  const [lawyerEmail, setLawyerEmail] = useState(unpaidCase.lawyer_email || "");
  const [lawyerPhone, setLawyerPhone] = useState(unpaidCase.lawyer_phone || "");
  const [courtReference, setCourtReference] = useState(unpaidCase.court_reference || "");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  const tenantName = unpaidCase.tenant?.name || "Locataire inconnu";
  const tenantEmail = unpaidCase.tenant?.email || null;
  const tenantPhone = unpaidCase.tenant?.phone || null;
  const propertyTitle = unpaidCase.tenant?.property?.title || unpaidCase.property?.title || "Bien non assigné";
  const propertyAddress = unpaidCase.tenant?.property?.address || unpaidCase.property?.address || "";

  const handleStatusUpdate = async () => {
    if (newStatus === unpaidCase.status) return;
    try {
      const updates: any = { id: unpaidCase.id, status: newStatus };
      if (newStatus === "formal_notice") updates.formal_notice_date = new Date().toISOString().split("T")[0];
      if (newStatus === "legal_proceedings") {
        updates.legal_transmission_date = new Date().toISOString().split("T")[0];
        updates.lawyer_name = lawyerName || null;
        updates.lawyer_email = lawyerEmail || null;
        updates.lawyer_phone = lawyerPhone || null;
      }
      if (courtReference) updates.court_reference = courtReference;
      await updateCase.mutateAsync(updates);
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addAction.mutateAsync({
        case_id: unpaidCase.id,
        action_type: "note",
        description: newNote,
        metadata: null,
        document_url: null,
      });
      setNewNote("");
      toast.success("Note ajoutée");
    } catch {
      toast.error("Erreur lors de l'ajout de la note");
    }
  };

  const handleGenerateFormalNotice = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateFormalNoticePDF({
        tenantName,
        tenantAddress: propertyAddress,
        propertyTitle,
        propertyAddress,
        amount: Number(unpaidCase.amount_due),
        dueDate: unpaidCase.due_date,
        daysLate: unpaidCase.days_late,
      });

      if (user) {
        await addAction.mutateAsync({
          case_id: unpaidCase.id,
          action_type: "formal_notice",
          description: "Mise en demeure générée",
          metadata: null,
          document_url: null,
        });
      }

      // Auto update status
      if (unpaidCase.status === "detected" || unpaidCase.status === "reminded") {
        await updateCase.mutateAsync({
          id: unpaidCase.id,
          status: "formal_notice",
          formal_notice_date: new Date().toISOString().split("T")[0],
        });
      }

      toast.success("Mise en demeure générée avec succès");
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportDossier = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateUnpaidDossierPDF({
        tenantName,
        tenantEmail,
        tenantPhone,
        propertyTitle,
        propertyAddress,
        amount: Number(unpaidCase.amount_due),
        dueDate: unpaidCase.due_date,
        daysLate: unpaidCase.days_late,
        status: unpaidCase.status,
        formalNoticeDate: unpaidCase.formal_notice_date,
        legalTransmissionDate: unpaidCase.legal_transmission_date,
        lawyerName: unpaidCase.lawyer_name,
        courtReference: unpaidCase.court_reference,
        actions: actions || [],
      });
      toast.success("Dossier exporté avec succès");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmailReminder = async () => {
    if (!tenantEmail) {
      toast.error("Aucun e-mail disponible pour ce locataire");
      return;
    }
    setIsSendingReminder(true);
    try {
      const { error } = await supabase.functions.invoke("send-payment-reminder", {
        body: {
          paymentId: unpaidCase.payment_id,
          tenantName,
          tenantEmail,
          propertyTitle,
          amount: unpaidCase.amount_due,
          dueDate: unpaidCase.due_date,
          isLate: true,
        },
      });
      if (error) throw error;

      await addAction.mutateAsync({
        case_id: unpaidCase.id,
        action_type: "email_reminder",
        description: `Relance par e-mail envoyée à ${tenantEmail}`,
        metadata: null,
        document_url: null,
      });

      if (unpaidCase.status === "detected") {
        await updateCase.mutateAsync({ id: unpaidCase.id, status: "reminded" });
      }

      toast.success("Relance envoyée par e-mail");
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSendLegalEmail = async () => {
    if (!lawyerEmail) {
      toast.error("Veuillez renseigner l'e-mail du juriste");
      return;
    }
    setIsSendingReminder(true);
    try {
      // Save lawyer info
      await updateCase.mutateAsync({
        id: unpaidCase.id,
        status: "legal_proceedings",
        legal_transmission_date: new Date().toISOString().split("T")[0],
        lawyer_name: lawyerName || null,
        lawyer_email: lawyerEmail || null,
        lawyer_phone: lawyerPhone || null,
      });

      await addAction.mutateAsync({
        case_id: unpaidCase.id,
        action_type: "legal_transmission",
        description: `Dossier transmis à ${lawyerName || lawyerEmail}`,
        metadata: { lawyer_name: lawyerName, lawyer_email: lawyerEmail },
        document_url: null,
      });

      toast.success("Dossier transmis au service juridique");
    } catch {
      toast.error("Erreur lors de la transmission");
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer ce dossier ?")) return;
    try {
      await deleteCase.mutateAsync(unpaidCase.id);
      toast.success("Dossier supprimé");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Get current step index for progress
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === unpaidCase.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Dossier d'impayé - {tenantName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = step.key === unpaidCase.status;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <StepIcon className="h-3 w-3" />
                      <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={cn("w-4 h-0.5", isActive ? "bg-primary" : "bg-muted")} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info summary */}
            <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-lg p-4 text-sm">
              <div>
                <span className="text-muted-foreground">Locataire</span>
                <p className="font-medium">{tenantName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Bien</span>
                <p className="font-medium">{propertyTitle}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Montant dû</span>
                <p className="font-bold text-destructive">{Number(unpaidCase.amount_due).toLocaleString("fr-FR")} F CFA</p>
              </div>
              <div>
                <span className="text-muted-foreground">Retard</span>
                <p className="font-medium">{unpaidCase.days_late} jour{unpaidCase.days_late > 1 ? "s" : ""}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Échéance</span>
                <p className="font-medium">{format(new Date(unpaidCase.due_date), "d MMMM yyyy", { locale: fr })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Statut</span>
                <Badge variant="outline" className="mt-0.5">{STATUS_LABELS[unpaidCase.status]}</Badge>
              </div>
            </div>

            <Tabs defaultValue="actions" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="juridique">Juridique</TabsTrigger>
                <TabsTrigger value="historique">Historique</TabsTrigger>
                <TabsTrigger value="statut">Statut</TabsTrigger>
              </TabsList>

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start"
                    disabled={isSendingReminder || !tenantEmail}
                    onClick={handleSendEmailReminder}
                  >
                    {isSendingReminder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    Relancer par e-mail
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    disabled={isGeneratingPDF}
                    onClick={handleGenerateFormalNotice}
                  >
                    {isGeneratingPDF ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Mise en demeure (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    disabled={isGeneratingPDF}
                    onClick={handleExportDossier}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter le dossier
                  </Button>
                  <Button
                    variant="destructive"
                    className="justify-start"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer le dossier
                  </Button>
                </div>

                {/* Quick note */}
                <div className="space-y-2">
                  <Label>Ajouter une note</Label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Écrire une note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Juridique Tab */}
              <TabsContent value="juridique" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nom de l'avocat / huissier</Label>
                    <Input value={lawyerName} onChange={(e) => setLawyerName(e.target.value)} placeholder="Maître Dupont" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={lawyerEmail} onChange={(e) => setLawyerEmail(e.target.value)} placeholder="avocat@cabinet.com" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input value={lawyerPhone} onChange={(e) => setLawyerPhone(e.target.value)} placeholder="+225 07 00 00 00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Référence du tribunal</Label>
                    <Input value={courtReference} onChange={(e) => setCourtReference(e.target.value)} placeholder="Réf. TGI-2024-..." />
                  </div>
                  <Button onClick={handleSendLegalEmail} disabled={isSendingReminder || !lawyerEmail}>
                    {isSendingReminder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Transmettre au service juridique
                  </Button>
                </div>
              </TabsContent>

              {/* Historique Tab */}
              <TabsContent value="historique" className="mt-4">
                {actionsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (actions || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucune action enregistrée</p>
                ) : (
                  <div className="space-y-3">
                    {(actions || []).map((action) => (
                      <div key={action.id} className="flex gap-3 text-sm border-l-2 border-primary/20 pl-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {ACTION_LABELS[action.action_type] || action.action_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(action.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                            </span>
                          </div>
                          <p className="mt-1 text-foreground">{action.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Statut Tab */}
              <TabsContent value="statut" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Modifier le statut</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleStatusUpdate} disabled={newStatus === unpaidCase.status || updateCase.isPending}>
                  {updateCase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Mettre à jour le statut
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
