import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";
import { addPDFHeader, addPDFFooter, type PDFAgencyInfo } from "@/lib/pdfHeader";
import type { Acquisition } from "@/hooks/useAcquisitions";
import { TYPE_ACQUISITION_LABELS, ACQUISITION_STATUS_LABELS } from "@/hooks/useAcquisitions";

function checkPageBreak(doc: any, y: number, needed: number = 30): number {
  if (y + needed > 260) {
    doc.addPage();
    return 20;
  }
  return y;
}

function addLabelValue(doc: any, label: string, value: string, y: number, labelX = 18, valueX = 75): number {
  y = checkPageBreak(doc, y);
  doc.setFont("helvetica", "bold");
  doc.text(`${label} :`, labelX, y);
  doc.setFont("helvetica", "normal");
  doc.text(String(value || "-"), valueX, y);
  return y + 6;
}

function getCounterpartLabel(type: string): string {
  switch (type) {
    case "donation": return "Donateur";
    case "heritage": return "Défunt";
    case "apport_societe": return "Société bénéficiaire";
    case "echange": return "Partie à l'échange";
    default: return "Contrepartie";
  }
}

function addBienSection(doc: any, acq: Acquisition, y: number): number {
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMATIONS DU BIEN", 14, y);
  y += 8;
  doc.setFontSize(10);

  y = addLabelValue(doc, "Désignation", acq.biens_achat?.title || "-", y);
  y = addLabelValue(doc, "Adresse", `${acq.biens_achat?.address || ""}${acq.biens_achat?.city ? `, ${acq.biens_achat.city}` : ""}`, y);
  if (acq.valeur_estimee > 0) {
    y = addLabelValue(doc, "Valeur estimée", formatAmountWithCurrency(acq.valeur_estimee), y);
  }
  return y;
}

function addCounterpartSection(doc: any, acq: Acquisition, y: number): number {
  if (!acq.counterpart_name) return y;
  y += 4;
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(getCounterpartLabel(acq.type_acquisition).toUpperCase(), 14, y);
  y += 8;
  doc.setFontSize(10);

  y = addLabelValue(doc, "Nom", acq.counterpart_name, y);
  if (acq.counterpart_phone) y = addLabelValue(doc, "Téléphone", acq.counterpart_phone, y);
  if (acq.counterpart_email) y = addLabelValue(doc, "Email", acq.counterpart_email, y);
  if (acq.counterpart_address) y = addLabelValue(doc, "Adresse", acq.counterpart_address, y);
  return y;
}

function addNotaireSection(doc: any, acq: Acquisition, y: number): number {
  if (!acq.notaire_name) return y;
  y += 4;
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("NOTAIRE", 14, y);
  y += 8;
  doc.setFontSize(10);

  y = addLabelValue(doc, "Nom", acq.notaire_name, y);
  if (acq.notaire_phone) y = addLabelValue(doc, "Téléphone", acq.notaire_phone, y);
  if (acq.notaire_email) y = addLabelValue(doc, "Email", acq.notaire_email, y);
  if (acq.notaire_address) y = addLabelValue(doc, "Adresse", acq.notaire_address, y);
  return y;
}

function addDocumentsChecklist(doc: any, acq: Acquisition, y: number): number {
  y += 4;
  y = checkPageBreak(doc, y, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DOCUMENTS ET PIÈCES", 14, y);
  y += 8;
  doc.setFontSize(10);

  const docs = [
    ["Titre de propriété", acq.titre_propriete],
    ["Pièces d'identité", acq.pieces_identite],
    ["Certificat de localisation", acq.certificat_localisation],
    ["Acte notarié", acq.acte_notarie],
    ["Attestation fiscale", acq.attestation_fiscale],
  ];

  for (const [label, checked] of docs) {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${checked ? "☑" : "☐"} ${label}`, 18, y);
    y += 6;
  }
  return y;
}

function addSignatureBlock(doc: any, y: number, leftLabel: string, rightLabel: string): number {
  y += 15;
  y = checkPageBreak(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.text(leftLabel, 14, y);
  doc.text(rightLabel, 130, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Signature :", 14, y);
  doc.text("Signature :", 130, y);
  return y;
}

// =============================================
// 1. FICHE RÉCAPITULATIVE (tous types)
// =============================================
export async function generateFicheAcquisitionPDF(acq: Acquisition, agency?: PDFAgencyInfo | null) {
  const doc = await createPDFDocument();
  let y = await addPDFHeader(doc, agency, "FICHE RÉCAPITULATIVE", "Acquisition");

  // General info
  doc.setFontSize(10);
  y = addLabelValue(doc, "Type", TYPE_ACQUISITION_LABELS[acq.type_acquisition] || acq.type_acquisition, y);
  y = addLabelValue(doc, "Date d'acquisition", new Date(acq.date_acquisition).toLocaleDateString("fr-FR"), y);
  y = addLabelValue(doc, "Statut", ACQUISITION_STATUS_LABELS[acq.status] || acq.status, y);
  if (acq.date_acte_signe) y = addLabelValue(doc, "Date acte signé", new Date(acq.date_acte_signe).toLocaleDateString("fr-FR"), y);
  if (acq.date_enregistrement) y = addLabelValue(doc, "Date enregistrement", new Date(acq.date_enregistrement).toLocaleDateString("fr-FR"), y);

  y += 4;
  y = addBienSection(doc, acq, y);
  y = addCounterpartSection(doc, acq, y);

  // Type-specific fields
  if (acq.type_acquisition === "heritage") {
    y += 4;
    if (acq.date_deces) y = addLabelValue(doc, "Date de décès", new Date(acq.date_deces).toLocaleDateString("fr-FR"), y);
    if (acq.lien_parente) y = addLabelValue(doc, "Lien de parenté", acq.lien_parente, y);
    if (acq.numero_succession) y = addLabelValue(doc, "N° succession", acq.numero_succession, y);
  }
  if (acq.type_acquisition === "donation" && acq.type_donation) {
    y = addLabelValue(doc, "Type de donation", acq.type_donation, y);
  }
  if (acq.type_acquisition === "apport_societe") {
    if (acq.societe_name) y = addLabelValue(doc, "Société", acq.societe_name, y);
    if (acq.societe_siret) y = addLabelValue(doc, "SIRET / RCCM", acq.societe_siret, y);
    if (acq.type_apport) y = addLabelValue(doc, "Type d'apport", acq.type_apport, y);
  }
  if (acq.type_acquisition === "echange") {
    if (acq.bien_echange_description) y = addLabelValue(doc, "Bien échangé", acq.bien_echange_description, y);
    if (acq.valeur_bien_echange) y = addLabelValue(doc, "Valeur bien échangé", formatAmountWithCurrency(acq.valeur_bien_echange), y);
  }

  y = addNotaireSection(doc, acq, y);
  y = addDocumentsChecklist(doc, acq, y);

  if (acq.notes) {
    y += 4;
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.text("Observations :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(acq.notes, 180);
    doc.text(lines, 14, y);
  }

  addPDFFooter(doc, agency, "Fiche acquisition");
  doc.save(`Fiche_Acquisition_${acq.biens_achat?.title?.replace(/\s+/g, "_") || "bien"}.pdf`);
}

// =============================================
// 2. ACTE DE DONATION
// =============================================
export async function generateActeDonationPDF(acq: Acquisition, agency?: PDFAgencyInfo | null) {
  const doc = await createPDFDocument();
  let y = await addPDFHeader(doc, agency, "ACTE DE DONATION");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const lines = [
    "Entre les soussignés :",
    "",
    `Le Donateur : ${acq.counterpart_name || "_______________"}`,
    ...(acq.counterpart_address ? [`Domicilié(e) à : ${acq.counterpart_address}`] : []),
    ...(acq.counterpart_phone ? [`Téléphone : ${acq.counterpart_phone}`] : []),
    "",
    "Ci-après dénommé(e) \"le Donateur\",",
    "",
    "Et le Donataire (Bénéficiaire de la donation),",
    "",
    ...(acq.type_donation ? [`Type de donation : ${acq.type_donation}`] : []),
    "",
    "Il a été convenu ce qui suit :",
    "",
    "ARTICLE 1 - OBJET DE LA DONATION",
    "",
    `Le Donateur fait donation au Donataire du bien immobilier suivant :`,
    `Désignation : ${acq.biens_achat?.title || "_______________"}`,
    `Adresse : ${acq.biens_achat?.address || "_______________"}${acq.biens_achat?.city ? `, ${acq.biens_achat.city}` : ""}`,
    ...(acq.valeur_estimee > 0 ? [
      "",
      "ARTICLE 2 - ESTIMATION",
      "",
      `Valeur estimée : ${formatAmountWithCurrency(acq.valeur_estimee)}`,
      `Soit : ${numberToWordsPDF(acq.valeur_estimee)} francs CFA`,
    ] : []),
    "",
    "ARTICLE 3 - CONDITIONS",
    "",
    "Le Donataire accepte la présente donation avec toutes les charges et conditions y afférentes.",
    "Le Donateur déclare que le bien est libre de toute hypothèque ou charge.",
  ];

  for (const line of lines) {
    y = checkPageBreak(doc, y, 7);
    if (line.startsWith("ARTICLE")) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, 14, y);
    y += 6;
  }

  if (acq.notes) {
    y += 4;
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVATIONS :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(acq.notes, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 6;
  }

  y = addSignatureBlock(doc, y, "Le Donateur", "Le Donataire");

  addPDFFooter(doc, agency, "Acte de donation");
  doc.save(`Acte_Donation_${acq.biens_achat?.title?.replace(/\s+/g, "_") || "bien"}.pdf`);
}

// =============================================
// 3. ATTESTATION DE SUCCESSION
// =============================================
export async function generateAttestationSuccessionPDF(acq: Acquisition, agency?: PDFAgencyInfo | null) {
  const doc = await createPDFDocument();
  let y = await addPDFHeader(doc, agency, "ATTESTATION DE SUCCESSION");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const lines = [
    "Le soussigné atteste par la présente que :",
    "",
    `Le défunt : ${acq.counterpart_name || "_______________"}`,
    ...(acq.date_deces ? [`Date de décès : ${new Date(acq.date_deces).toLocaleDateString("fr-FR")}`] : []),
    ...(acq.lien_parente ? [`Lien de parenté avec l'héritier : ${acq.lien_parente}`] : []),
    ...(acq.numero_succession ? [`Numéro de succession : ${acq.numero_succession}`] : []),
    "",
    "A laissé à titre successoral le bien immobilier suivant :",
    "",
    `Désignation : ${acq.biens_achat?.title || "_______________"}`,
    `Adresse : ${acq.biens_achat?.address || "_______________"}${acq.biens_achat?.city ? `, ${acq.biens_achat.city}` : ""}`,
    ...(acq.valeur_estimee > 0 ? [
      `Valeur estimée : ${formatAmountWithCurrency(acq.valeur_estimee)}`,
      `Soit : ${numberToWordsPDF(acq.valeur_estimee)} francs CFA`,
    ] : []),
    "",
    "L'héritier déclare accepter la succession dans les conditions prévues par la loi",
    "et s'engage à effectuer toutes les formalités administratives nécessaires au",
    "transfert de propriété.",
  ];

  for (const line of lines) {
    y = checkPageBreak(doc, y, 7);
    doc.text(line, 14, y);
    y += 6;
  }

  if (acq.notes) {
    y += 4;
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVATIONS :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(acq.notes, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 6;
  }

  y = addSignatureBlock(doc, y, "L'Héritier", "Le Notaire");

  addPDFFooter(doc, agency, "Attestation de succession");
  doc.save(`Attestation_Succession_${acq.biens_achat?.title?.replace(/\s+/g, "_") || "bien"}.pdf`);
}

// =============================================
// 4. ACTE D'APPORT EN SOCIÉTÉ
// =============================================
export async function generateActeApportSocietePDF(acq: Acquisition, agency?: PDFAgencyInfo | null) {
  const doc = await createPDFDocument();
  let y = await addPDFHeader(doc, agency, "ACTE D'APPORT EN SOCIÉTÉ");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const lines = [
    "Entre les soussignés :",
    "",
    `L'Apporteur : ${acq.counterpart_name || "_______________"}`,
    ...(acq.counterpart_address ? [`Domicilié(e) à : ${acq.counterpart_address}`] : []),
    "",
    "Et la société bénéficiaire :",
    `Dénomination sociale : ${acq.societe_name || "_______________"}`,
    ...(acq.societe_siret ? [`SIRET / RCCM : ${acq.societe_siret}`] : []),
    ...(acq.type_apport ? [`Type d'apport : ${acq.type_apport}`] : []),
    "",
    "Il a été convenu ce qui suit :",
    "",
    "ARTICLE 1 - OBJET DE L'APPORT",
    "",
    `L'Apporteur fait apport à la Société du bien immobilier suivant :`,
    `Désignation : ${acq.biens_achat?.title || "_______________"}`,
    `Adresse : ${acq.biens_achat?.address || "_______________"}${acq.biens_achat?.city ? `, ${acq.biens_achat.city}` : ""}`,
    ...(acq.valeur_estimee > 0 ? [
      "",
      "ARTICLE 2 - ÉVALUATION DE L'APPORT",
      "",
      `Valeur de l'apport : ${formatAmountWithCurrency(acq.valeur_estimee)}`,
      `Soit : ${numberToWordsPDF(acq.valeur_estimee)} francs CFA`,
    ] : []),
    "",
    "ARTICLE 3 - CONTREPARTIE",
    "",
    "En contrepartie de cet apport, l'Apporteur recevra des parts sociales",
    "proportionnelles à la valeur de l'apport dans le capital de la Société.",
    "",
    "ARTICLE 4 - GARANTIES",
    "",
    "L'Apporteur déclare que le bien est libre de toute hypothèque, charge,",
    "servitude ou dette quelconque.",
  ];

  for (const line of lines) {
    y = checkPageBreak(doc, y, 7);
    if (line.startsWith("ARTICLE")) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, 14, y);
    y += 6;
  }

  if (acq.notes) {
    y += 4;
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVATIONS :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(acq.notes, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 6;
  }

  y = addSignatureBlock(doc, y, "L'Apporteur", "La Société");

  addPDFFooter(doc, agency, "Acte d'apport en société");
  doc.save(`Acte_Apport_${acq.biens_achat?.title?.replace(/\s+/g, "_") || "bien"}.pdf`);
}

// =============================================
// 5. ACTE D'ÉCHANGE
// =============================================
export async function generateActeEchangePDF(acq: Acquisition, agency?: PDFAgencyInfo | null) {
  const doc = await createPDFDocument();
  let y = await addPDFHeader(doc, agency, "ACTE D'ÉCHANGE IMMOBILIER");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const lines = [
    "Entre les soussignés :",
    "",
    `Première partie : ${acq.counterpart_name || "_______________"}`,
    ...(acq.counterpart_address ? [`Domicilié(e) à : ${acq.counterpart_address}`] : []),
    ...(acq.counterpart_phone ? [`Téléphone : ${acq.counterpart_phone}`] : []),
    "",
    "Et la seconde partie (Bénéficiaire),",
    "",
    "Il a été convenu l'échange suivant :",
    "",
    "ARTICLE 1 - BIEN REÇU",
    "",
    `Désignation : ${acq.biens_achat?.title || "_______________"}`,
    `Adresse : ${acq.biens_achat?.address || "_______________"}${acq.biens_achat?.city ? `, ${acq.biens_achat.city}` : ""}`,
    ...(acq.valeur_estimee > 0 ? [`Valeur estimée : ${formatAmountWithCurrency(acq.valeur_estimee)}`] : []),
    "",
    "ARTICLE 2 - BIEN CÉDÉ EN ÉCHANGE",
    "",
    `Description : ${acq.bien_echange_description || "_______________"}`,
    ...(acq.valeur_bien_echange ? [`Valeur estimée : ${formatAmountWithCurrency(acq.valeur_bien_echange)}`] : []),
    "",
    "ARTICLE 3 - CONDITIONS",
    "",
    "Les deux parties déclarent que les biens échangés sont libres de toute",
    "hypothèque ou charge et acceptent l'échange dans les conditions définies",
    "ci-dessus.",
  ];

  if (acq.valeur_estimee > 0 && acq.valeur_bien_echange) {
    const soulte = Math.abs(acq.valeur_estimee - acq.valeur_bien_echange);
    if (soulte > 0) {
      lines.push("");
      lines.push("ARTICLE 4 - SOULTE");
      lines.push("");
      lines.push(`Une soulte de ${formatAmountWithCurrency(soulte)} sera versée par la partie`);
      lines.push(`dont le bien a la valeur la moins élevée.`);
    }
  }

  for (const line of lines) {
    y = checkPageBreak(doc, y, 7);
    if (line.startsWith("ARTICLE")) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, 14, y);
    y += 6;
  }

  if (acq.notes) {
    y += 4;
    y = checkPageBreak(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVATIONS :", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(acq.notes, 180);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 6;
  }

  y = addSignatureBlock(doc, y, "Première partie", "Seconde partie");

  addPDFFooter(doc, agency, "Acte d'échange");
  doc.save(`Acte_Echange_${acq.biens_achat?.title?.replace(/\s+/g, "_") || "bien"}.pdf`);
}

// =============================================
// 6. ATTESTATION DE MUTATION (tous types)
// =============================================
export async function generateAttestationMutationPDF(acq: Acquisition, agency?: PDFAgencyInfo | null) {
  const doc = await createPDFDocument();
  let y = await addPDFHeader(doc, agency, "ATTESTATION DE MUTATION", "Transfert de propriété");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const typeLabel = TYPE_ACQUISITION_LABELS[acq.type_acquisition] || acq.type_acquisition;

  const lines = [
    "Le soussigné atteste par la présente que le bien immobilier décrit ci-dessous",
    `a fait l'objet d'un transfert de propriété par voie de ${typeLabel.toLowerCase()}.`,
    "",
    "BIEN CONCERNÉ :",
    `Désignation : ${acq.biens_achat?.title || "_______________"}`,
    `Adresse : ${acq.biens_achat?.address || "_______________"}${acq.biens_achat?.city ? `, ${acq.biens_achat.city}` : ""}`,
    ...(acq.valeur_estimee > 0 ? [`Valeur : ${formatAmountWithCurrency(acq.valeur_estimee)}`] : []),
    "",
    `Mode d'acquisition : ${typeLabel}`,
    `Date d'acquisition : ${new Date(acq.date_acquisition).toLocaleDateString("fr-FR")}`,
    ...(acq.date_acte_signe ? [`Date de signature de l'acte : ${new Date(acq.date_acte_signe).toLocaleDateString("fr-FR")}`] : []),
    ...(acq.date_enregistrement ? [`Date d'enregistrement : ${new Date(acq.date_enregistrement).toLocaleDateString("fr-FR")}`] : []),
    "",
    `Statut actuel : ${ACQUISITION_STATUS_LABELS[acq.status] || acq.status}`,
    "",
    "Cette attestation est délivrée pour servir et valoir ce que de droit.",
  ];

  for (const line of lines) {
    y = checkPageBreak(doc, y, 7);
    if (line === "BIEN CONCERNÉ :") {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, 14, y);
    y += 6;
  }

  y += 15;
  y = checkPageBreak(doc, y, 30);
  doc.setFont("helvetica", "bold");
  doc.text("Cachet et signature", 14, y);

  addPDFFooter(doc, agency, "Attestation de mutation");
  doc.save(`Attestation_Mutation_${acq.biens_achat?.title?.replace(/\s+/g, "_") || "bien"}.pdf`);
}
