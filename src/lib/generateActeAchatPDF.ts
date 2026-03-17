import { createPDFDocument } from "@/lib/pdfFont";
import { formatAmountWithCurrency, numberToWordsPDF } from "@/lib/pdfFormat";
import { addPDFHeader, addPDFFooter, type PDFAgencyInfo } from "@/lib/pdfHeader";
import type { AchatImmobilier, AchatPartyInfo } from "@/hooks/useAchatsImmobiliers";
import type { BienAchat } from "@/hooks/useBiensAchat";

export interface AchatSignatureForPDF {
  signerType: "vendor" | "buyer";
  signerName: string;
  signatureType: "drawn" | "typed";
  signatureData?: string | null;
  signatureText?: string | null;
  signedAt: string;
}

function checkPageBreak(doc: any, y: number, needed: number = 30): number {
  if (y + needed > 260) {
    doc.addPage();
    return 20;
  }
  return y;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderPartyIdentity(doc: any, party: AchatPartyInfo | null | undefined, fallbackName: string, y: number, indent: number): number {
  const name = party?.name || fallbackName;
  doc.setFont("helvetica", "bold");
  doc.text(`${name}`, indent, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  if (party?.profession) {
    doc.text(`Profession : ${party.profession}`, indent, y);
    y += 5;
  }
  if (party?.birth_date) {
    const birthInfo = `Né(e) le ${formatDate(party.birth_date)}${party.birth_place ? ` à ${party.birth_place}` : ""}`;
    doc.text(birthInfo, indent, y);
    y += 5;
  }
  if (party?.cni_number) {
    doc.text(`CNI N° : ${party.cni_number}`, indent, y);
    y += 5;
  }
  if (party?.address) {
    doc.text(`Domicilié(e) à : ${party.address}`, indent, y);
    y += 5;
  }
  if (party?.phone) {
    doc.text(`Téléphone : ${party.phone}`, indent, y);
    y += 5;
  }
  if (party?.email) {
    doc.text(`Email : ${party.email}`, indent, y);
    y += 5;
  }
  return y;
}

function renderArticle(doc: any, y: number, articleTitle: string, paragraphs: string[], pageWidth: number): number {
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(articleTitle, 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  for (const p of paragraphs) {
    y = checkPageBreak(doc, y, 10);
    const lines = doc.splitTextToSize(p, pageWidth - 30);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 3;
  }
  return y;
}

export async function generateActeAchatPDF(
  achat: AchatImmobilier,
  bien: BienAchat,
  signatures: AchatSignatureForPDF[] = [],
  agency?: PDFAgencyInfo | null,
  mode: "acte" | "compromis" = "acte"
) {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const lieu = agency?.city || "Abidjan";
  const dateStr = formatDate(achat.sale_date);

  const title = mode === "acte"
    ? "ACTE DE VENTE IMMOBILIÈRE"
    : "COMPROMIS D'ACHAT IMMOBILIER";

  let y = await addPDFHeader(doc, agency, title);

  // === Préambule & références juridiques ===
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  const legalRef = mode === "acte"
    ? "Établi conformément au Décret du 26 juillet 1932 portant réorganisation de la propriété foncière, à la Loi n° 98-750 du 23 décembre 1998 relative au domaine foncier rural et au Code Civil ivoirien."
    : "Établi conformément aux dispositions du Code Civil ivoirien relatives aux promesses de vente et au Décret du 26 juillet 1932 portant réorganisation de la propriété foncière.";
  const refLines = doc.splitTextToSize(legalRef, pageWidth - 28);
  doc.text(refLines, 14, y);
  y += refLines.length * 3.5 + 4;

  // Date & lieu
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait à ${lieu}, le ${dateStr}`, pageWidth - 15, y, { align: "right" });
  y += 12;

  // === ARTICLE 1 : COMPARUTION DES PARTIES ===
  y = checkPageBreak(doc, y, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 1 - COMPARUTION DES PARTIES", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Entre les soussignés :", 14, y);
  y += 7;

  // Vendeur
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LE VENDEUR :", 14, y);
  y += 6;
  doc.setFontSize(9);
  const vendeurParty = (achat.vendeurs || bien.vendeurs || null) as AchatPartyInfo | null;
  y = renderPartyIdentity(doc, vendeurParty, "-", y, 20);
  doc.setFont("helvetica", "normal");
  doc.text("Ci-après dénommé(e) « LE VENDEUR »", 20, y);
  y += 8;

  // Acquéreur
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("L'ACQUÉREUR :", 14, y);
  y += 6;
  doc.setFontSize(9);

  if (achat.is_agency_purchase && agency) {
    // L'agence est l'acquéreur
    doc.setFont("helvetica", "bold");
    doc.text(agency.name, 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    if (agency.siret) {
      doc.text(`RCCM : ${agency.siret}`, 20, y);
      y += 5;
    }
    if (agency.address) {
      doc.text(`Siège social : ${agency.address}${agency.city ? `, ${agency.city}` : ""}`, 20, y);
      y += 5;
    }
    if (agency.phone) {
      doc.text(`Téléphone : ${agency.phone}`, 20, y);
      y += 5;
    }
    if (agency.email) {
      doc.text(`Email : ${agency.email}`, 20, y);
      y += 5;
    }
  } else {
    y = renderPartyIdentity(doc, achat.acquereurs, "-", y, 20);
  }

  doc.setFont("helvetica", "normal");
  doc.text("Ci-après dénommé(e) « L'ACQUÉREUR »", 20, y);
  y += 10;

  // === ARTICLE 2 : DÉSIGNATION DU BIEN ===
  y = renderArticle(doc, y, "ARTICLE 2 - DÉSIGNATION DU BIEN", [
    `Le vendeur déclare être propriétaire du bien immobilier ci-après désigné :`,
  ], pageWidth);

  doc.setFontSize(9);
  const bienDetails: [string, string][] = [
    ["Nature du bien", bien.property_type],
    ["Désignation", bien.title],
    ["Situation", `${bien.address}${bien.city ? `, ${bien.city}` : ""}`],
    ["Superficie", bien.area ? `${bien.area} m²` : "Non précisée"],
  ];

  for (const [label, value] of bienDetails) {
    y = checkPageBreak(doc, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), 70, y);
    y += 6;
  }
  y += 4;

  // === ARTICLE 3 : ORIGINE DE PROPRIÉTÉ ===
  y = renderArticle(doc, y, "ARTICLE 3 - ORIGINE DE PROPRIÉTÉ", [
    "Le vendeur déclare être devenu propriétaire du bien sus-désigné par voie d'acquisition régulière, conformément aux lois et règlements en vigueur en République de Côte d'Ivoire.",
    "Il affirme que le bien n'a fait l'objet d'aucune contestation de propriété et qu'il dispose de tous les droits nécessaires pour procéder à la présente vente.",
  ], pageWidth);
  y += 2;

  // === ARTICLE 4 : PRIX ET MODALITÉS DE PAIEMENT ===
  y = checkPageBreak(doc, y, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE 4 - PRIX ET MODALITÉS DE PAIEMENT", 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("La présente vente est consentie et acceptée moyennant le prix de :", 14, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${formatAmountWithCurrency(achat.sale_price)}`, 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`(${numberToWordsPDF(achat.sale_price)} francs CFA)`, 20, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  if (achat.payment_type === "comptant") {
    doc.text("Le prix est payable au comptant, et le vendeur reconnaît en avoir reçu le montant intégral", 14, y);
    y += 5;
    doc.text("ce jour même, dont quittance.", 14, y);
    y += 6;
  } else {
    doc.text("Le prix est payable selon les modalités suivantes :", 14, y);
    y += 6;
    if (achat.down_payment) {
      doc.text(`- Apport initial : ${formatAmountWithCurrency(achat.down_payment)}`, 20, y);
      y += 5;
    }
    if (achat.total_installments) {
      const remaining = achat.sale_price - (achat.down_payment || 0);
      const monthly = Math.round(remaining / achat.total_installments);
      doc.text(`- Solde de ${formatAmountWithCurrency(remaining)} payable en ${achat.total_installments} échéances de ${formatAmountWithCurrency(monthly)}`, 20, y);
      y += 5;
    }
  }
  y += 4;

  // === ARTICLE 5 : CHARGES ET CONDITIONS ===
  const chargesArticles = mode === "acte"
    ? [
        "La présente vente est consentie aux charges et conditions ordinaires et de droit, et notamment :",
        "1° L'acquéreur prendra le bien dans l'état où il se trouve au jour de l'entrée en jouissance, sans pouvoir prétendre à aucune diminution du prix pour quelque cause que ce soit ;",
        "2° Il acquittera les impôts, contributions et charges de toute nature dont le bien pourrait être grevé, à compter du jour de l'entrée en jouissance ;",
        "3° Il souffrira les servitudes passives, apparentes ou occultes, pouvant grever le bien, sauf à s'en défendre et à profiter de celles actives, le tout à ses risques et périls ;",
        "4° Il fera son affaire personnelle de toutes les autorisations administratives nécessaires.",
      ]
    : [
        "La présente promesse est conclue sous les conditions suspensives suivantes :",
        "1° L'obtention par l'acquéreur du financement nécessaire à l'acquisition dans un délai de quatre-vingt-dix (90) jours ;",
        "2° La remise par le vendeur de l'ensemble des documents nécessaires au transfert de propriété (titre foncier, certificat de situation juridique, etc.) ;",
        "3° L'absence de toute servitude, hypothèque, saisie ou charge grevant le bien non déclarée dans le présent acte ;",
        "4° En cas de non-réalisation de l'une quelconque de ces conditions dans le délai imparti, la présente promesse sera caduque de plein droit et les sommes versées seront restituées à l'acquéreur.",
      ];
  y = renderArticle(doc, y, "ARTICLE 5 - CHARGES ET CONDITIONS", chargesArticles, pageWidth);
  y += 2;

  // === ARTICLE 6 : DÉCLARATIONS DU VENDEUR ===
  y = renderArticle(doc, y, "ARTICLE 6 - DÉCLARATIONS DU VENDEUR", [
    "Le vendeur déclare :",
    "- Être le seul et unique propriétaire du bien objet de la présente vente ;",
    "- Que le bien est libre de toute hypothèque, privilège, nantissement, servitude non apparente ou autre charge réelle ;",
    "- N'avoir consenti aucune promesse de vente ni aucun droit de préemption au profit de tiers ;",
    "- Que le bien n'est l'objet d'aucun litige, contestation ou procédure judiciaire en cours ;",
    "- Être en règle avec toutes les obligations fiscales relatives au bien.",
  ], pageWidth);
  y += 2;

  // === ARTICLE 7 : TRANSFERT DE PROPRIÉTÉ ===
  if (mode === "acte") {
    y = renderArticle(doc, y, "ARTICLE 7 - TRANSFERT DE PROPRIÉTÉ ET JOUISSANCE", [
      "Le transfert de propriété sera effectif à compter de la signature du présent acte et du paiement intégral du prix convenu.",
      "L'acquéreur entrera en jouissance du bien à compter de ce jour par la prise de possession réelle.",
      "Les parties s'engagent à accomplir toutes les formalités nécessaires à la mutation du titre de propriété auprès de la Conservation de la Propriété Foncière, conformément au Décret du 26 juillet 1932.",
    ], pageWidth);
  } else {
    y = renderArticle(doc, y, "ARTICLE 7 - RÉALISATION DE LA VENTE", [
      "La réalisation de la vente définitive aura lieu dans un délai de quatre-vingt-dix (90) jours à compter de la signature du présent compromis, par-devant notaire.",
      "Les parties s'engagent à fournir toutes les pièces et à accomplir toutes les formalités nécessaires en temps utile.",
    ], pageWidth);
  }
  y += 2;

  // === ARTICLE 8 : FRAIS ===
  const fraisLines: string[] = [
    "Conformément au Décret n° 2013-461 et aux usages en vigueur en Côte d'Ivoire, les frais se répartissent comme suit :",
  ];
  if (achat.notary_fees) {
    fraisLines.push(`- Frais de notaire et d'enregistrement : ${formatAmountWithCurrency(achat.notary_fees)}`);
  }
  if (achat.commission_amount) {
    const pct = achat.commission_percentage ? ` (${achat.commission_percentage}%)` : "";
    fraisLines.push(`- Honoraires d'agence${pct} : ${formatAmountWithCurrency(achat.commission_amount)}`);
  }
  fraisLines.push("- Les droits d'enregistrement (7%) et la taxe de publicité foncière (1,2%) sont à la charge de l'acquéreur, sauf convention contraire des parties.");
  y = renderArticle(doc, y, "ARTICLE 8 - FRAIS ET DROITS", fraisLines, pageWidth);
  y += 2;

  // === ARTICLE 9 : ÉLECTION DE DOMICILE ===
  y = renderArticle(doc, y, "ARTICLE 9 - ÉLECTION DE DOMICILE", [
    `Pour l'exécution des présentes et de leurs suites, les parties font élection de domicile en leurs adresses respectives ci-dessus indiquées.`,
    `Tout litige relatif à l'interprétation ou à l'exécution du présent acte sera soumis aux tribunaux compétents d'Abidjan, République de Côte d'Ivoire.`,
  ], pageWidth);
  y += 2;

  // === OBSERVATIONS ===
  if (achat.notes) {
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVATIONS PARTICULIÈRES :", 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(achat.notes, pageWidth - 28);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 4.5 + 4;
  }

  // === SIGNATURES ===
  y += 10;
  y = checkPageBreak(doc, y, 70);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SIGNATURES DES PARTIES", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Fait en double exemplaire à ${lieu}, le ${dateStr}`, 14, y);
  y += 5;
  doc.text("Chaque partie reconnaissant avoir reçu le sien.", 14, y);
  y += 10;

  const vendorX = 14;
  const buyerX = pageWidth / 2 + 10;
  const vendeurName = vendeurParty?.name || "-";
  const acquereurName = achat.is_agency_purchase && agency ? agency.name : (achat.acquereurs?.name || "-");

  doc.setFont("helvetica", "bold");
  doc.text("LE VENDEUR", vendorX, y);
  doc.text("L'ACQUÉREUR", buyerX, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(vendeurName, vendorX, y);
  doc.text(acquereurName, buyerX, y);
  y += 4;

  const vendorSig = signatures.find(s => s.signerType === "vendor");
  const buyerSig = signatures.find(s => s.signerType === "buyer");

  if (vendorSig || buyerSig) {
    y += 2;
    doc.text("Lu et approuvé, bon pour vente", vendorX, y);
    doc.text("Lu et approuvé, bon pour acquisition", buyerX, y);
    y += 4;

    if (vendorSig) {
      if (vendorSig.signatureType === "drawn" && vendorSig.signatureData) {
        try { doc.addImage(vendorSig.signatureData, "PNG", vendorX, y, 60, 30); } catch {}
      } else if (vendorSig.signatureText) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "italic");
        doc.text(vendorSig.signatureText, vendorX, y + 15);
      }
      const vDate = new Date(vendorSig.signedAt);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Signé le ${vDate.toLocaleDateString("fr-FR")} à ${vDate.toLocaleTimeString("fr-FR")}`, vendorX, y + 33);
    }

    if (buyerSig) {
      if (buyerSig.signatureType === "drawn" && buyerSig.signatureData) {
        try { doc.addImage(buyerSig.signatureData, "PNG", buyerX, y, 60, 30); } catch {}
      } else if (buyerSig.signatureText) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "italic");
        doc.text(buyerSig.signatureText, buyerX, y + 15);
      }
      const bDate = new Date(buyerSig.signedAt);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`Signé le ${bDate.toLocaleDateString("fr-FR")} à ${bDate.toLocaleTimeString("fr-FR")}`, buyerX, y + 33);
    }
  } else {
    y += 4;
    doc.text("Signature :", vendorX, y);
    doc.text("Signature :", buyerX, y);
  }

  const footerLabel = mode === "acte" ? "Acte de vente immobilière" : "Compromis de vente immobilière";
  addPDFFooter(doc, agency, `${footerLabel} - ${bien.title}`);
  doc.save(`${footerLabel.replace(/'/g, "_").replace(/\s+/g, "_")}_${bien.title.replace(/\s+/g, "_")}.pdf`);
}
