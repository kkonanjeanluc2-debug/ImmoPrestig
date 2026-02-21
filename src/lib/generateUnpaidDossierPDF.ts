import { createPDFDocument } from "./pdfFont";
import { formatAmountWithCurrency } from "./pdfFormat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UnpaidDossierData {
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  propertyTitle: string;
  propertyAddress: string;
  amount: number;
  dueDate: string;
  daysLate: number;
  status: string;
  formalNoticeDate: string | null;
  legalTransmissionDate: string | null;
  lawyerName: string | null;
  courtReference: string | null;
  actions: Array<{
    action_type: string;
    description: string;
    created_at: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  detected: "Détecté",
  reminded: "Relancé",
  formal_notice: "Mise en demeure",
  legal_proceedings: "Procédure judiciaire",
  awaiting_judgment: "En attente de jugement",
  eviction_validated: "Expulsion validée",
  eviction_executed: "Expulsion exécutée",
  eviction_cancelled: "Expulsion annulée",
  resolved: "Résolu",
};

const ACTION_LABELS: Record<string, string> = {
  detection: "Détection",
  email_reminder: "Relance par e-mail",
  whatsapp_reminder: "Relance WhatsApp",
  sms_reminder: "Relance SMS",
  formal_notice: "Mise en demeure",
  legal_transmission: "Transmission juridique",
  status_update: "Mise à jour",
  note: "Note",
};

export const generateUnpaidDossierPDF = async (data: UnpaidDossierData) => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  const checkPage = (needed: number) => {
    if (yPos + needed > 275) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 54, 93);
  doc.text("DOSSIER D'IMPAYÉ", pageWidth / 2, yPos, { align: "center" });

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Généré le ${format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, yPos, { align: "center" });

  yPos += 15;
  doc.setTextColor(0);

  // Section: Locataire
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 4, pageWidth - 30, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INFORMATIONS DU LOCATAIRE", 20, yPos + 1);

  yPos += 12;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const tenantInfo = [
    ["Nom", data.tenantName],
    ["E-mail", data.tenantEmail || "Non renseigné"],
    ["Téléphone", data.tenantPhone || "Non renseigné"],
  ];

  for (const [label, value] of tenantInfo) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, yPos);
    yPos += 6;
  }

  yPos += 8;

  // Section: Bien
  checkPage(40);
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 4, pageWidth - 30, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BIEN CONCERNÉ", 20, yPos + 1);

  yPos += 12;
  doc.setFontSize(10);

  const propertyInfo = [
    ["Bien", data.propertyTitle],
    ["Adresse", data.propertyAddress || "Non renseignée"],
  ];

  for (const [label, value] of propertyInfo) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, yPos);
    yPos += 6;
  }

  yPos += 8;

  // Section: Détails de l'impayé
  checkPage(50);
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 4, pageWidth - 30, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DÉTAILS DE L'IMPAYÉ", 20, yPos + 1);

  yPos += 12;
  doc.setFontSize(10);

  const unpaidInfo = [
    ["Montant dû", formatAmountWithCurrency(data.amount)],
    ["Date d'échéance", format(new Date(data.dueDate), "d MMMM yyyy", { locale: fr })],
    ["Jours de retard", `${data.daysLate} jour${data.daysLate > 1 ? "s" : ""}`],
    ["Statut actuel", STATUS_LABELS[data.status] || data.status],
    ["Date de mise en demeure", data.formalNoticeDate ? format(new Date(data.formalNoticeDate), "d MMMM yyyy", { locale: fr }) : "—"],
    ["Date de transmission juridique", data.legalTransmissionDate ? format(new Date(data.legalTransmissionDate), "d MMMM yyyy", { locale: fr }) : "—"],
    ["Avocat / Huissier", data.lawyerName || "—"],
    ["Référence tribunal", data.courtReference || "—"],
  ];

  for (const [label, value] of unpaidInfo) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, 90, yPos);
    yPos += 6;
  }

  yPos += 8;

  // Section: Historique des actions
  checkPage(20);
  doc.setFillColor(240, 240, 240);
  doc.rect(15, yPos - 4, pageWidth - 30, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("HISTORIQUE DES ACTIONS", 20, yPos + 1);

  yPos += 12;
  doc.setFontSize(9);

  if (data.actions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text("Aucune action enregistrée", 20, yPos);
    yPos += 8;
  } else {
    for (const action of data.actions) {
      checkPage(15);
      const dateStr = format(new Date(action.created_at), "dd/MM/yyyy HH:mm", { locale: fr });
      const typeLabel = ACTION_LABELS[action.action_type] || action.action_type;

      doc.setFont("helvetica", "bold");
      doc.text(`${dateStr} - ${typeLabel}`, 20, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(action.description, pageWidth - 45);
      doc.text(descLines, 25, yPos);
      yPos += descLines.length * 4 + 4;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Document confidentiel - Dossier d'impayé généré automatiquement", pageWidth / 2, 285, { align: "center" });

  doc.save(`dossier-impaye-${data.tenantName.replace(/\s+/g, "-")}.pdf`);
};
