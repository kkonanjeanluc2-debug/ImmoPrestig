// Modèle par défaut d'attestation villageoise (format Markdown avec variables)
export const DEFAULT_ATTESTATION_TEMPLATE = `# ATTESTATION D'ATTRIBUTION N°{numero_lot}

## {nom_lotissement}

{arrete_approbation}

---

Nous soussignés,

**Monsieur {chef_village_name}, Chef du village de {village}**,
{chef_village_titre}

**Attestons que :**

M / Mme / Mlle : **{beneficiaire_nom}**

Type de pièce : CNI N° : {beneficiaire_cni}

Profession : {beneficiaire_profession}

Contact : {beneficiaire_telephone} / {beneficiaire_email}

Domicile : {beneficiaire_adresse}

---

Est Attributaire du **Lot {numero_lot}** - **Îlot {ilot}** du lotissement **{nom_lotissement}**

Superficie : **{superficie} m²**

---

En foi de quoi, la présente Attestation qui annule toutes attestations antérieures sur ledit lot est délivrée en vue des formalités domaniales.

**Fait à {ville}, le {date_vente}**

### LE CHEF DU VILLAGE

{chef_village_name}

_Signature et cachet_
`;

export const ATTESTATION_VARIABLES = [
  { variable: "{numero_lot}", description: "Numéro du lot" },
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
