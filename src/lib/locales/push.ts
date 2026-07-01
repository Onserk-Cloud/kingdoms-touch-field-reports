import type { NsDict } from './types';

/** Web Push (device) notification opt-in. */
const dict: NsDict = {
  en: {
    enableTitle: 'Phone notifications',
    enableSub: 'Get alerts on this device, even when the app is closed.',
    enable: 'Turn on notifications',
    enabling: 'Turning on…',
    enabled: 'Notifications are on for this device',
    denied: 'Notifications are blocked. Enable them in your browser settings.',
    unsupported: 'This device doesn’t support push notifications.',
    iosHint: 'On iPhone, add the app to your Home Screen first, then turn this on.',
    error: 'Could not enable notifications. Please try again.',
  },
  es: {
    enableTitle: 'Notificaciones en el teléfono',
    enableSub: 'Recibe avisos en este dispositivo, aunque la app esté cerrada.',
    enable: 'Activar notificaciones',
    enabling: 'Activando…',
    enabled: 'Notificaciones activadas en este dispositivo',
    denied:
      'Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.',
    unsupported: 'Este dispositivo no soporta notificaciones push.',
    iosHint:
      'En iPhone, primero agrega la app a la pantalla de inicio y luego actívalas.',
    error: 'No se pudieron activar. Intenta de nuevo.',
  },
};

export default dict;
