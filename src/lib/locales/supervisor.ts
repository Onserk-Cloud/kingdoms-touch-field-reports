import type { NsDict } from './types';

const dict: NsDict = {
  en: {
    eyebrow: 'Supervisor',
    title: 'Field Overview',
    notifications: 'Notifications',
    todayDate: 'Today · {date}',
    onlineCount: '{n} reporting today',
    statToday: 'Today',
    statPending: 'Pending',
    statNeedsUpdate: 'Needs update',
    completedJobs: 'Completed jobs',
    offlineAwaitingSync: 'Offline · awaiting sync',
    teamActivity: 'Team activity · today',
    viewAll: 'View all',
    recentReports: 'Recent reports',
    filter: 'Filter',
    emptyReports:
      "No reports submitted yet. They'll appear here as crews file them.",
    photosCount: '{n} photos',
    open: 'Open →',
  },
  es: {
    eyebrow: 'Supervisor',
    title: 'Resumen de campo',
    notifications: 'Notificaciones',
    todayDate: 'Hoy · {date}',
    onlineCount: '{n} reportando hoy',
    statToday: 'Hoy',
    statPending: 'Pendientes',
    statNeedsUpdate: 'Requiere acción',
    completedJobs: 'Trabajos completados',
    offlineAwaitingSync: 'Sin conexión · por sincronizar',
    teamActivity: 'Actividad del equipo · hoy',
    viewAll: 'Ver todo',
    recentReports: 'Reportes recientes',
    filter: 'Filtrar',
    emptyReports:
      'Aún no hay reportes. Aparecerán aquí cuando las cuadrillas los envíen.',
    photosCount: '{n} fotos',
    open: 'Abrir →',
  },
};

export default dict;
