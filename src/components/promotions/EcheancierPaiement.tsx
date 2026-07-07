import { useRef, useState } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertTriangle, Loader2, Upload, FileText, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgency, type Agency } from "@/hooks/useAgency";
import { toast } from "sonner";
import {
  useAppelsDeFonds,
  useEnregistrerPaiement,
  STADE_LABELS,
  MODE_PAIEMENT_LABELS,
  type AppelDeFonds,
  type ModePaiement,
} from "@/hooks/useAppelsDeFonds";
import { StatutPaiementBadge } from "./StatutBadge";

// ── Formatage sans espace fine (jsPDF rend U+202F en "/") ───────────────
const fmt = (n: number) =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

// ── Upload attestation ──────────────────────────────────────────────────

async function uploadAttestation(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/promotions/attestations/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw new Error(`Upload échoué : ${error.message}`);
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl;
}

// ── Chargement image en base64 pour jsPDF ──────────────────────────────

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Luminance relative — détermine si le fond est assez sombre pour du texte blanc
function isDark(r: number, g: number, b: number): boolean {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

// Détecte le format image depuis le DataURL base64
function detectImageFormat(b64: string): string {
  if (b64.startsWith("data:image/png")) return "PNG";
  if (b64.startsWith("data:image/gif")) return "GIF";
  if (b64.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

// ── Générateur de reçu PDF ──────────────────────────────────────────────

interface RecuInfo {
  clientNom: string;
  clientTelephone: string;
  programmeNom: string;
  lotRef: string;
  numeroContrat: string;
}

async function genererRecuPDF(appel: AppelDeFonds, info: RecuInfo, agency: Agency | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  let y = 0;

  // Couleurs agence ou défauts
  const primaryColor = agency?.pdf_primary_color || "#0f172a";
  const [pr, pg, pb] = hexToRgb(primaryColor);
  const accentColor = agency?.pdf_secondary_color || "#1e40af";
  const [ar, ag, ab] = hexToRgb(accentColor);

  const divider = (yPos: number, light = false) => {
    doc.setDrawColor(light ? 220 : 180, light ? 230 : 190, light ? 240 : 200);
    doc.setLineWidth(0.25);
    doc.line(M, yPos, W - M, yPos);
  };

  const labelVal = (label: string, value: string, yPos: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text(label, M, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(25, 25, 25);
    doc.text(value || "—", M + 58, yPos);
  };

  // ── En-tête agence ──────────────────────────────────────────────────
  const HEADER_H = 46;
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, W, HEADER_H, "F");

  // Couleur du texte selon luminance du fond
  const dark = isDark(pr, pg, pb);
  const textMain: [number, number, number] = dark ? [255, 255, 255] : [20, 20, 20];
  const textSub: [number, number, number]  = dark ? [210, 225, 240] : [60, 60, 80];
  const textCoord: [number, number, number] = dark ? [170, 195, 220] : [80, 80, 100];

  let logoLoaded = false;
  if (agency?.logo_url) {
    try {
      const b64 = await urlToBase64(agency.logo_url);
      const fmt_img = detectImageFormat(b64);
      // Logo dans une zone blanche arrondie pour l'isoler du fond coloré
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(M - 1, 5, 34, 34, 2, 2, "F");
      doc.addImage(b64, fmt_img, M + 1, 7, 30, 30);
      logoLoaded = true;
    } catch {
      // Logo non chargé — fallback texte
    }
  }

  const textX = logoLoaded ? M + 40 : M;

  // Nom de l'agence — on réapplique les couleurs explicitement après addImage
  doc.setFont("helvetica", "bold");
  doc.setFontSize(logoLoaded ? 15 : 18);
  doc.setTextColor(...textMain);
  doc.text(agency?.name || "IMMOPRESTIGE CI", textX, 17);

  // Sous-titre
  const subText = agency?.pdf_header_text || "Promotions Immobilières — Gestion des ventes VEFA";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...textSub);
  doc.text(subText, textX, 25);

  // Coordonnées agence
  const coords = [agency?.phone, agency?.email, agency?.address, agency?.city]
    .filter(Boolean).join("   ·   ");
  if (coords) {
    doc.setFontSize(7.5);
    doc.setTextColor(...textCoord);
    const coordLines = doc.splitTextToSize(coords, W - textX - M);
    doc.text(coordLines, textX, 33);
  }

  y = HEADER_H + 12;

  // ── Titre du reçu ──────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(25, 25, 25);
  doc.text("REÇU DE PAIEMENT", W / 2, y, { align: "center" });
  y += 7;

  const refLabel = appel.reference_paiement
    ? `N° ${appel.reference_paiement}`
    : `Réf. ${appel.id.slice(0, 8).toUpperCase()}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`${refLabel}   ·   Émis le ${new Date().toLocaleDateString("fr-FR")}`, W / 2, y, { align: "center" });
  y += 9;
  divider(y); y += 9;

  // ── Informations client ─────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(ar, ag, ab);
  doc.text("INFORMATIONS CLIENT", M, y);
  y += 6.5;

  labelVal("Nom & prénom(s)", info.clientNom, y); y += 6;
  labelVal("Téléphone", info.clientTelephone, y); y += 6;
  divider(y, true); y += 9;

  // ── Bien immobilier ─────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(ar, ag, ab);
  doc.text("BIEN IMMOBILIER", M, y);
  y += 6.5;

  labelVal("Programme", info.programmeNom, y); y += 6;
  labelVal("Référence lot", info.lotRef, y); y += 6;
  labelVal("N° contrat réservation", info.numeroContrat, y); y += 6;
  divider(y, true); y += 9;

  // ── Détails du paiement ─────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(ar, ag, ab);
  doc.text("DÉTAILS DU PAIEMENT", M, y);
  y += 6.5;

  labelVal("Désignation", appel.libelle, y); y += 6;
  labelVal("Stade des travaux", STADE_LABELS[appel.stade_travaux], y); y += 6;
  labelVal("Montant de l'appel", `${fmt(appel.montant_fcfa)} F CFA`, y); y += 7;

  // Montant réglé — mis en valeur
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text("Montant réglé", M, y);
  doc.setFontSize(12);
  doc.setTextColor(14, 120, 55);
  doc.text(`${fmt(appel.montant_paye_fcfa)} F CFA`, M + 58, y);
  y += 8;

  doc.setFontSize(8.5);
  doc.setTextColor(25, 25, 25);
  labelVal("Date de paiement", fmtDate(appel.date_paiement), y); y += 6;
  labelVal(
    "Mode de règlement",
    appel.mode_paiement ? MODE_PAIEMENT_LABELS[appel.mode_paiement] : "—",
    y
  ); y += 6;
  labelVal("Référence / N° reçu", appel.reference_paiement || "—", y); y += 6;

  const restant = appel.montant_fcfa - appel.montant_paye_fcfa;
  if (restant > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Solde restant", M, y);
    doc.setTextColor(180, 60, 20);
    doc.text(`${fmt(restant)} F CFA`, M + 58, y);
    y += 6;
  }

  if (appel.observations) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Observations", M, y);
    doc.setTextColor(25, 25, 25);
    const lines = doc.splitTextToSize(appel.observations, W - M * 2 - 58);
    doc.text(lines, M + 58, y);
    y += lines.length * 5;
  }

  y += 3;
  divider(y); y += 14;

  // ── Signatures ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text("Le Promoteur / Agent", M + 20, y, { align: "center" });
  doc.line(M + 4, y + 18, M + 36, y + 18);

  doc.text("Le Client / Acquéreur", W - M - 20, y, { align: "center" });
  doc.line(W - M - 36, y + 18, W - M - 4, y + 18);

  y += 28;

  // ── Pied de page ────────────────────────────────────────────────────
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Ce document est un reçu de paiement généré automatiquement. Il ne vaut pas acte notarié.",
    W / 2,
    y,
    { align: "center" }
  );

  const filename = `recu-${info.lotRef || appel.id.slice(0, 8)}-${appel.stade_travaux}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ── Icône de statut ────────────────────────────────────────────────────

function StatusIcon({ statut }: { statut: AppelDeFonds["statut_paiement"] }) {
  if (statut === "paye") return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
  if (statut === "en_retard") return <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />;
  if (statut === "partiellement_paye") return <Clock className="h-5 w-5 text-orange-500 shrink-0" />;
  return <Clock className="h-5 w-5 text-gray-300 shrink-0" />;
}

// ── Dialog enregistrement paiement ─────────────────────────────────────

interface PaiementDialogProps {
  appel: AppelDeFonds;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PaiementDialog({ appel, open, onOpenChange }: PaiementDialogProps) {
  const { user } = useAuth();
  const enregistrer = useEnregistrerPaiement();
  const restant = appel.montant_fcfa - (appel.montant_paye_fcfa || 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attestationFile, setAttestationFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    montant: String(restant),
    mode_paiement: "virement" as ModePaiement,
    reference_paiement: "",
    date_paiement: new Date().toISOString().split("T")[0],
    observations: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Le fichier ne doit pas dépasser 10 Mo"); return; }
    setAttestationFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = parseInt(form.montant);
    if (!montant || montant <= 0) { toast.error("Montant invalide"); return; }
    if (!user) return;

    setIsUploading(true);
    try {
      let attestation_url: string | undefined;
      if (attestationFile) {
        attestation_url = await uploadAttestation(attestationFile, user.id);
      }
      await enregistrer.mutateAsync({
        appelId: appel.id,
        reservationId: appel.reservation_id,
        montantPaye: montant,
        mode_paiement: form.mode_paiement,
        reference_paiement: form.reference_paiement.trim() || undefined,
        date_paiement: form.date_paiement,
        attestation_travaux_url: attestation_url,
        observations: form.observations.trim() || undefined,
      });
      toast.success("Paiement enregistré");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally {
      setIsUploading(false);
    }
  };

  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} Ko` : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-muted/50 rounded p-3 text-sm">
            <div className="font-medium">{appel.libelle}</div>
            <div className="text-muted-foreground">Restant : {fmt(restant)} F CFA</div>
          </div>
          <div className="space-y-1.5">
            <Label>Montant (F CFA) *</Label>
            <Input type="number" min="1" max={restant} value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Mode de paiement</Label>
            <Select value={form.mode_paiement} onValueChange={(v) => setForm({ ...form, mode_paiement: v as ModePaiement })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(MODE_PAIEMENT_LABELS) as [ModePaiement, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Référence / N° reçu</Label>
            <Input value={form.reference_paiement} onChange={(e) => setForm({ ...form, reference_paiement: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Date de paiement</Label>
            <Input type="date" value={form.date_paiement} onChange={(e) => setForm({ ...form, date_paiement: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Attestation travaux (optionnel)</Label>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange} className="hidden" />
            {!attestationFile ? (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Importer l'attestation (PDF, image…)</p>
              </button>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{attestationFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtSize(attestationFile.size)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                  onClick={() => { setAttestationFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Observations</Label>
            <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })}
              className="min-h-[60px] text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={enregistrer.isPending || isUploading}>
              {(enregistrer.isPending || isUploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isUploading ? "Import en cours..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Composant principal ─────────────────────────────────────────────────

interface Props {
  reservationId: string;
  prixTotal: number;
  clientNom?: string;
  clientTelephone?: string;
  programmeNom?: string;
  lotRef?: string;
  numeroContrat?: string;
}

export function EcheancierPaiement({
  reservationId,
  prixTotal,
  clientNom = "",
  clientTelephone = "",
  programmeNom = "",
  lotRef = "",
  numeroContrat = "",
}: Props) {
  const { data: appels = [], isLoading } = useAppelsDeFonds(reservationId);
  const { data: agency } = useAgency();
  const [payDialogAppel, setPayDialogAppel] = useState<AppelDeFonds | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement...</div>;
  if (appels.length === 0) return <div className="text-sm text-muted-foreground">Aucun appel de fonds.</div>;

  const totalPaye = appels.reduce((s, a) => s + (a.montant_paye_fcfa || 0), 0);
  const progressPct = prixTotal > 0 ? Math.round((totalPaye / prixTotal) * 100) : 0;

  const recuInfo: RecuInfo = { clientNom, clientTelephone, programmeNom, lotRef, numeroContrat };

  const handleDownload = async (appel: AppelDeFonds) => {
    setDownloadingId(appel.id);
    try {
      await genererRecuPDF(appel, recuInfo, agency ?? null);
    } catch {
      toast.error("Erreur lors de la génération du reçu");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre de progression globale */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Financement global</span>
          <span className="font-medium">{progressPct}% · {fmt(totalPaye)} / {fmt(prixTotal)} F CFA</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {appels.map((appel, idx) => {
          const isPaid = appel.statut_paiement === "paye";
          const isPartial = appel.statut_paiement === "partiellement_paye";
          const hasPaid = isPaid || isPartial;
          const canPay = !isPaid;
          const isDownloading = downloadingId === appel.id;
          return (
            <div key={appel.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StatusIcon statut={appel.statut_paiement} />
                {idx < appels.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
              </div>
              <div className={`flex-1 rounded-lg border p-3 mb-3 ${isPaid ? "bg-emerald-50/50 border-emerald-200" : "bg-white"}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-medium">{appel.libelle}</div>
                    <div className="text-xs text-muted-foreground">{STADE_LABELS[appel.stade_travaux]}</div>
                  </div>
                  <StatutPaiementBadge statut={appel.statut_paiement} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Montant : </span>
                    <span className="font-medium">{fmt(appel.montant_fcfa)} F</span>
                    {appel.pourcentage_prix && <span className="text-muted-foreground ml-1">({appel.pourcentage_prix}%)</span>}
                  </div>
                  {hasPaid && (
                    <div>
                      <span className="text-muted-foreground">Payé : </span>
                      <span className={`font-medium ${isPaid ? "text-emerald-600" : "text-orange-600"}`}>
                        {fmt(appel.montant_paye_fcfa)} F
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Date appel : </span>
                    {new Date(appel.date_appel).toLocaleDateString("fr-FR")}
                  </div>
                  {appel.date_paiement && (
                    <div>
                      <span className="text-muted-foreground">Date paiement : </span>
                      {new Date(appel.date_paiement).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                  {appel.reference_paiement && (
                    <div>
                      <span className="text-muted-foreground">Réf : </span>
                      {appel.reference_paiement}
                    </div>
                  )}
                  {appel.attestation_travaux_url && (
                    <div className="col-span-2">
                      <a href={appel.attestation_travaux_url} target="_blank" rel="noreferrer"
                        className="text-primary underline text-xs">
                        Attestation travaux ↗
                      </a>
                    </div>
                  )}
                  {appel.observations && (
                    <div className="col-span-2 text-muted-foreground italic">
                      {appel.observations}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {canPay && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setPayDialogAppel(appel)}>
                      Enregistrer un paiement
                    </Button>
                  )}
                  {hasPaid && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-primary hover:text-primary"
                      disabled={isDownloading}
                      onClick={() => handleDownload(appel)}
                    >
                      {isDownloading
                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        : <Download className="h-3 w-3 mr-1" />}
                      {isDownloading ? "Génération..." : "Télécharger le reçu"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {payDialogAppel && (
        <PaiementDialog
          appel={payDialogAppel}
          open={!!payDialogAppel}
          onOpenChange={(o) => !o && setPayDialogAppel(null)}
        />
      )}
    </div>
  );
}
