export const DEFAULT_MANAGEMENT_CONTRACT_TEMPLATE = `# CONTRAT DE GESTION LOCATIVE

## ENTRE LES SOUSSIGNÉS

**Le Mandant (Propriétaire) :**
Nom : {proprietaire}
Adresse : {proprietaire_adresse}
Téléphone : {proprietaire_telephone}
Email : {proprietaire_email}
Date de naissance : {proprietaire_date_naissance}
Lieu de naissance : {proprietaire_lieu_naissance}
Profession : {proprietaire_profession}
CNI : {proprietaire_cni}

Ci-après dénommé "Le Mandant"

**Le Mandataire (Agence) :**
Nom : {agence}
Adresse : {agence_adresse}
Téléphone : {agence_telephone}
Email : {agence_email}

Ci-après dénommé "Le Mandataire"

## ARTICLE 1 - OBJET DU MANDAT

Le Mandant confie au Mandataire, qui accepte, la gestion locative de son/ses bien(s) immobilier(s) selon les termes et conditions définis dans le présent contrat.

Type de gestion : {type_gestion}

## ARTICLE 2 - RÉMUNÉRATION DU MANDATAIRE

En contrepartie des services rendus, le Mandataire percevra une commission de **{commission_pourcentage}%** sur les loyers encaissés.

## ARTICLE 3 - OBLIGATIONS DU MANDATAIRE

Le Mandataire s'engage à :
- Rechercher des locataires solvables
- Rédiger les contrats de location
- Percevoir les loyers et charges
- Effectuer les relances en cas d'impayés
- Assurer le suivi technique des biens
- Reverser au Mandant les sommes perçues, déduction faite de sa commission

## ARTICLE 4 - OBLIGATIONS DU MANDANT

Le Mandant s'engage à :
- Fournir tous les documents nécessaires à la gestion
- Informer le Mandataire de toute modification concernant les biens
- Ne pas interférer dans la gestion confiée au Mandataire
- Régler les charges et travaux incombant au propriétaire

## ARTICLE 5 - DURÉE DU MANDAT

Le présent mandat est conclu pour une durée indéterminée à compter de sa signature. Il pourra être résilié par l'une ou l'autre des parties moyennant un préavis de trois (3) mois notifié par écrit.

## ARTICLE 6 - RÉSILIATION

Le présent contrat pourra être résilié :
- Par accord amiable entre les parties
- Par l'une des parties avec un préavis de 3 mois
- De plein droit en cas de manquement grave de l'une des parties à ses obligations

## ARTICLE 7 - DISPOSITIONS GÉNÉRALES

Le présent contrat est soumis au droit en vigueur. Tout litige sera soumis aux tribunaux compétents.

Fait à {agence_ville}, le {date_jour}

En deux exemplaires originaux.`;

export const MANAGEMENT_CONTRACT_VARIABLES = [
  { variable: "{proprietaire}", description: "Nom du propriétaire" },
  { variable: "{proprietaire_adresse}", description: "Adresse du propriétaire" },
  { variable: "{proprietaire_telephone}", description: "Téléphone du propriétaire" },
  { variable: "{proprietaire_email}", description: "Email du propriétaire" },
  { variable: "{proprietaire_date_naissance}", description: "Date de naissance du propriétaire" },
  { variable: "{proprietaire_lieu_naissance}", description: "Lieu de naissance du propriétaire" },
  { variable: "{proprietaire_profession}", description: "Profession du propriétaire" },
  { variable: "{proprietaire_cni}", description: "Numéro CNI du propriétaire" },
  { variable: "{agence}", description: "Nom de l'agence" },
  { variable: "{agence_adresse}", description: "Adresse de l'agence" },
  { variable: "{agence_telephone}", description: "Téléphone de l'agence" },
  { variable: "{agence_email}", description: "Email de l'agence" },
  { variable: "{agence_ville}", description: "Ville de l'agence" },
  { variable: "{type_gestion}", description: "Type de gestion (ex: Gestion simple)" },
  { variable: "{commission_pourcentage}", description: "Pourcentage de commission" },
  { variable: "{date_jour}", description: "Date du jour (signature)" },
];

export function replaceManagementContractVariables(
  content: string,
  data: {
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    ownerAddress?: string;
    ownerBirthDate?: string;
    ownerBirthPlace?: string;
    ownerProfession?: string;
    ownerCniNumber?: string;
    agencyName?: string;
    agencyEmail?: string;
    agencyPhone?: string;
    agencyAddress?: string;
    agencyCity?: string;
    managementTypeName?: string;
    commissionPercentage?: number;
  }
): string {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "_______________";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const replacements: Record<string, string> = {
    "{proprietaire}": data.ownerName || "_______________",
    "{proprietaire_adresse}": data.ownerAddress || "_______________",
    "{proprietaire_telephone}": data.ownerPhone || "_______________",
    "{proprietaire_email}": data.ownerEmail || "_______________",
    "{proprietaire_date_naissance}": formatDate(data.ownerBirthDate),
    "{proprietaire_lieu_naissance}": data.ownerBirthPlace || "_______________",
    "{proprietaire_profession}": data.ownerProfession || "_______________",
    "{proprietaire_cni}": data.ownerCniNumber || "_______________",
    "{agence}": data.agencyName || "_______________",
    "{agence_adresse}": data.agencyAddress || "_______________",
    "{agence_telephone}": data.agencyPhone || "_______________",
    "{agence_email}": data.agencyEmail || "_______________",
    "{agence_ville}": data.agencyCity || "_______________",
    "{type_gestion}": data.managementTypeName || "_______________",
    "{commission_pourcentage}": data.commissionPercentage?.toString() || "___",
    "{date_jour}": new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };

  let result = content;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value);
  }
  return result;
}
