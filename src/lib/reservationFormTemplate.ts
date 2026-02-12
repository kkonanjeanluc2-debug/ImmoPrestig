// Default reservation form template
export const DEFAULT_RESERVATION_FORM_TEMPLATE = `# FICHE DE RÉSERVATION

**Date :** {date}

## IDENTIFICATION DU VENDEUR

**Nom / Raison sociale :** {vendeur}
**Adresse :** {vendeur_adresse}
**Téléphone :** {vendeur_telephone}
**Email :** {vendeur_email}

## IDENTIFICATION DE L'ACQUÉREUR

**Nom et Prénoms :** {acquereur}
**Date et lieu de naissance :** {acquereur_naissance}
**Profession :** {acquereur_profession}
**N° CNI :** {acquereur_cni}
**Adresse :** {acquereur_adresse}
**Téléphone :** {acquereur_telephone}
**Email :** {acquereur_email}

## DÉSIGNATION DU BIEN

**Lotissement :** {lotissement_nom}
**Localisation :** {lotissement_localisation}
**Parcelle N° :** {parcelle_numero}
**Superficie :** {parcelle_superficie}
**Îlot :** {ilot_nom}

## CONDITIONS FINANCIÈRES

**Prix de vente :** {prix_vente}
**Montant de la réservation :** {montant_reservation}
**Mode de paiement :** {mode_paiement}

## DISPOSITIONS

En vertu de l'article 1134 du Code Civil, le montant de la réservation versé ce jour est strictement non remboursable en cas de désistement de l'acquéreur.

La présente réservation est valable pour une durée de {duree_validite} jours à compter de la date de signature, soit jusqu'au {date_expiration}.

**Fait à** {ville}, le {date}

En deux (2) exemplaires originaux.`;

// Available variables for the template
export const RESERVATION_FORM_VARIABLES = [
  { variable: "{date}", description: "Date de la réservation" },
  { variable: "{vendeur}", description: "Nom du vendeur / agence" },
  { variable: "{vendeur_adresse}", description: "Adresse du vendeur" },
  { variable: "{vendeur_telephone}", description: "Téléphone du vendeur" },
  { variable: "{vendeur_email}", description: "Email du vendeur" },
  { variable: "{acquereur}", description: "Nom de l'acquéreur" },
  { variable: "{acquereur_naissance}", description: "Date et lieu de naissance" },
  { variable: "{acquereur_profession}", description: "Profession de l'acquéreur" },
  { variable: "{acquereur_cni}", description: "N° CNI de l'acquéreur" },
  { variable: "{acquereur_adresse}", description: "Adresse de l'acquéreur" },
  { variable: "{acquereur_telephone}", description: "Téléphone de l'acquéreur" },
  { variable: "{acquereur_email}", description: "Email de l'acquéreur" },
  { variable: "{lotissement_nom}", description: "Nom du lotissement" },
  { variable: "{lotissement_localisation}", description: "Localisation du lotissement" },
  { variable: "{parcelle_numero}", description: "Numéro de la parcelle" },
  { variable: "{parcelle_superficie}", description: "Superficie de la parcelle" },
  { variable: "{ilot_nom}", description: "Nom de l'îlot" },
  { variable: "{prix_vente}", description: "Prix de vente de la parcelle" },
  { variable: "{montant_reservation}", description: "Montant de la réservation" },
  { variable: "{mode_paiement}", description: "Mode de paiement" },
  { variable: "{duree_validite}", description: "Durée de validité en jours" },
  { variable: "{date_expiration}", description: "Date d'expiration de la réservation" },
  { variable: "{ville}", description: "Ville de signature" },
];

// Sample data for preview
export const SAMPLE_RESERVATION_FORM_DATA: Record<string, string> = {
  "{date}": "15/01/2025",
  "{vendeur}": "ImmoPrestige SARL",
  "{vendeur_adresse}": "Cocody, Boulevard Latrille",
  "{vendeur_telephone}": "+225 07 00 00 00",
  "{vendeur_email}": "contact@immoprestige.ci",
  "{acquereur}": "KOUASSI Aya Marie",
  "{acquereur_naissance}": "12/03/1985 à Abidjan",
  "{acquereur_profession}": "Ingénieure informatique",
  "{acquereur_cni}": "CI-0012345678",
  "{acquereur_adresse}": "Marcory, Rue 12",
  "{acquereur_telephone}": "+225 05 00 00 00",
  "{acquereur_email}": "kouassi.aya@email.com",
  "{lotissement_nom}": "Résidence Les Palmiers",
  "{lotissement_localisation}": "Bingerville, Route d'Alépé",
  "{parcelle_numero}": "A-015",
  "{parcelle_superficie}": "500 m²",
  "{ilot_nom}": "Îlot A",
  "{prix_vente}": "15 000 000 FCFA",
  "{montant_reservation}": "1 500 000 FCFA",
  "{mode_paiement}": "Virement bancaire",
  "{duree_validite}": "30",
  "{date_expiration}": "14/02/2025",
  "{ville}": "Abidjan",
};

export function replaceReservationFormVariables(
  content: string,
  data: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(data)) {
    result = result.split(key).join(value);
  }
  return result;
}
