import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const DEFAULT_ACTE_ACHAT_TEMPLATE = `# ACTE DE VENTE IMMOBILIÈRE

Établi conformément au Décret du 26 juillet 1932 portant réorganisation de la propriété foncière, à la Loi n° 98-750 du 23 décembre 1998 relative au domaine foncier rural et au Code Civil ivoirien.

Fait à {ville}, le {date_vente}

## ARTICLE 1 - COMPARUTION DES PARTIES

Entre les soussignés :

**LE VENDEUR :**
{vendeur_nom}
{vendeur_profession}
{vendeur_naissance}
{vendeur_cni}
{vendeur_adresse}
{vendeur_telephone}
{vendeur_email}

Ci-après dénommé(e) « LE VENDEUR »

**L'ACQUÉREUR :**
{acquereur_nom}
{acquereur_profession}
{acquereur_naissance}
{acquereur_cni}
{acquereur_adresse}
{acquereur_telephone}
{acquereur_email}

Ci-après dénommé(e) « L'ACQUÉREUR »

## ARTICLE 2 - DÉSIGNATION DU BIEN

Le vendeur déclare être propriétaire du bien immobilier ci-après désigné :

- Nature du bien : {type_bien}
- Désignation : {designation_bien}
- Situation : {adresse_bien}
- Superficie : {superficie_bien}

## ARTICLE 3 - ORIGINE DE PROPRIÉTÉ

Le vendeur déclare être devenu propriétaire du bien sus-désigné par voie d'acquisition régulière, conformément aux lois et règlements en vigueur en République de Côte d'Ivoire.

Il affirme que le bien n'a fait l'objet d'aucune contestation de propriété et qu'il dispose de tous les droits nécessaires pour procéder à la présente vente.

## ARTICLE 4 - PRIX ET MODALITÉS DE PAIEMENT

La présente vente est consentie et acceptée moyennant le prix de :

**{prix_vente}**
({prix_lettres})

{modalites_paiement}

## ARTICLE 5 - CHARGES ET CONDITIONS

La présente vente est consentie aux charges et conditions ordinaires et de droit, et notamment :

1° L'acquéreur prendra le bien dans l'état où il se trouve au jour de l'entrée en jouissance, sans pouvoir prétendre à aucune diminution du prix pour quelque cause que ce soit ;

2° Il acquittera les impôts, contributions et charges de toute nature dont le bien pourrait être grevé, à compter du jour de l'entrée en jouissance ;

3° Il souffrira les servitudes passives, apparentes ou occultes, pouvant grever le bien, sauf à s'en défendre et à profiter de celles actives, le tout à ses risques et périls ;

4° Il fera son affaire personnelle de toutes les autorisations administratives nécessaires.

## ARTICLE 6 - DÉCLARATIONS DU VENDEUR

Le vendeur déclare :
- Être le seul et unique propriétaire du bien objet de la présente vente ;
- Que le bien est libre de toute hypothèque, privilège, nantissement, servitude non apparente ou autre charge réelle ;
- N'avoir consenti aucune promesse de vente ni aucun droit de préemption au profit de tiers ;
- Que le bien n'est l'objet d'aucun litige, contestation ou procédure judiciaire en cours ;
- Être en règle avec toutes les obligations fiscales relatives au bien.

## ARTICLE 7 - TRANSFERT DE PROPRIÉTÉ ET JOUISSANCE

Le transfert de propriété sera effectif à compter de la signature du présent acte et du paiement intégral du prix convenu.

L'acquéreur entrera en jouissance du bien à compter de ce jour par la prise de possession réelle.

Les parties s'engagent à accomplir toutes les formalités nécessaires à la mutation du titre de propriété auprès de la Conservation de la Propriété Foncière, conformément au Décret du 26 juillet 1932.

## ARTICLE 8 - FRAIS ET DROITS

{frais_details}

Les droits d'enregistrement (7%) et la taxe de publicité foncière (1,2%) sont à la charge de l'acquéreur, sauf convention contraire des parties.

## ARTICLE 9 - ÉLECTION DE DOMICILE

Pour l'exécution des présentes et de leurs suites, les parties font élection de domicile en leurs adresses respectives ci-dessus indiquées.

Tout litige relatif à l'interprétation ou à l'exécution du présent acte sera soumis aux tribunaux compétents d'Abidjan, République de Côte d'Ivoire.

{observations}

Fait en double exemplaire à {ville}, le {date_vente}

Chaque partie reconnaissant avoir reçu le sien.
`;

export const DEFAULT_COMPROMIS_ACHAT_TEMPLATE = `# COMPROMIS DE VENTE IMMOBILIÈRE

Établi conformément aux dispositions du Code Civil ivoirien relatives aux promesses de vente et au Décret du 26 juillet 1932 portant réorganisation de la propriété foncière.

Fait à {ville}, le {date_vente}

## ARTICLE 1 - COMPARUTION DES PARTIES

Entre les soussignés :

**LE VENDEUR :**
{vendeur_nom}
{vendeur_profession}
{vendeur_naissance}
{vendeur_cni}
{vendeur_adresse}
{vendeur_telephone}
{vendeur_email}

Ci-après dénommé(e) « LE VENDEUR »

**L'ACQUÉREUR :**
{acquereur_nom}
{acquereur_profession}
{acquereur_naissance}
{acquereur_cni}
{acquereur_adresse}
{acquereur_telephone}
{acquereur_email}

Ci-après dénommé(e) « L'ACQUÉREUR »

## ARTICLE 2 - DÉSIGNATION DU BIEN

Le vendeur déclare être propriétaire du bien immobilier ci-après désigné :

- Nature du bien : {type_bien}
- Désignation : {designation_bien}
- Situation : {adresse_bien}
- Superficie : {superficie_bien}

## ARTICLE 3 - ORIGINE DE PROPRIÉTÉ

Le vendeur déclare être devenu propriétaire du bien sus-désigné par voie d'acquisition régulière, conformément aux lois et règlements en vigueur en République de Côte d'Ivoire.

Il affirme que le bien n'a fait l'objet d'aucune contestation de propriété et qu'il dispose de tous les droits nécessaires pour procéder à la présente vente.

## ARTICLE 4 - PRIX ET MODALITÉS DE PAIEMENT

La présente vente est consentie et acceptée moyennant le prix de :

**{prix_vente}**
({prix_lettres})

{modalites_paiement}

## ARTICLE 5 - CONDITIONS SUSPENSIVES

La présente promesse est conclue sous les conditions suspensives suivantes :

1° L'obtention par l'acquéreur du financement nécessaire à l'acquisition dans un délai de quatre-vingt-dix (90) jours ;

2° La remise par le vendeur de l'ensemble des documents nécessaires au transfert de propriété (titre foncier, certificat de situation juridique, etc.) ;

3° L'absence de toute servitude, hypothèque, saisie ou charge grevant le bien non déclarée dans le présent acte ;

4° En cas de non-réalisation de l'une quelconque de ces conditions dans le délai imparti, la présente promesse sera caduque de plein droit et les sommes versées seront restituées à l'acquéreur.

## ARTICLE 6 - DÉCLARATIONS DU VENDEUR

Le vendeur déclare :
- Être le seul et unique propriétaire du bien objet de la présente vente ;
- Que le bien est libre de toute hypothèque, privilège, nantissement, servitude non apparente ou autre charge réelle ;
- N'avoir consenti aucune promesse de vente ni aucun droit de préemption au profit de tiers ;
- Que le bien n'est l'objet d'aucun litige, contestation ou procédure judiciaire en cours ;
- Être en règle avec toutes les obligations fiscales relatives au bien.

## ARTICLE 7 - RÉALISATION DE LA VENTE

La réalisation de la vente définitive aura lieu dans un délai de quatre-vingt-dix (90) jours à compter de la signature du présent compromis, par-devant notaire.

Les parties s'engagent à fournir toutes les pièces et à accomplir toutes les formalités nécessaires en temps utile.

## ARTICLE 8 - FRAIS ET DROITS

{frais_details}

Les droits d'enregistrement (7%) et la taxe de publicité foncière (1,2%) sont à la charge de l'acquéreur, sauf convention contraire des parties.

## ARTICLE 9 - ÉLECTION DE DOMICILE

Pour l'exécution des présentes et de leurs suites, les parties font élection de domicile en leurs adresses respectives ci-dessus indiquées.

Tout litige relatif à l'interprétation ou à l'exécution du présent acte sera soumis aux tribunaux compétents d'Abidjan, République de Côte d'Ivoire.

{observations}

Fait en double exemplaire à {ville}, le {date_vente}

Chaque partie reconnaissant avoir reçu le sien.
`;

export const ACHAT_CONTRACT_VARIABLES = [
  { variable: "{vendeur_nom}", description: "Nom du vendeur" },
  { variable: "{vendeur_profession}", description: "Profession du vendeur" },
  { variable: "{vendeur_naissance}", description: "Date et lieu de naissance du vendeur" },
  { variable: "{vendeur_cni}", description: "N° CNI du vendeur" },
  { variable: "{vendeur_adresse}", description: "Adresse du vendeur" },
  { variable: "{vendeur_telephone}", description: "Téléphone du vendeur" },
  { variable: "{vendeur_email}", description: "Email du vendeur" },
  { variable: "{acquereur_nom}", description: "Nom de l'acquéreur" },
  { variable: "{acquereur_profession}", description: "Profession de l'acquéreur" },
  { variable: "{acquereur_naissance}", description: "Date et lieu de naissance de l'acquéreur" },
  { variable: "{acquereur_cni}", description: "N° CNI de l'acquéreur" },
  { variable: "{acquereur_adresse}", description: "Adresse de l'acquéreur" },
  { variable: "{acquereur_telephone}", description: "Téléphone de l'acquéreur" },
  { variable: "{acquereur_email}", description: "Email de l'acquéreur" },
  { variable: "{type_bien}", description: "Type de bien (Terrain, Villa, etc.)" },
  { variable: "{designation_bien}", description: "Titre/désignation du bien" },
  { variable: "{adresse_bien}", description: "Adresse complète du bien" },
  { variable: "{superficie_bien}", description: "Superficie du bien" },
  { variable: "{prix_vente}", description: "Prix de vente formaté" },
  { variable: "{prix_lettres}", description: "Prix en lettres" },
  { variable: "{modalites_paiement}", description: "Modalités de paiement (auto)" },
  { variable: "{frais_details}", description: "Détails des frais (notaire, agence)" },
  { variable: "{observations}", description: "Observations particulières" },
  { variable: "{ville}", description: "Ville de signature" },
  { variable: "{date_vente}", description: "Date de la vente" },
];

export const SAMPLE_ACHAT_CONTRACT_DATA = {
  vendeurName: "Kouassi Aimé",
  vendeurProfession: "Commerçant",
  vendeurBirthDate: "1970-03-20",
  vendeurBirthPlace: "Bouaké",
  vendeurCni: "CI987654321",
  vendeurAddress: "Cocody Riviera 3, Abidjan",
  vendeurPhone: "+225 07 00 00 00 00",
  vendeurEmail: "kouassi@email.com",
  acquereurName: "Traoré Fatou",
  acquereurProfession: "Ingénieur",
  acquereurBirthDate: "1985-06-15",
  acquereurBirthPlace: "Abidjan",
  acquereurCni: "CI123456789",
  acquereurAddress: "Marcory Zone 4, Abidjan",
  acquereurPhone: "+225 07 12 34 56 78",
  acquereurEmail: "traore@email.com",
  propertyType: "Villa",
  propertyTitle: "Villa 4 pièces Cocody",
  propertyAddress: "Cocody Angré 8ème Tranche, Abidjan",
  propertyArea: "350 m²",
  salePrice: 45000000,
  paymentType: "echelonne" as const,
  downPayment: 15000000,
  totalInstallments: 12,
  notaryFees: 3150000,
  commissionAmount: 2250000,
  commissionPercentage: 5,
  notes: "",
  city: "Abidjan",
  saleDate: new Date().toISOString(),
};

function numberToWords(num: number): string {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  if (num === 0) return "zéro";
  if (num < 0) return "moins " + numberToWords(-num);

  let words = "";

  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    words += (millions === 1 ? "un million" : numberToWords(millions) + " millions") + " ";
    num %= 1000000;
  }

  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    words += (thousands === 1 ? "mille" : numberToWords(thousands) + " mille") + " ";
    num %= 1000;
  }

  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    words += (hundreds === 1 ? "cent" : units[hundreds] + " cent") + " ";
    num %= 100;
  }

  if (num >= 20) {
    const ten = Math.floor(num / 10);
    if (ten === 7 || ten === 9) {
      words += tens[ten - 1] + "-";
      num = num - (ten - 1) * 10;
    } else {
      words += tens[ten];
      num %= 10;
      if (num === 1 && ten !== 8) words += " et";
      if (num > 0) words += "-";
    }
  }

  if (num >= 10 && num < 20) {
    words += teens[num - 10];
  } else if (num > 0) {
    words += units[num];
  }

  return words.trim();
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " F CFA";
}

export function replaceAchatContractVariables(
  content: string,
  data: typeof SAMPLE_ACHAT_CONTRACT_DATA
): string {
  const saleDate = data.saleDate
    ? format(new Date(data.saleDate), "d MMMM yyyy", { locale: fr })
    : format(new Date(), "d MMMM yyyy", { locale: fr });

  const vendeurBirth = data.vendeurBirthDate
    ? `Né(e) le ${format(new Date(data.vendeurBirthDate), "d MMMM yyyy", { locale: fr })}${data.vendeurBirthPlace ? ` à ${data.vendeurBirthPlace}` : ""}`
    : "";

  const acquereurBirth = data.acquereurBirthDate
    ? `Né(e) le ${format(new Date(data.acquereurBirthDate), "d MMMM yyyy", { locale: fr })}${data.acquereurBirthPlace ? ` à ${data.acquereurBirthPlace}` : ""}`
    : "";

  // Payment modalities
  let modalites = "";
  if (data.paymentType === "comptant") {
    modalites = "Le prix est payable au comptant, et le vendeur reconnaît en avoir reçu le montant intégral ce jour même, dont quittance.";
  } else {
    modalites = "Le prix est payable selon les modalités suivantes :\n";
    if (data.downPayment) {
      modalites += `- Apport initial : ${formatPrice(data.downPayment)}\n`;
    }
    if (data.totalInstallments) {
      const remaining = data.salePrice - (data.downPayment || 0);
      const monthly = Math.round(remaining / data.totalInstallments);
      modalites += `- Solde de ${formatPrice(remaining)} payable en ${data.totalInstallments} échéances de ${formatPrice(monthly)}`;
    }
  }

  // Fees
  let fraisDetails = "Conformément au Décret n° 2013-461 et aux usages en vigueur en Côte d'Ivoire, les frais se répartissent comme suit :\n";
  if (data.notaryFees) {
    fraisDetails += `- Frais de notaire et d'enregistrement : ${formatPrice(data.notaryFees)}\n`;
  }
  if (data.commissionAmount) {
    const pct = data.commissionPercentage ? ` (${data.commissionPercentage}%)` : "";
    fraisDetails += `- Honoraires d'agence${pct} : ${formatPrice(data.commissionAmount)}\n`;
  }

  // Observations
  const observations = data.notes
    ? `## OBSERVATIONS PARTICULIÈRES\n\n${data.notes}`
    : "";

  const replacements: Record<string, string> = {
    "{vendeur_nom}": data.vendeurName || "",
    "{vendeur_profession}": data.vendeurProfession ? `Profession : ${data.vendeurProfession}` : "",
    "{vendeur_naissance}": vendeurBirth,
    "{vendeur_cni}": data.vendeurCni ? `CNI N° : ${data.vendeurCni}` : "",
    "{vendeur_adresse}": data.vendeurAddress ? `Domicilié(e) à : ${data.vendeurAddress}` : "",
    "{vendeur_telephone}": data.vendeurPhone ? `Téléphone : ${data.vendeurPhone}` : "",
    "{vendeur_email}": data.vendeurEmail ? `Email : ${data.vendeurEmail}` : "",
    "{acquereur_nom}": data.acquereurName || "",
    "{acquereur_profession}": data.acquereurProfession ? `Profession : ${data.acquereurProfession}` : "",
    "{acquereur_naissance}": acquereurBirth,
    "{acquereur_cni}": data.acquereurCni ? `CNI N° : ${data.acquereurCni}` : "",
    "{acquereur_adresse}": data.acquereurAddress ? `Domicilié(e) à : ${data.acquereurAddress}` : "",
    "{acquereur_telephone}": data.acquereurPhone ? `Téléphone : ${data.acquereurPhone}` : "",
    "{acquereur_email}": data.acquereurEmail ? `Email : ${data.acquereurEmail}` : "",
    "{type_bien}": data.propertyType || "",
    "{designation_bien}": data.propertyTitle || "",
    "{adresse_bien}": data.propertyAddress || "",
    "{superficie_bien}": data.propertyArea || "Non précisée",
    "{prix_vente}": formatPrice(data.salePrice || 0),
    "{prix_lettres}": numberToWords(data.salePrice || 0) + " francs CFA",
    "{modalites_paiement}": modalites,
    "{frais_details}": fraisDetails,
    "{observations}": observations,
    "{ville}": data.city || "Abidjan",
    "{date_vente}": saleDate,
  };

  let result = content;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
}
