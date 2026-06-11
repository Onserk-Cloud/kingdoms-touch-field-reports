import type { NsDict } from './types';

/** Shared strings used across multiple screens. */
const dict: NsDict = {
  en: {
    loading: 'Loading…',
    roleEmployee: 'Employee',
    roleSupervisor: 'Supervisor',
    roleAdmin: 'Admin',
    roleSuperAdmin: 'Super admin',
    online: 'Online',
    offline: 'Offline',
    retry: 'Retry',
    photos: 'Photos',
    loadError: "Couldn't load. Check your connection and retry.",
    back: 'Back',
    close: 'Close',
    photo: 'Photo',
    removePhoto: 'Remove photo',
    backspace: 'Backspace',
  },
  es: {
    loading: 'Cargando…',
    roleEmployee: 'Empleado',
    roleSupervisor: 'Supervisor',
    roleAdmin: 'Admin',
    roleSuperAdmin: 'Súper admin',
    online: 'En línea',
    offline: 'Sin conexión',
    retry: 'Reintentar',
    photos: 'Fotos',
    loadError: 'No se pudo cargar. Revisa tu conexión y reintenta.',
    back: 'Atrás',
    close: 'Cerrar',
    photo: 'Foto',
    removePhoto: 'Quitar foto',
    backspace: 'Retroceso',
  },
};

export default dict;
