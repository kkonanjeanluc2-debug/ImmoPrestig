import { Step } from "react-joyride";

export interface TourDefinition {
  key: string;
  steps: Step[];
}

const baseSteps: Step[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    placement: 'right',
    disableBeacon: true,
    content: 'Commencez ici pour naviguer entre vos modules et retrouver rapidement chaque espace de travail.',
  },
  {
    target: '[data-tour="page-title"]',
    placement: 'bottom',
    disableBeacon: true,
    content: 'Cette zone vous rappelle où vous êtes et ce que vous pouvez faire sur la page.',
  },
  {
    target: '[data-tour="page-content"]',
    placement: 'top',
    disableBeacon: true,
    content: 'C’est ici que vous consultez, filtrez et mettez à jour vos données au quotidien.',
  },
];

const routeTours: Array<{ match: (pathname: string) => boolean; definition: TourDefinition }> = [
  {
    match: (pathname) => pathname === '/properties',
    definition: {
      key: 'properties',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-actions"]',
          placement: 'left',
          disableBeacon: true,
          content: 'Ajoutez, importez ou exportez vos biens depuis ce groupe d’actions.',
        },
        {
          target: '[data-tour="page-search"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Utilisez la recherche pour retrouver rapidement un bien par titre ou adresse.',
        },
        {
          target: '[data-tour="page-filters"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Affinez ensuite par type, statut, propriétaire ou disponibilité pour aller plus vite.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/owners',
    definition: {
      key: 'owners',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-actions"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Cette zone sert à créer, importer, fusionner ou restaurer la gestion de vos propriétaires.',
        },
        {
          target: '[data-tour="page-search"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Recherchez un propriétaire par nom ou e-mail pour accéder plus vite à son dossier.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/payments',
    definition: {
      key: 'payments',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-actions"]',
          placement: 'left',
          disableBeacon: true,
          content: 'Lancez un encaissement ou exportez votre suivi des paiements depuis ici.',
        },
        {
          target: '[data-tour="page-tabs"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Passez d’un onglet à l’autre pour suivre les paiements, les impayés, les commissions et le compte en ligne.',
        },
        {
          target: '[data-tour="page-filters"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Combinez recherche, période et statut pour cibler exactement les échéances à traiter.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/contracts',
    definition: {
      key: 'contracts',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-actions"]',
          placement: 'left',
          disableBeacon: true,
          content: 'Exportez vos contrats ou lancez les actions utiles selon le dossier sélectionné.',
        },
        {
          target: '[data-tour="page-stats"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Ces indicateurs vous donnent un aperçu rapide des contrats actifs, expirés ou à renouveler.',
        },
        {
          target: '[data-tour="page-filters"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Filtrez par recherche, statut, signature ou propriétaire pour suivre chaque bail plus efficacement.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/settings',
    definition: {
      key: 'settings',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-tabs"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Chaque onglet regroupe une famille de réglages : agence, modèles, équipe, sécurité et préférences.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/comptabilite',
    definition: {
      key: 'comptabilite',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-actions"]',
          placement: 'left',
          disableBeacon: true,
          content: 'Ajoutez une dépense ou exportez vos états comptables depuis ces actions principales.',
        },
        {
          target: '[data-tour="page-tabs"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Les onglets vous aident à passer du résumé global au journal, à la trésorerie ou aux reversements.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/lotissements',
    definition: {
      key: 'lotissements',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-actions"]',
          placement: 'left',
          disableBeacon: true,
          content: 'Créez ici un nouveau projet de lotissement pour démarrer votre suivi foncier.',
        },
        {
          target: '[data-tour="page-search"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Recherchez un projet par nom, localisation ou ville pour le retrouver en quelques secondes.',
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === '/rapports',
    definition: {
      key: 'rapports',
      steps: [
        ...baseSteps,
        {
          target: '[data-tour="page-filters"]',
          placement: 'bottom',
          disableBeacon: true,
          content: 'Choisissez la période à analyser pour générer des rapports d’activité utiles et lisibles.',
        },
      ],
    },
  },
];

export function getTourDefinition(pathname: string): TourDefinition {
  const matched = routeTours.find((entry) => entry.match(pathname));
  if (matched) return matched.definition;

  const segment = pathname.split('/').filter(Boolean)[0] || 'general';

  return {
    key: `section-${segment}`,
    steps: baseSteps,
  };
}