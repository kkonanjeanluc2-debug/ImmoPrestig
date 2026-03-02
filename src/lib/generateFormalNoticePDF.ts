import { createPDFDocument } from "./pdfFont";
import { formatAmountWithCurrency } from "./pdfFormat";
import { addPDFHeader, addPDFFooter, type PDFAgencyInfo } from "./pdfHeader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FormalNoticeData {
  tenantName: string;
  tenantAddress: string;
  propertyTitle: string;
  propertyAddress: string;
  amount: number;
  dueDate: string;
  daysLate: number;
  agency?: PDFAgencyInfo | null;
}

export const generateFormalNoticePDF = async (data: FormalNoticeData) => {
  const doc = await createPDFDocument();
  const pageWidth = doc.internal.pageSize.getWidth();

  let yPos = await addPDFHeader(doc, data.agency, "MISE EN DEMEURE");

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const today = format(new Date(), "d MMMM yyyy", { locale: fr });
  doc.text(`Fait le ${today}`, pageWidth - 15, yPos, { align: "right" });

  yPos += 12;

  // Destinataire
  doc.setFont("helvetica", "bold");
  doc.text("Destinataire :", 15, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.text(data.tenantName, 15, yPos);
  yPos += 6;
  if (data.tenantAddress) {
    const addrLines = doc.splitTextToSize(data.tenantAddress, pageWidth - 30);
    doc.text(addrLines, 15, yPos);
    yPos += addrLines.length * 5;
  }

  yPos += 10;

  // Object
  doc.setFont("helvetica", "bold");
  doc.text("Objet : Mise en demeure de payer le loyer impayé", 15, yPos);

  yPos += 12;
  doc.setFont("helvetica", "normal");

  // Body
  const formattedDueDate = format(new Date(data.dueDate), "d MMMM yyyy", { locale: fr });
  const formattedAmount = formatAmountWithCurrency(data.amount);

  const body = [
    `Madame, Monsieur ${data.tenantName},`,
    "",
    `Par la présente, je vous mets en demeure de régler la somme de ${formattedAmount} correspondant au loyer impayé du bien situé à ${data.propertyAddress || data.propertyTitle}.`,
    "",
    `Ce montant était exigible depuis le ${formattedDueDate}, soit un retard de ${data.daysLate} jour${data.daysLate > 1 ? "s" : ""} à ce jour.`,
    "",
    "Conformément aux termes de votre contrat de bail, et en application des dispositions légales en vigueur, je vous somme de régulariser votre situation dans un délai de quinze (15) jours à compter de la réception de la présente.",
    "",
    "À défaut de règlement dans le délai imparti, je me verrai dans l'obligation d'engager toutes les procédures légales nécessaires pour obtenir le recouvrement de cette créance, y compris la résiliation du bail et l'engagement d'une procédure d'expulsion.",
    "",
    "Je vous rappelle que les frais de procédure seront à votre charge exclusive.",
    "",
    "Dans l'attente de votre prompt règlement, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  ];

  const lineHeight = 6;
  for (const line of body) {
    if (line === "") {
      yPos += 4;
      continue;
    }
    const splitLines = doc.splitTextToSize(line, pageWidth - 30);
    for (const sl of splitLines) {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(sl, 15, yPos);
      yPos += lineHeight;
    }
  }

  yPos += 20;

  // Récapitulatif
  doc.setFont("helvetica", "bold");
  doc.text("Récapitulatif :", 15, yPos);
  yPos += 8;
  doc.setFont("helvetica", "normal");

  const recap = [
    ["Bien concerné", data.propertyTitle],
    ["Adresse", data.propertyAddress || "—"],
    ["Montant dû", formattedAmount],
    ["Date d'échéance", formattedDueDate],
    ["Jours de retard", `${data.daysLate} jour${data.daysLate > 1 ? "s" : ""}`],
  ];

  for (const [label, value] of recap) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, 80, yPos);
    yPos += 6;
  }

  yPos += 20;

  // Signature
  doc.setFont("helvetica", "italic");
  doc.text("Signature du bailleur :", pageWidth - 80, yPos);
  yPos += 15;
  doc.setDrawColor(150);
  doc.line(pageWidth - 80, yPos, pageWidth - 15, yPos);

  addPDFFooter(doc, data.agency, "Mise en demeure");

  doc.save(`mise-en-demeure-${data.tenantName.replace(/\s+/g, "-")}.pdf`);
};
