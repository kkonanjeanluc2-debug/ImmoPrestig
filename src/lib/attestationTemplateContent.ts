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

  return finalContent;
};