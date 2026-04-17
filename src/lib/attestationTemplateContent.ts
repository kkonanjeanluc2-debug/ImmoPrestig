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
  const ancienBeneficiaire = options?.ancienBeneficiaire;
  const formattedAncienPhone = formatAttestationPhone(ancienBeneficiaire?.telephone);

  const enrichedData: Record<string, string> = {
    ...data,
    "{ancien_beneficiaire_nom}": ancienBeneficiaire?.nom || data["{ancien_beneficiaire_nom}"] || "",
    "{ancien_beneficiaire_cni}": ancienBeneficiaire?.cni_number || data["{ancien_beneficiaire_cni}"] || "",
    "{ancien_beneficiaire_telephone}": formattedAncienPhone || data["{ancien_beneficiaire_telephone}"] || "",
  };

  for (const [key, value] of Object.entries(enrichedData)) {
    finalContent = finalContent.replace(
      new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
      value || "____________________"
    );
  }

  const hasCessionMention = /mention de cession\s*:/i.test(content);
  const hasAncienVariable = /\{ancien_beneficiaire_nom\}/.test(content);

  if (ancienBeneficiaire?.nom && !hasCessionMention && !hasAncienVariable) {
    const cessionMention = `\n\n**Mention de cession :** Ce lot, initialement attribué à **${ancienBeneficiaire.nom}**${ancienBeneficiaire.cni_number ? ` (CNI : ${ancienBeneficiaire.cni_number})` : ""}${formattedAncienPhone ? `, Contact : ${formattedAncienPhone}` : ""}, a été cédé au bénéficiaire désigné ci-dessus.\n`;
    const faitAIndex = finalContent.toLowerCase().indexOf("fait à");

    finalContent = faitAIndex > 0
      ? `${finalContent.substring(0, faitAIndex)}${cessionMention}\n${finalContent.substring(faitAIndex)}`
      : `${finalContent}${cessionMention}`;
  }

  return finalContent;
};