// Modèle par défaut d'attestation villageoise (format Markdown avec variables)
export const DEFAULT_ATTESTATION_TEMPLATE = `# ATTESTATION D'ATTRIBUTION N°{numero_lot}

## {nom_lotissement}

{arrete_approbation}

---

Je soussigné **{chef_village_name}** Chef du village de **{village}** certifie

Mme/Mlle/M **{beneficiaire_nom}**

Né(e) le : {beneficiaire_date_naissance} à {beneficiaire_lieu_naissance}

Adresse : {beneficiaire_adresse}

Tél : {beneficiaire_telephone}

CNI N° : {beneficiaire_cni}

Est attributaire du **Lot {numero_lot}** ilot **{ilot}** du lotissement **{nom_lotissement}**, sise dans la commune de **{commune}** suivant le plan d'urbanisation.

---

Les lots cédés par le Chef **{chef_village_name}** sont incontestables et irrévocables.

Par conséquent Mme/Mlle/M **{beneficiaire_nom}** est autorisé(e) à engager la procédure en vigueur en Côte d'Ivoire pour user en toute quiétude de son droit de propriété.

En foi de quoi, nous lui délivrons cette attestation pour servir et valoir ce que de droit.

**Fait à {ville}, le {date_vente}**

### LE CHEF DU VILLAGE

{chef_village_name}

_Signature et cachet_
`;

export const ATTESTATION_VARIABLES = [
  { variable: "{numero_lot}", description: "Numéro du lot" },
  { variable: "{ilot}", description: "Nom de l'îlot" },
  { variable: "{nom_lotissement}", description: "Nom du lotissement" },
  { variable: "{superficie}", description: "Superficie du lot en m²" },
  { variable: "{district}", description: "Nom du district" },
  { variable: "{commune}", description: "Nom de la commune" },
  { variable: "{village}", description: "Nom du village" },
  { variable: "{chef_village_name}", description: "Nom du Chef du village (depuis le lotissement)" },
  { variable: "{chef_village_titre}", description: "Titre/Arrêté du Chef (depuis le lotissement)" },
  { variable: "{arrete_approbation}", description: "Arrêté d'approbation du lotissement" },
  { variable: "{beneficiaire_nom}", description: "Nom complet du bénéficiaire" },
  { variable: "{beneficiaire_cni}", description: "N° CNI du bénéficiaire" },
  { variable: "{beneficiaire_profession}", description: "Profession du bénéficiaire" },
  { variable: "{beneficiaire_telephone}", description: "Téléphone du bénéficiaire" },
  { variable: "{beneficiaire_email}", description: "Email du bénéficiaire" },
  { variable: "{beneficiaire_adresse}", description: "Adresse du bénéficiaire" },
  { variable: "{beneficiaire_date_naissance}", description: "Date de naissance du bénéficiaire" },
  { variable: "{beneficiaire_lieu_naissance}", description: "Lieu de naissance du bénéficiaire" },
  { variable: "{date_vente}", description: "Date de la vente" },
  { variable: "{ville}", description: "Ville (pour 'Fait à...')" },
  { variable: "{nom_agence}", description: "Nom de l'agence" },
];

export const replaceAttestationVariables = (
  content: string,
  data: Record<string, string>
): string => {
  let result = content;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || '____________________');
  }
  return result;
};
