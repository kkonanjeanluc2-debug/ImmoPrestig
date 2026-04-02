export const DEFAULT_COLOCATION_CONTRACT_TEMPLATE = `# CONTRAT DE COLOCATION

## (Conformément à la Loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat en Côte d'Ivoire)

## ENTRE LES SOUSSIGNÉS

**Le Bailleur :**
Nom : {bailleur}
Adresse : {bailleur_adresse}
Téléphone : {bailleur_telephone}
Email : {bailleur_email}

Ci-après dénommé "Le Bailleur"

**Représenté par l'Agence :**
Nom : {agence}
Adresse : {agence_adresse}
Téléphone : {agence_telephone}
Email : {agence_email}

**Les Colocataires :**
{liste_colocataires}

Ci-après dénommés collectivement "Les Colocataires"

## ARTICLE 1 - OBJET DU CONTRAT

Le Bailleur donne en location aux Colocataires, qui acceptent, le bien immobilier suivant :

Désignation du bien : {bien_titre}
Adresse : {bien_adresse}
Numéro de porte/unité : {numero_porte}

Le logement est destiné à l'usage exclusif d'habitation des Colocataires.

## ARTICLE 2 - DURÉE DU BAIL

Le présent bail est consenti et accepté pour une durée allant du **{date_debut}** au **{date_fin}**.

Le bail est renouvelable par tacite reconduction dans les conditions prévues par la loi.

## ARTICLE 3 - LOYER ET CHARGES

Le loyer mensuel est fixé à la somme de **{loyer} F CFA** ({loyer_lettres}).

Le loyer est payable mensuellement et d'avance au plus tard le 05 de chaque mois.

## ARTICLE 4 - DÉPÔT DE GARANTIE

À la signature du présent contrat, les Colocataires versent solidairement au Bailleur la somme de **{caution} F CFA** à titre de dépôt de garantie.

Ce dépôt sera restitué en fin de bail, déduction faite des sommes dues au titre de réparations locatives ou de loyers impayés.

## ARTICLE 5 - CLAUSE DE SOLIDARITÉ

**Les Colocataires sont tenus solidairement et indivisiblement au paiement de l'intégralité du loyer et des charges, ainsi qu'à l'exécution de toutes les obligations découlant du présent contrat.**

Chaque colocataire est responsable de la totalité du loyer en cas de défaillance d'un ou plusieurs autres colocataires.

La solidarité s'applique pendant toute la durée d'occupation effective du logement par chaque colocataire, et se prolonge pendant six (6) mois après son départ, sauf remplacement accepté par le Bailleur.

## ARTICLE 6 - COLOCATAIRE PRINCIPAL

Le colocataire principal est : **{colocataire_principal}**

Le colocataire principal est l'interlocuteur privilégié du Bailleur et de l'Agence pour toute communication relative au bail.

## ARTICLE 7 - ENTRÉE ET SORTIE DE COLOCATAIRES

L'arrivée d'un nouveau colocataire ou le départ d'un colocataire existant doit faire l'objet d'un avenant au présent contrat, signé par toutes les parties.

Le colocataire sortant reste solidairement responsable des obligations du bail pendant une durée de six (6) mois suivant son départ effectif, sauf si un nouveau colocataire est accepté par le Bailleur en remplacement.

## ARTICLE 8 - ÉTAT DES LIEUX

Un état des lieux contradictoire sera établi à l'entrée et à la sortie de chaque colocataire, conformément aux dispositions légales en vigueur.

## ARTICLE 9 - OBLIGATIONS DES COLOCATAIRES

Les Colocataires s'engagent solidairement à :
- Payer le loyer et les charges aux termes convenus
- User paisiblement des lieux loués
- Répondre des dégradations et pertes survenant pendant la durée du bail
- Prendre à leur charge l'entretien courant du logement
- Ne pas sous-louer le logement sans l'accord écrit du Bailleur
- Souscrire une assurance habitation couvrant les risques locatifs
- Respecter le règlement de copropriété le cas échéant

## ARTICLE 10 - OBLIGATIONS DU BAILLEUR

Le Bailleur s'engage à :
- Délivrer le logement en bon état d'usage et de réparations
- Assurer la jouissance paisible du logement
- Entretenir les lieux en état de servir à l'usage prévu
- Effectuer les réparations autres que locatives
- Ne pas modifier la forme du logement sans l'accord des Colocataires

## ARTICLE 11 - RÉSILIATION

Le présent contrat pourra être résilié :
- Par accord amiable entre toutes les parties
- Par le Bailleur en cas de manquement grave aux obligations, notamment le non-paiement du loyer après mise en demeure restée infructueuse pendant un (1) mois
- Par les Colocataires avec un préavis de trois (3) mois notifié par écrit

Le départ d'un seul colocataire n'entraîne pas la résiliation du bail pour les autres colocataires.

## ARTICLE 12 - DISPOSITIONS GÉNÉRALES

Le présent contrat est régi par les dispositions du Code de la Construction et de l'Habitat de la République de Côte d'Ivoire (Loi n° 2019-576) et par les dispositions du Code Civil applicables.

Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis aux juridictions compétentes d'Abidjan.

Fait à {agence_ville}, le {date_jour}

En {nombre_exemplaires} exemplaires originaux.`;

export const COLOCATION_CONTRACT_VARIABLES = [
  { variable: "{bailleur}", description: "Nom du propriétaire/bailleur" },
  { variable: "{bailleur_adresse}", description: "Adresse du bailleur" },
  { variable: "{bailleur_telephone}", description: "Téléphone du bailleur" },
  { variable: "{bailleur_email}", description: "Email du bailleur" },
  { variable: "{agence}", description: "Nom de l'agence" },
  { variable: "{agence_adresse}", description: "Adresse de l'agence" },
  { variable: "{agence_telephone}", description: "Téléphone de l'agence" },
  { variable: "{agence_email}", description: "Email de l'agence" },
  { variable: "{agence_ville}", description: "Ville de l'agence" },
  { variable: "{liste_colocataires}", description: "Liste formatée des colocataires" },
  { variable: "{colocataire_principal}", description: "Nom du colocataire principal" },
  { variable: "{bien_titre}", description: "Titre/désignation du bien" },
  { variable: "{bien_adresse}", description: "Adresse du bien" },
  { variable: "{numero_porte}", description: "Numéro de porte/unité" },
  { variable: "{date_debut}", description: "Date de début du bail" },
  { variable: "{date_fin}", description: "Date de fin du bail" },
  { variable: "{loyer}", description: "Montant du loyer" },
  { variable: "{loyer_lettres}", description: "Montant du loyer en lettres" },
  { variable: "{caution}", description: "Montant de la caution" },
  { variable: "{nombre_exemplaires}", description: "Nombre d'exemplaires" },
  { variable: "{date_jour}", description: "Date du jour (signature)" },
];
