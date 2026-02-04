import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const DEFAULT_SALE_CONTRACT_TEMPLATE = `# CONTRAT DE VENTE IMMOBILIÈRE

## ENTRE LES SOUSSIGNÉS

**LE VENDEUR :**
{vendeur}
Adresse : {vendeur_adresse}
Téléphone : {vendeur_telephone}
Email : {vendeur_email}

Ci-après dénommé "Le Vendeur"

**ET**

**L'ACQUÉREUR :**
{acquereur}
Adresse : {acquereur_adresse}
Téléphone : {acquereur_telephone}
Email : {acquereur_email}
CNI/Passeport : {acquereur_cni}
Né(e) le : {acquereur_date_naissance}
À : {acquereur_lieu_naissance}
Profession : {acquereur_profession}

Ci-après dénommé "L'Acquéreur"

## IL A ÉTÉ CONVENU CE QUI SUIT :

### ARTICLE 1 - OBJET DE LA VENTE

Le Vendeur vend à l'Acquéreur, qui accepte, le bien immobilier suivant :

**Désignation du bien :**
{bien_titre}

**Adresse du bien :**
{bien_adresse}

**Type de bien :** {bien_type}
**Superficie :** {bien_superficie}

**Description :**
{bien_description}

### ARTICLE 2 - PRIX DE VENTE

Le présent bien est vendu au prix de :
**{prix}** ({prix_lettres})

### ARTICLE 3 - MODALITÉS DE PAIEMENT

L'Acquéreur s'engage à payer le prix convenu selon les modalités suivantes :

- Acompte versé à la réservation : {acompte}
- Solde restant dû : {solde}
- Mode de paiement : {mode_paiement}

### ARTICLE 4 - TRANSFERT DE PROPRIÉTÉ

Le transfert de propriété sera effectif dès le paiement intégral du prix de vente et l'accomplissement de toutes les formalités légales.

### ARTICLE 5 - CHARGES ET CONDITIONS

Le Vendeur déclare que le bien est libre de toute hypothèque, servitude ou autre charge, sauf celles mentionnées ci-après :
{charges_speciales}

### ARTICLE 6 - GARANTIES

Le Vendeur garantit l'Acquéreur contre tout trouble de jouissance et contre les vices cachés conformément aux dispositions légales en vigueur.

### ARTICLE 7 - FRAIS

Les frais de notaire, d'enregistrement et de publicité foncière sont à la charge de l'Acquéreur, sauf convention contraire entre les parties.

### ARTICLE 8 - ÉLECTION DE DOMICILE

Pour l'exécution des présentes, les parties élisent domicile :
- Le Vendeur : {vendeur_adresse}
- L'Acquéreur : {acquereur_adresse}

### ARTICLE 9 - LITIGES

En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut d'accord, les tribunaux compétents seront saisis.

Fait à {ville}, le {date_jour}

En deux exemplaires originaux, dont un pour chaque partie.
`;

// Exemple de données pour l'aperçu
export const SAMPLE_SALE_CONTRACT_DATA = {
  vendeurName: "Agence Immobilière ABC",
  vendeurEmail: "contact@agence-abc.com",
  vendeurPhone: "+225 07 00 00 00 00",
  vendeurAddress: "456 Rue de la République, Abidjan",
  acquereurName: "Jean Dupont",
  acquereurEmail: "jean.dupont@email.com",
  acquereurPhone: "+225 07 12 34 56 78",
  acquereurAddress: "123 Avenue des Palmiers, Abidjan",
  acquereurCni: "CI123456789",
  acquereurBirthDate: "1985-06-15",
  acquereurBirthPlace: "Abidjan",
  acquereurProfession: "Ingénieur",
  bienTitle: "Villa 4 pièces - Cocody",
  bienAddress: "Lot 45, Cocody Riviera Golf, Abidjan",
  bienType: "Villa",
  bienArea: 250,
  bienDescription: "Belle villa de 4 pièces avec jardin, piscine et dépendances. Construction récente, finitions de qualité.",
  price: 85000000,
  deposit: 8500000,
  balance: 76500000,
  paymentMethod: "Virement bancaire",
  chargesSpeciales: "Aucune charge particulière",
  city: "Abidjan",
  agency: {
    name: "Agence Immobilière ABC",
    email: "contact@agence-abc.com",
    phone: "+225 07 00 00 00 00",
    address: "456 Rue de la République",
    city: "Abidjan",
    country: "Côte d'Ivoire",
  },
};

// Variables disponibles pour les contrats de vente
export const SALE_CONTRACT_VARIABLES = [
  { variable: "{vendeur}", description: "Nom du vendeur/agence" },
  { variable: "{vendeur_adresse}", description: "Adresse du vendeur" },
  { variable: "{vendeur_telephone}", description: "Téléphone du vendeur" },
  { variable: "{vendeur_email}", description: "Email du vendeur" },
  { variable: "{acquereur}", description: "Nom de l'acquéreur" },
  { variable: "{acquereur_adresse}", description: "Adresse de l'acquéreur" },
  { variable: "{acquereur_telephone}", description: "Téléphone de l'acquéreur" },
  { variable: "{acquereur_email}", description: "Email de l'acquéreur" },
  { variable: "{acquereur_cni}", description: "N° CNI/Passeport de l'acquéreur" },
  { variable: "{acquereur_date_naissance}", description: "Date de naissance de l'acquéreur" },
  { variable: "{acquereur_lieu_naissance}", description: "Lieu de naissance de l'acquéreur" },
  { variable: "{acquereur_profession}", description: "Profession de l'acquéreur" },
  { variable: "{bien_titre}", description: "Titre du bien" },
  { variable: "{bien_adresse}", description: "Adresse du bien" },
  { variable: "{bien_type}", description: "Type de bien" },
  { variable: "{bien_superficie}", description: "Superficie du bien" },
  { variable: "{bien_description}", description: "Description du bien" },
  { variable: "{prix}", description: "Prix de vente (ex: 85 000 000 FCFA)" },
  { variable: "{prix_lettres}", description: "Prix en lettres" },
  { variable: "{acompte}", description: "Montant de l'acompte" },
  { variable: "{solde}", description: "Solde restant dû" },
  { variable: "{mode_paiement}", description: "Mode de paiement" },
  { variable: "{charges_speciales}", description: "Charges et servitudes spéciales" },
  { variable: "{ville}", description: "Ville de signature" },
  { variable: "{date_jour}", description: "Date du jour (signature)" },
];

// Fonction pour convertir un nombre en lettres
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

// Formater le prix
function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

// Remplacer les variables dans le contenu
export function replaceSaleContractVariables(content: string, data: typeof SAMPLE_SALE_CONTRACT_DATA): string {
  const today = format(new Date(), "d MMMM yyyy", { locale: fr });
  const birthDate = data.acquereurBirthDate 
    ? format(new Date(data.acquereurBirthDate), "d MMMM yyyy", { locale: fr }) 
    : "Non renseigné";
  
  const replacements: Record<string, string> = {
    "{vendeur}": data.vendeurName || "",
    "{vendeur_adresse}": data.vendeurAddress || "",
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
    "{bien_titre}": data.bienTitle || "",
    "{bien_adresse}": data.bienAddress || "",
    "{bien_type}": data.bienType || "",
    "{bien_superficie}": data.bienArea ? `${data.bienArea} m²` : "",
    "{bien_description}": data.bienDescription || "",
    "{prix}": formatPrice(data.price || 0),
    "{prix_lettres}": numberToWords(data.price || 0) + " francs CFA",
    "{acompte}": formatPrice(data.deposit || 0),
    "{solde}": formatPrice(data.balance || 0),
    "{mode_paiement}": data.paymentMethod || "",
    "{charges_speciales}": data.chargesSpeciales || "Aucune",
    "{ville}": data.city || data.agency?.city || "",
    "{date_jour}": today,
  };

  let result = content;
  for (const [variable, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
}
