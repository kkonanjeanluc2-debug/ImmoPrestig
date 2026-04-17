export interface AttestationCessionInfo {
  nom?: string | null;
  cni_number?: string | null;
  telephone?: string | null;
}

export const formatAttestationPhone = (phone?: string | null): string => {
  if (!phone) return "";
  return (phone.match(/\d{10}/g) || [phone]).join(" / ");
};

export const buildAttestationTemplateContent = (
  content: string,
  data: Record<string, string>,
  options?: {
    ancienBeneficiaire?: AttestationCessionInfo | null;
  }
): string => {
  let finalContent = content;

  for (const [key, value] of Object.entries(data)) {
    finalContent = finalContent.replace(
      new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
      value || "____________________"
    );
  }

  const ancienBeneficiaire = options?.ancienBeneficiaire;
  const hasCessionMention = /mention de cession\s*:/i.test(finalContent);

  if (ancienBeneficiaire?.nom && !hasCessionMention) {
    const formattedPhone = formatAttestationPhone(ancienBeneficiaire.telephone);
    const cessionMention = `\n\n**Mention de cession :** Ce lot, initialement attribué à **${ancienBeneficiaire.nom}**${ancienBeneficiaire.cni_number ? ` (CNI : ${ancienBeneficiaire.cni_number})` : ""}${formattedPhone ? `, Contact : ${formattedPhone}` : ""}, a été cédé au bénéficiaire désigné ci-dessus.\n`;
    const faitAIndex = finalContent.toLowerCase().indexOf("fait à");

    finalContent = faitAIndex > 0
      ? `${finalContent.substring(0, faitAIndex)}${cessionMention}\n${finalContent.substring(faitAIndex)}`
      : `${finalContent}${cessionMention}`;
  }

  return finalContent;
};