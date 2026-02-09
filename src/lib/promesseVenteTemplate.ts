import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const DEFAULT_PROMESSE_VENTE_TEMPLATE = `# PROMESSE DE VENTE

## ENTRE LES SOUSSIGNÉS

**LE PROMETTANT :**
{vendeur}, {vendeur_adresse} {vendeur_ville}
Téléphone : {vendeur_telephone}
Email : {vendeur_email}

Ci-après dénommé « LE PROMETTANT »

**ET**

**LE BÉNÉFICIAIRE :**
{acquereur}
Né(e) le : {acquereur_date_naissance} à {acquereur_lieu_naissance}
Profession : {acquereur_profession}
CNI N° : {acquereur_cni}
Téléphone : {acquereur_telephone}
Email : {acquereur_email}
Adresse : {acquereur_adresse}

Ci-après dénommé « LE BÉNÉFICIAIRE »

## IL A ÉTÉ CONVENU CE QUI SUIT :

### ARTICLE 1 : OBJET DE LA PROMESSE

Le Promettant s'engage irrévocablement à vendre au Bénéficiaire, qui accepte, une parcelle de terrain nue située dans le lotissement « {lotissement_nom} » sis à {lotissement_localisation}, désignée sous le numéro de lot {parcelle_numero}, d'une superficie de {parcelle_superficie} mètres carrés ({parcelle_superficie} m²).

### ARTICLE 2 : PRIX ET CONDITIONS FINANCIÈRES

La vente sera consentie moyennant le prix de {prix} ({prix_lettres}).

A titre de dépôt de garantie et en contrepartie de l'immobilisation du bien, le Bénéficiaire verse ce jour au Promettant la somme de {acompte} ({acompte_lettres}).

{modalites_paiement}

Cette somme sera imputée sur le prix de vente lors de la signature de l'acte définitif.

### ARTICLE 3 : DURÉE DE VALIDITÉ

La présente promesse de vente est consentie pour une durée de quatre-vingt-dix (90) jours à compter de ce jour.

Le Bénéficiaire devra lever l'option et signer l'acte de vente définitif avant l'expiration de ce délai, faute de quoi la présente promesse sera caduque de plein droit.

En cas de non-réalisation de la vente du fait du Bénéficiaire, le dépôt de garantie restera acquis au Promettant à titre d'indemnité forfaitaire.

### ARTICLE 4 : CONDITIONS SUSPENSIVES

La présente promesse est consentie sous les conditions suspensives suivantes :

1. Obtention par le Bénéficiaire du financement nécessaire à l'acquisition, le cas échéant
2. Régularité des titres de propriété du Promettant
3. Absence de servitudes ou de charges non déclarées grevant le bien

En cas de non-réalisation d'une condition suspensive, les parties seront libérées de leurs engagements et le dépôt de garantie sera restitué au Bénéficiaire.

### ARTICLE 5 : OBLIGATIONS DU PROMETTANT

Le Promettant s'engage à :
- Maintenir le bien en l'état jusqu'à la signature de l'acte définitif
- Ne consentir aucune autre promesse de vente ou vente sur le même bien
- Fournir tous les documents nécessaires à la réalisation de la vente
- Garantir le Bénéficiaire contre tout trouble de jouissance

### ARTICLE 6 : OBLIGATIONS DU BÉNÉFICIAIRE

Le Bénéficiaire s'engage à :
- Verser le dépôt de garantie à la signature des présentes
- Lever l'option dans le délai imparti
- Se présenter chez le notaire pour la signature de l'acte définitif

### ARTICLE 7 : ÉLECTION DE DOMICILE

Pour l'exécution des présentes, les parties élisent domicile :
- Le Promettant : {vendeur_adresse}
- Le Bénéficiaire : {acquereur_adresse}

### ARTICLE 8 : LITIGES

En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut d'accord, les tribunaux compétents seront saisis.

Fait à {ville}, le {date_jour}

En deux exemplaires originaux, dont un pour chaque partie.
`;

// Variables disponibles pour les promesses de vente
export const PROMESSE_VENTE_VARIABLES = [
  { variable: "{vendeur}", description: "Nom du vendeur/agence" },
  { variable: "{vendeur_adresse}", description: "Adresse du vendeur" },
  { variable: "{vendeur_ville}", description: "Ville du vendeur" },
  { variable: "{vendeur_telephone}", description: "Téléphone du vendeur" },
  { variable: "{vendeur_email}", description: "Email du vendeur" },
  { variable: "{acquereur}", description: "Nom de l'acquéreur" },
  { variable: "{acquereur_adresse}", description: "Adresse de l'acquéreur" },
  { variable: "{acquereur_telephone}", description: "Téléphone de l'acquéreur" },
  { variable: "{acquereur_email}", description: "Email de l'acquéreur" },
  { variable: "{acquereur_cni}", description: "N° CNI de l'acquéreur" },
  { variable: "{acquereur_date_naissance}", description: "Date de naissance" },
  { variable: "{acquereur_lieu_naissance}", description: "Lieu de naissance" },
  { variable: "{acquereur_profession}", description: "Profession de l'acquéreur" },
  { variable: "{lotissement_nom}", description: "Nom du lotissement" },
  { variable: "{lotissement_localisation}", description: "Localisation du lotissement" },
  { variable: "{parcelle_numero}", description: "Numéro de la parcelle" },
  { variable: "{parcelle_superficie}", description: "Superficie en m²" },
  { variable: "{prix}", description: "Prix total (ex: 5 000 000 F CFA)" },
  { variable: "{prix_lettres}", description: "Prix en lettres" },
  { variable: "{acompte}", description: "Montant de l'acompte" },
  { variable: "{acompte_lettres}", description: "Acompte en lettres" },
  { variable: "{solde}", description: "Solde restant dû" },
  { variable: "{modalites_paiement}", description: "Modalités de paiement (auto)" },
  { variable: "{nombre_echeances}", description: "Nombre d'échéances" },
  { variable: "{montant_echeance}", description: "Montant par échéance" },
  { variable: "{ville}", description: "Ville de signature" },
  { variable: "{date_jour}", description: "Date du jour" },
];

// Sample data for preview
export const SAMPLE_PROMESSE_VENTE_DATA = {
  vendeurName: "Agence Immobilière ABC",
  vendeurAddress: "456 Rue de la République",
  vendeurCity: "Abidjan",
  vendeurPhone: "+225 07 00 00 00 00",
  vendeurEmail: "contact@agence-abc.com",
  acquereurName: "Jean Dupont",
  acquereurAddress: "123 Avenue des Palmiers, Abidjan",
  acquereurPhone: "+225 07 12 34 56 78",
  acquereurEmail: "jean.dupont@email.com",
  acquereurCni: "CI123456789",
  acquereurBirthDate: "1985-06-15",
  acquereurBirthPlace: "Abidjan",
  acquereurProfession: "Ingénieur",
  lotissementName: "Résidence Les Palmiers",
  lotissementLocation: "Cocody, Abidjan",
  parcelleNumber: "A-15",
  parcelleArea: 500,
  price: 15000000,
  deposit: 4500000,
  balance: 10500000,
  paymentType: "echelonne" as const,
  totalInstallments: 12,
  monthlyPayment: 875000,
  city: "Abidjan",
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

export function replacePromesseVenteVariables(
  content: string,
  data: typeof SAMPLE_PROMESSE_VENTE_DATA
): string {
  const today = format(new Date(), "d MMMM yyyy", { locale: fr });
  const birthDate = data.acquereurBirthDate
    ? format(new Date(data.acquereurBirthDate), "d MMMM yyyy", { locale: fr })
    : "Non renseigné";

  const balance = data.price - data.deposit;

  let modalites = "";
  if (data.paymentType === "echelonne" && data.totalInstallments && data.monthlyPayment) {
    modalites = `Le solde restant à payer s'élève à ${formatPrice(balance)} (${numberToWords(balance)} francs CFA), payable en ${data.totalInstallments} échéances mensuelles de ${formatPrice(data.monthlyPayment)} (${numberToWords(data.monthlyPayment)} francs CFA) chacune.`;
  } else {
    modalites = `Le solde restant à payer s'élève à ${formatPrice(balance)} (${numberToWords(balance)} francs CFA), payable au comptant lors de la signature de l'acte définitif.`;
  }

  const replacements: Record<string, string> = {
    "{vendeur}": data.vendeurName || "",
    "{vendeur_adresse}": data.vendeurAddress || "",
    "{vendeur_ville}": data.vendeurCity || "",
    "{vendeur_telephone}": data.vendeurPhone || "",
    "{vendeur_email}": data.vendeurEmail || "",
    "{acquereur}": data.acquereurName || "",
    "{acquereur_adresse}": data.acquereurAddress || "",
    "{acquereur_telephone}": data.acquereurPhone || "",
    "{acquereur_email}": data.acquereurEmail || "",
    "{acquereur_cni}": data.acquereurCni || "",
    "{acquereur_date_naissance}": birthDate,
    "{acquereur_lieu_naissance}": data.acquereurBirthPlace || "",
    "{acquereur_profession}": data.acquereurProfession || "",
    "{lotissement_nom}": data.lotissementName || "",
    "{lotissement_localisation}": data.lotissementLocation || "",
    "{parcelle_numero}": data.parcelleNumber || "",
    "{parcelle_superficie}": data.parcelleArea ? data.parcelleArea.toLocaleString("fr-FR") : "",
    "{prix}": formatPrice(data.price || 0),
    "{prix_lettres}": numberToWords(data.price || 0) + " francs CFA",
    "{acompte}": formatPrice(data.deposit || 0),
    "{acompte_lettres}": numberToWords(data.deposit || 0) + " francs CFA",
    "{solde}": formatPrice(balance),
    "{modalites_paiement}": modalites,
    "{nombre_echeances}": data.totalInstallments?.toString() || "",
    "{montant_echeance}": data.monthlyPayment ? formatPrice(data.monthlyPayment) : "",
    "{ville}": data.city || "",
    "{date_jour}": today,
  };

  let result = content;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
}
