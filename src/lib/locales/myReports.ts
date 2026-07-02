import type { NsDict } from './types';

const dict: NsDict = {
  en: {
    title: 'My Tickets',
    eyebrow: '{open} open · {review} in review',
    sort: 'Sort',
    searchPlaceholder: 'Search by job type or ticket #…',
    chipAll: 'All · {n}',
    chipTodo: 'To do',
    chipInProgress: 'In progress',
    chipInReview: 'In review',
    chipDone: 'Done',
    recent: 'Recent',
    emptyState: 'No tickets match this filter yet.',
    untitled: 'Untitled',
    photoCount: '{n} photos',
  },
  es: {
    title: 'Mis tickets',
    eyebrow: '{open} abiertos · {review} en revisión',
    sort: 'Ordenar',
    searchPlaceholder: 'Buscar por tipo de trabajo o ticket…',
    chipAll: 'Todos · {n}',
    chipTodo: 'Por hacer',
    chipInProgress: 'En progreso',
    chipInReview: 'En revisión',
    chipDone: 'Completados',
    recent: 'Recientes',
    emptyState: 'Ningún ticket coincide con este filtro.',
    untitled: 'Sin título',
    photoCount: '{n} fotos',
  },
};

export default dict;
