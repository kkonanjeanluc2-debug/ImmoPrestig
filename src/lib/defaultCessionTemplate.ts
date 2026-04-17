// Modèle par défaut d'attestation de cession (format Markdown avec variables)
export const DEFAULT_CESSION_TEMPLATE = `# ATTESTATION DE CESSION

N°…………..

---

Je, soussigné(e), **{nom_agence}**, Promoteur du lotissement **{nom_lotissement}**, atteste que :

Monsieur / Madame / Mademoiselle **{beneficiaire_nom}**

Contact(s) : **{beneficiaire_telephone}** / Profession : **{beneficiaire_profession}**

Domicilié à : **{beneficiaire_adresse}**

CNI/Passeport n° **{beneficiaire_cni}**

Est bénéficiaire du lot n° : **{numero_lot}** Ilot : **{ilot}** du lotissement **{nom_lotissement}** (Commune de **{commune}**)

---

Cédé par :

Monsieur/Madame **{cedant_nom}**

Contact : **{cedant_telephone}**

CNI n° **{cedant_cni}**

---

**Mention de cession :** Ce lot, initialement attribué à **{ancien_beneficiaire_nom}** (CNI : {ancien_beneficiaire_cni}), Contact : {ancien_beneficiaire_telephone}, a été cédé au bénéficiaire désigné ci-dessus.

---

NB : Cette attestation sera consolidée par l'acquisition des documents administratifs (Attestation d'attribution villageoise, Enregistrement, Arrêté de Concession Définitive etc. qui garantiront votre propriété).

En foi de quoi, cette présente attestation de cession est faite pour servir et faire valoir ce que de droit.

**Fait à {ville}, le {date_vente}**

**LE PROPRIÉTAIRE TERRIEN**                                                                    **AGENCE / PROMOTEUR**
`;

export const CESSION_VARIABLES = [
  { variable: "{numero_lot}", description: "Numéro du lot" },
  { variable: "{ilot}", description: "Nom de l'îlot" },
  { variable: "{nom_lotissement}", description: "Nom du lotissement" },
  { variable: "{superficie}", description: "Superficie du lot en m²" },
  { variable: "{commune}", description: "Nom de la commune" },
  { variable: "{village}", description: "Nom du village" },
  { variable: "{beneficiaire_nom}", description: "Nom complet du bénéficiaire (acquéreur)" },
  { variable: "{beneficiaire_cni}", description: "N° CNI du bénéficiaire" },
  { variable: "{beneficiaire_profession}", description: "Profession du bénéficiaire" },
  { variable: "{beneficiaire_telephone}", description: "Téléphone du bénéficiaire" },
  { variable: "{beneficiaire_adresse}", description: "Adresse du bénéficiaire" },
  { variable: "{cedant_nom}", description: "Nom du propriétaire terrien" },
  { variable: "{cedant_cni}", description: "N° CNI du propriétaire terrien" },
  { variable: "{cedant_telephone}", description: "Téléphone du propriétaire terrien" },
  { variable: "{date_vente}", description: "Date de la cession" },
  { variable: "{ville}", description: "Ville (pour 'Fait à...')" },
  { variable: "{nom_agence}", description: "Nom de l'agence/promoteur" },
];
