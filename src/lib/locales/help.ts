import type { NsDict } from './types';

/**
 * In-app user manual. Step lists are single strings with '\n' between steps —
 * the Help screen splits and numbers them.
 */
const dict: NsDict = {
  en: {
    title: 'User Manual',
    eyebrow: 'Help',
    downloadPdf: 'Download PDF manual',
    downloadSub: 'Full guide with all the steps, ready to print or share.',
    install: 'Install the app',
    installSteps:
      'Android (Chrome): tap “Install app” on the sign-in screen and confirm.\niPhone (Safari): tap Share (square with arrow), then “Add to Home Screen”.\nThe app stays on your home screen with the crown icon.',
    loginPin: 'Sign in with your PIN',
    loginPinSteps:
      'The first time, type your first and last name and tap “Continue”.\nEnter your 4-digit PIN (your supervisor or admin gives it to you).\nNext time only your name appears — just type the PIN. Not your phone? Tap “Not you?”.\nAfter 3 wrong attempts the account locks — ask your admin to unlock it.',
    loginStaff: 'Staff sign in',
    loginStaffSteps:
      'On the sign-in screen, tap “Staff sign in”.\nEnter your email and password and tap “Sign in”.',
    create: 'Create and submit a report',
    createSteps:
      'On Home, tap “New Report”.\nType the job type and the customer’s location.\nGPS is captured automatically — allow location access if asked.\nTake photos of the finished work.\nAdd notes, check “Work completed” and tap Submit.\nNo signal? It saves on your phone and sends itself when you’re back online.',
    changes: 'If changes are requested',
    changesSteps:
      'You’ll get a notification (bell) with your supervisor’s reason.\nOpen the report and tap “Edit and resubmit”.\nFix what’s needed and resubmit — until it’s approved.',
    review: 'Review and approve reports',
    reviewSteps:
      'The dashboard shows recent reports and today’s stats.\nTap a report: photos (tap to enlarge), verified GPS, notes.\nApprove: tap “Approve” — the employee gets notified.\nRequest changes: write the reason and send — the employee fixes and resubmits.\nExport any report to PDF with the download button.',
    manage: 'Manage the team',
    manageSteps:
      'Go to Profile › Manage team.\nAdd member: name, role, and access (4-digit PIN or email+password).\nReset: assign a new PIN/password if forgotten (also unlocks).\nUnlock: release an account locked by failed attempts.\nDeactivate: remove access without deleting history.',
    faq: 'Quick answers',
    faqSteps:
      'Forgot your PIN? Your admin resets it from Manage team.\nAccount locked? Your admin unlocks it instantly.\nNo internet? Reports save locally and sync later.\nChange language: Profile › Language.',
    trouble: 'Troubleshooting',
    troubleSteps:
      'GPS not captured? Allow Location for the app in your phone settings, then retry.\nCamera won’t open? Enable the Camera permission — or upload from your gallery.\nReport stuck on “Awaiting sync”? It’s saved — open the app with signal and it sends itself.\n“Couldn’t load” error? Tap Retry and check your signal. Your data isn’t lost.\nUpdates install themselves (on open and every 30 min) — never reinstall. If needed, close and reopen once.\n“Report not found”? It belongs to another account — sign in with your own.',
  },
  es: {
    title: 'Manual de Uso',
    eyebrow: 'Ayuda',
    downloadPdf: 'Descargar manual en PDF',
    downloadSub:
      'La guía completa con todos los pasos, lista para imprimir o compartir.',
    install: 'Instalar la app',
    installSteps:
      'Android (Chrome): toca «Instalar app» en la pantalla de inicio de sesión y confirma.\niPhone (Safari): toca Compartir (cuadro con flecha) y luego «Agregar a pantalla de inicio».\nLa app queda en tu pantalla de inicio con el ícono de la corona.',
    loginPin: 'Entrar con tu PIN',
    loginPinSteps:
      'La primera vez, escribe tu nombre y apellido y toca «Continuar».\nIngresa tu PIN de 4 dígitos (te lo da tu supervisor o admin).\nLa próxima vez solo aparece tu nombre — escribe el PIN. ¿No es tu teléfono? Toca «¿No eres tú?».\nTras 3 intentos fallidos la cuenta se bloquea — pide a tu admin que la desbloquee.',
    loginStaff: 'Acceso del staff',
    loginStaffSteps:
      'En la pantalla de inicio, toca «Entrar como staff».\nIngresa tu correo y contraseña y toca «Entrar».',
    create: 'Crear y enviar un reporte',
    createSteps:
      'En Inicio, toca «Nuevo reporte».\nEscribe el tipo de trabajo y la ubicación del cliente.\nEl GPS se captura solo — permite el acceso a ubicación si te lo pide.\nToma fotos del trabajo terminado.\nAgrega notas, marca «Trabajo completado» y toca Enviar.\n¿Sin señal? Se guarda en tu teléfono y se envía solo al volver la conexión.',
    changes: 'Si te piden cambios',
    changesSteps:
      'Recibirás una notificación (campana) con el motivo de tu supervisor.\nAbre el reporte y toca «Editar y reenviar».\nCorrige lo necesario y reenvía — hasta que quede aprobado.',
    review: 'Revisar y aprobar reportes',
    reviewSteps:
      'El panel muestra los reportes recientes y las estadísticas del día.\nToca un reporte: fotos (toca para ampliar), GPS verificado, notas.\nAprobar: toca «Aprobar» — el empleado recibe la notificación.\nPedir cambios: escribe el motivo y envía — el empleado corrige y reenvía.\nExporta cualquier reporte a PDF con el botón de descarga.',
    manage: 'Gestionar el equipo',
    manageSteps:
      'Ve a Perfil › Gestionar equipo.\nAgregar miembro: nombre, rol y acceso (PIN de 4 dígitos o correo+contraseña).\nReiniciar: asigna PIN/contraseña nuevos si se olvidó (también desbloquea).\nDesbloquear: libera una cuenta bloqueada por intentos fallidos.\nDesactivar: corta el acceso sin borrar el historial.',
    faq: 'Respuestas rápidas',
    faqSteps:
      '¿Olvidaste tu PIN? Tu admin lo reinicia desde Gestionar equipo.\n¿Cuenta bloqueada? Tu admin la desbloquea al instante.\n¿Sin internet? Los reportes se guardan y sincronizan después.\nCambiar idioma: Perfil › Idioma.',
    trouble: 'Solución de problemas',
    troubleSteps:
      '¿No captura el GPS? Permite la Ubicación para la app en los ajustes del teléfono y reintenta.\n¿No abre la cámara? Activa el permiso de Cámara — o sube fotos desde la galería.\n¿Reporte en «Esperando sincronizar»? Está guardado — abre la app con señal y se envía solo.\n¿Error «No se pudo cargar»? Toca Reintentar y revisa tu señal. Tus datos no se pierden.\nLas actualizaciones se instalan solas (al abrir y cada 30 min) — nunca reinstales. Si hace falta, ciérrala y ábrela una vez.\n¿«Reporte no encontrado»? Pertenece a otra cuenta — entra con la tuya.',
  },
};

export default dict;
