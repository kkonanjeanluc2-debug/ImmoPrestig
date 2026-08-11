export interface AttestationCessionInfo {
  nom?: string | null;
  cni_number?: string | null;
  telephone?: string | null;
  adresse?: string | null;
}

export const formatAttestationPhone = (phone?: string | null): string => {
  if (!phone) return "";
  // Numbers may be given as several entries separated by "/", each possibly
  // prefixed with the Côte d'Ivoire country code (+225 / 00225 / 225).
  const numbers = phone
    .split(/\s*\/\s*/)
    .map((part) => {
      let digits = part.replace(/\D/g, "");
      // Strip the country code so it isn't mistaken for part of the 10-digit local number
      if (digits.length > 10 && digits.startsWith("225")) {
        digits = digits.slice(3);
      }
      return digits;
    })
    .filter((digits) => digits.length === 10);

  return numbers.length > 0 ? numbers.join(" / ") : phone;
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