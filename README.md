# Kingdoms Touch Services · Field Reports

PWA offline-first para gestión de trabajo de campo de **Kingdoms Touch
Services** (Florida). Vite + React 18 + TypeScript estricto + Supabase.

**Producción:** <https://kingdom-touch.vercel.app>
(Vercel, proyecto `kingdom-touch`, equipo `kingdomstouchservices`).
Repo: `Onserk-Cloud/kingdoms-touch-field-reports` (GitHub, público).

- **Flujo completo de casos**: el staff **crea y asigna casos** (prioridad
  urgent/high/medium/low, fecha y hora límite, tiempo estimado, fotos de
  referencia, recordatorio opcional, asignación a un empleado o al pool) →
  el empleado ve su **"Next up"** en Inicio, abre el caso (hero forest,
  enlace a **MAPS**, botón **START JOB**) → `in_progress` → envía el
  **reporte** (mínimo 2 fotos + GPS + descripción) → el staff **revisa**
  (Start review → Approve, o Request changes con nota) → el empleado corrige
  y reenvía. **Timeline de actividad + comentarios** por caso.
- **4 roles**: `employee` (PIN de 4 dígitos vía Edge Function
  `login-with-pin`, bcrypt + JWT real), `supervisor` / `admin` /
  `super_admin` (correo + contraseña). RLS por rol en toda la base;
  el `super_admin` queda oculto para los admins en Gestión de equipo.
- **Notificaciones push gratis** (Web Push / VAPID, sin Firebase):
  caso asignado, cambios pedidos, recordatorios de vencimiento.
- **Perfil editable** (foto vía bucket público `avatars`, habilidades,
  teléfono, correo, cuadrilla/región, preferencias de notificación,
  sección de seguridad) con **estadísticas reales** (casos asignados /
  hechos / activos + reportes).
- **Offline-first**: cola en IndexedDB con auto-flush al recuperar conexión;
  sin Supabase configurado arranca en **modo demo** sembrado.
- **i18n ES/EN completo** (motor propio, paridad verificada por script).
- Cámara nativa, GPS de alta precisión, compresión de fotos a 1920px,
  PDF export bilingüe (jsPDF) en el panel del supervisor.
- Design system **Forest & Gold** con tipografías **Fraunces** (display) +
  **Manrope** (texto).
- **Hosting: Vercel** (`vercel --prod`). El CI de GitHub Actions solo
  verifica (typecheck + lint + build); **no despliega**.

---

## Estructura

```
kingdom-touch/
├── src/
│   ├── main.tsx, App.tsx             # Bootstrap + rutas (React Router)
│   ├── theme.ts / theme-context.tsx  # Paleta Forest & Gold + useTheme()
│   ├── index.css                     # Reset + utilidades globales
│   ├── components/                   # AppBar, Badge, Button, Card, CaseCard,
│   │                                 # CaseForm, ErrorBoundary, Field, Icons,
│   │                                 # LogoMark, PhoneFrame, PhotoTile,
│   │                                 # Priority, TabBar
│   ├── screens/                      # Splash, PinLogin, Home, NewReport,
│   │                                 # Camera, Review, Success, MyReports,
│   │                                 # Profile, EditProfile, Notifications,
│   │                                 # Help, Supervisor, SupervisorDetail,
│   │                                 # ManageTeam, ManageCases, CreateCase,
│   │                                 # EditCase, CaseDetail, EditReport
│   ├── routes/RequireAuth.tsx        # Guard por rol
│   ├── store/                        # Zustand: session.ts, draft.ts
│   └── lib/                          # supabase, auth, cases, notifications,
│                                     # push, profile, offline-store, uploader,
│                                     # compress, geo, geocode, pdf, format,
│                                     # names, seed-demo, pwa-install, i18n,
│                                     # types + locales/ (EN/ES por pantalla)
├── public/                           # icons/ (PWA), brand/, docs/ (manuales
│                                     # PDF EN/ES), push-sw.js, robots.txt
├── supabase/
│   ├── migrations/                   # 0001_init … 0019_photo_and_status_notifications (19)
│   ├── functions/                    # login-with-pin, admin-users,
│   │                                 # send-push, run-due-check
│   └── config.toml                   # flags verify_jwt por función
├── scripts/check-i18n.ts             # Paridad EN/ES (falla si faltan claves)
├── .github/workflows/                # deploy.yml (CI), keep-supabase-alive.yml,
│                                     # notify-due-cases.yml
├── vercel.json                       # SPA rewrites + headers + cache
├── netlify.toml + netlify-redirect/  # SHIM: 301 del sitio viejo de Netlify
│                                     # hacia Vercel (no borrar aún; ver §8)
├── vite.config.ts                    # vite-plugin-pwa (generateSW + push-sw.js)
└── .env.example
```

---

## Requisitos

- Node.js **18+** (el CI usa 20)
- Cuenta gratuita en [Supabase](https://supabase.com)
- Cuenta gratuita en [Vercel](https://vercel.com) + CLI (`npm i -g vercel`)
  para desplegar
- (Opcional) Supabase CLI para migraciones y Edge Functions desde terminal:
  ```bash
  npm install -g supabase
  ```

---

## 1. Clonar e instalar

```bash
git clone https://github.com/Onserk-Cloud/kingdoms-touch-field-reports.git kingdom-touch
cd kingdom-touch
npm install
```

> **¿Sin Supabase configurado todavía?** La app arranca en **modo demo**:
> datos en IndexedDB, sembrados automáticamente en el primer arranque
> (reportes realistas con fotos placeholder generadas por canvas + casos de
> ejemplo), para que Home, MyReports y el panel del supervisor estén
> poblados desde el primer minuto.
>
> PINs de prueba (solo demo):
>
> | PIN  | Usuario        | Rol        |
> | ---- | -------------- | ---------- |
> | 1234 | Jonathan Reyes | employee   |
> | 5678 | Maria López    | employee   |
> | 4321 | José Rivera    | employee   |
> | 0000 | Sandra Ruiz    | supervisor |
>
> Para resembrar / limpiar la demo: Profile → **Reset Demo Data**.

---

## 2. Crear el proyecto Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
   (región US East para Florida).
2. En **Settings → API** copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → **solo para el servidor**, nunca al cliente.
3. En **Authentication → Providers**, el proveedor **Email** debe estar
   **habilitado** (`login-with-pin` firma sesiones por correo).
4. En **Storage → New bucket** crea el bucket **público** `avatars`
   (la foto de perfil se sirve por URL pública; `report-photos` y
   `case-photos` los crean las migraciones y son privados).

---

## 3. Aplicar las migraciones

> Hay **19 migraciones** en `supabase/migrations/`. Aplícalas **en orden** —
> cada una es idempotente (segura de re-ejecutar). Saltarte alguna deja la
> app sin casos, sin push o sin las protecciones de seguridad.

| #    | Archivo                        | Qué hace                                                                                                     |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 0001 | `init.sql`                     | Esquema inicial: `employees`, `reports`, `report_photos`, RLS, bucket `report-photos`, helpers y seed         |
| 0002 | `roles.sql`                    | Roles `admin`/`super_admin`, columna `review_note`, RLS de staff                                              |
| 0003 | `notifications.sql`            | Tabla `notifications` + trigger de fan-out sobre `reports`                                                    |
| 0004 | `login_throttle.sql`           | Tabla `login_attempts`: anti fuerza bruta del PIN (bloqueo tras 3 fallos, auto-recuperación)                  |
| 0005 | `employee_names.sql`           | Columnas `first_name` / `last_name`                                                                           |
| 0006 | `report_update_check.sql`      | Endurece la política UPDATE de `reports` (`WITH CHECK`; evita la auto-aprobación)                             |
| 0007 | `security_hardening.sql`       | Jerarquía de roles en RLS (un admin no toca filas admin/super_admin) + protección de `pin_hash`               |
| 0008 | `cases.sql`                    | Tabla `cases` + RLS + `case_id` en `reports`/`notifications`                                                  |
| 0009 | `push.sql`                     | Tabla `push_subscriptions` + extensión `pg_net` + trigger que llama a la Edge Function `send-push`            |
| 0010 | `case_photos.sql`              | Tabla `case_photos` + bucket `case-photos` + RLS (fotos de referencia del staff y evidencia del empleado)     |
| 0011 | `due_reminders.sql`            | Función `kt_notify_due_cases()`: recordatorios de vencimiento (≤ 2 días), deduplicados                        |
| 0012 | `urgent_time_reminder.sql`     | Prioridad `urgent`, hora límite (`due_time`) y toggle de recordatorio por caso                                |
| 0013 | `case_activity.sql`            | Timeline de actividad (append-only) + comentarios por caso                                                    |
| 0014 | `profile.sql`                  | Perfil editable (teléfono, email, skills, avatar) + RPC `update_my_profile` (SECURITY DEFINER)                |
| 0015 | `status_and_profile.sql`       | Estados `in_review`/`approved`, `est_time`, `notification_prefs` y `crew`                                     |
| 0016 | `profile_prefs_rpc.sql`        | RPC `update_my_profile` de 7 args (persiste `notification_prefs` + `crew`)                                    |
| 0017 | `case_notifications.sql`       | Notificaciones de casos **server-side** (trigger SECURITY DEFINER en `cases`; arregla el INSERT bloqueado por RLS) + notificación de prueba propia |
| 0018 | `comment_notifications.sql`    | Trigger sobre `case_activity`: al comentar un caso notifica a la **contraparte** (asignado ↔ creador) + agrega `case_id` al payload del push para **deep-link** al caso |
| 0019 | `photo_and_status_notifications.sql` | Añade `photo` a los tipos de actividad; al **agregar una foto** al caso registra evento y notifica a la contraparte, y al **aprobar** un caso notifica al empleado («tu trabajo fue aprobado») |

### Opción A · SQL editor

Pega y ejecuta cada archivo en **SQL Editor → New query**, en orden.

### Opción B · Supabase CLI

```bash
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase db push   # aplica las 19 migraciones en orden
```

> Tras `0001_init.sql` quedan 3 empleados sembrados (Sandra Ruiz `0000`
> supervisor, Jonathan Reyes `1234`, Maria López `5678`). **Estos PINs son
> públicos — rótalos antes de producción**: entra como admin → **Gestionar
> equipo** → **Restablecer PIN** (la Edge Function `admin-users` hashea por
> ti), y agrega ahí a los empleados reales.

---

## 4. Desplegar las Edge Functions

Hay **cuatro** Edge Functions (flags `verify_jwt` ya declarados en
`supabase/config.toml`):

| Función         | Verify JWT | Qué hace                                                                              |
| --------------- | ---------- | ------------------------------------------------------------------------------------- |
| `login-with-pin`| **OFF**    | Compara el PIN con bcrypt contra `pin_hash` y devuelve un JWT real de Supabase Auth   |
| `admin-users`   | **ON**     | Gestión de equipo (crear miembros, restablecer PIN/contraseña, desbloquear); verifica rol del llamante |
| `send-push`     | **OFF**    | Envía el Web Push; la llama el trigger de la BD vía `pg_net` con la service key en el header |
| `run-due-check` | **OFF**    | Ejecuta `kt_notify_due_cases()`; la invoca a diario un GitHub Action                   |

```bash
supabase functions deploy login-with-pin --no-verify-jwt
supabase functions deploy admin-users
supabase functions deploy send-push --no-verify-jwt
supabase functions deploy run-due-check --no-verify-jwt
```

`login-with-pin` **debe** tener *Verify JWT = OFF* (es la puerta de entrada
a los JWT; no puede exigir uno).

---

## 5. Notificaciones push (Web Push / VAPID — gratis)

Arquitectura completa, sin Firebase ni servicios de pago:

1. El empleado activa el push desde la pantalla **Notifications**
   (en iOS requiere la PWA **instalada** en la pantalla de inicio, iOS 16.4+).
2. La suscripción (endpoint + claves `p256dh`/`auth`) se guarda en la tabla
   `push_subscriptions`.
3. Cada INSERT en `notifications` dispara el trigger
   `kt_push_on_notification`, que llama a la Edge Function `send-push` vía
   `pg_net` (asíncrono; los fallos no bloquean).
4. `push-sw.js` (importado por el service worker generado) muestra la
   notificación y maneja el click.
5. **Recordatorios de vencimiento**: la función SQL `kt_notify_due_cases` +
   la Edge Function `run-due-check` + el workflow `notify-due-cases.yml`
   (diario) notifican los casos que vencen en ≤ 2 días.

Genera el par de claves VAPID y configúralas como secrets de las funciones:

```bash
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tu@correo.com
```

La clave pública también va al frontend como `VITE_VAPID_PUBLIC_KEY` (§6).

---

## 6. Variables de entorno

Copia el ejemplo y rellena (local: `.env.local`; producción: **Vercel →
Project → Settings → Environment Variables**):

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_VAPID_PUBLIC_KEY=BF...        # clave pública VAPID (para el push)
VITE_DEFAULT_THEME=forest          # opcional; solo 'forest' está soportado
```

> Sin `VITE_SUPABASE_*` la app corre en **modo demo** (IndexedDB sembrado).
> Sin `VITE_VAPID_PUBLIC_KEY` todo funciona menos activar el push.

---

## 7. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El service worker solo
se registra en el build de producción (`npm run build && npm run preview`).

### Scripts

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build → dist/
npm run preview      # preview del build (con SW activo)
npm run typecheck    # tsc sin emitir
npm run lint         # ESLint (.ts/.tsx)
npm test             # Vitest (18 tests)
npm run format       # Prettier sobre src/
npx tsx scripts/check-i18n.ts   # paridad de claves i18n EN/ES
```

---

## 8. Despliegue a Vercel

```bash
vercel --prod
```

El proyecto ya está enlazado (`.vercel/`) al proyecto **kingdom-touch** del
equipo **kingdomstouchservices**. `vercel.json` define:

- **SPA rewrites**: todo → `/index.html`, **excluyendo `/assets/`** (así un
  chunk borrado devuelve 404 real y no un HTML que rompe el SW).
- **Cache inmutable** para `/assets/*` (`max-age=31536000, immutable`);
  `sw.js` y `manifest.webmanifest` con `must-revalidate`.
- Headers de seguridad (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`) y `Permissions-Policy` para cámara + geolocalización.

> **El CI de GitHub NO despliega.** `.github/workflows/deploy.yml` solo
> corre typecheck + lint + build y sube el artefacto `kt-dist`. El deploy es
> manual con `vercel --prod` (o la integración Git de Vercel si se habilita).

### Shim del sitio viejo de Netlify

La app vivía antes en `kingdomstouchservices.netlify.app`. El repo incluye
`netlify.toml` + `netlify-redirect/` para que ese sitio publique **solo un
301 permanente** hacia `https://kingdom-touch.vercel.app`. **No borres esos
archivos** mientras el sitio de Netlify siga existiendo; los detalles están
en `PUESTA-EN-PRODUCCION.md` (§10).

---

## 9. GitHub Actions

| Workflow                  | Cuándo            | Qué hace                                                                                   |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `deploy.yml`              | push / PR a main  | CI: typecheck, lint (`--max-warnings 2`), build y artefacto `dist/` — **no despliega**       |
| `keep-supabase-alive.yml` | diario 08:17 UTC  | Ping REST + auth health para que el proyecto Supabase free-tier nunca se pause               |
| `notify-due-cases.yml`    | diario ~08:05 ET  | Llama a la Edge Function `run-due-check` (recordatorios de vencimiento → push)               |

Secrets del repo: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (build del
CI) y `SUPABASE_ANON_KEY` (ping). `notify-due-cases` no necesita secrets.

---

## 10. Roles y ciclo de vida de un caso

**Roles**: `employee` (PIN), `supervisor`, `admin`, `super_admin`
(correo + contraseña). El staff crea/asigna/revisa; el empleado ejecuta y
reporta. Los admins no ven ni gestionan al `super_admin`.

**Estados del caso**:

```
available ──(claim/assign)──► assigned ──(START JOB)──► in_progress
    ──(reporte enviado)──► submitted ──(Start review)──► in_review
        ├─(Approve)──► approved ──► closed
        └─(Request changes + nota)──► needs_changes ──(reenvío)──► submitted
```

Cada transición queda en el **timeline de actividad** del caso, junto a los
**comentarios** del staff y del empleado asignado. Un caso lleva dos juegos
de fotos: **referencia** (staff, al crear) y **evidencia** (empleado, en el
reporte — mínimo 2 + GPS + descripción).

---

## 11. Instalar en el móvil (Add to Home Screen)

- **iPhone (iOS 16.4+):** Safari → **Share** → **Add to Home Screen**.
  El push en iOS **solo funciona con la app instalada**.
- **Android:** Chrome muestra el chip de instalación automáticamente.
- **Desktop (Chrome/Edge):** icono "Instalar app" en la barra de direcciones.

---

## 12. Modo offline

1. `npm run build && npm run preview`
2. DevTools → **Network → Offline** → recarga: la app sigue funcionando.
3. Crea un reporte: queda **Pending sync** (IndexedDB).
4. Vuelve a **Online** → sube automáticamente (auto-flush).

El SW lo genera `vite-plugin-pwa` (Workbox `generateSW` + `autoUpdate` +
`importScripts: push-sw.js`): precachea **todos** los chunks para que los
updates sean atómicos, y cachea Google Fonts (SWR) y la REST de Supabase
(NetworkFirst, 5 min).

---

## 13. Tema

La app está **fijada a la paleta oficial Forest & Gold** (no hay selector).
Colores como CSS variables (`--kt-forest`, `--kt-gold`, …) + objeto JS
(`useTheme().colors`). Tipografías: **Fraunces** (display) + **Manrope**
(texto). `VITE_DEFAULT_THEME` solo acepta `forest`; cualquier otro valor cae
a `forest` de forma segura.

---

## 14. Calidad

- **TypeScript estricto** en todo `src/`.
- **18 tests** (Vitest: `format`, `i18n`, `names`) + paridad i18n EN/ES
  (`npx tsx scripts/check-i18n.ts`).
- **ESLint + Prettier** preconfigurados (el CI falla con >2 warnings).
- **Mobile-first**: probado en iPhone SE (375px) y iPhone 15 Pro Max
  (430px); `<PhoneFrame>` solo muestra el chrome de iPhone en desktop.
- **PWA instalable**: manifest válido, iconos 192/512/maskable, shortcuts,
  `display: standalone`, service worker con updates automáticos.

Antes de declarar algo terminado:

```bash
npm run typecheck && npm run lint && npm test && npm run build
npx tsx scripts/check-i18n.ts
```

---

## 15. Troubleshooting

**"Invalid PIN" pero el PIN es correcto**
La Edge Function compara contra `pin_hash`. Tras 3 fallos la identidad se
bloquea unos minutos (throttle anti fuerza bruta) — espera y reintenta, o
restablece el PIN desde Gestión de equipo.

**No llegan las notificaciones push**
Revisa en orden: (1) `VITE_VAPID_PUBLIC_KEY` en el frontend y los secrets
`VAPID_*` en Supabase; (2) las migraciones `0009_push.sql` (+ `0017`/`0018`/`0019`) aplicadas
y `pg_net` habilitado; (3) `send-push` desplegada con *Verify JWT = OFF*;
(4) en iOS, la PWA instalada en Home Screen. La pantalla Notifications tiene
una notificación de prueba.

**Fotos no llegan al storage**
Los buckets `report-photos` y `case-photos` deben existir y ser privados
(los crean las migraciones); `avatars` debe ser público. Las RLS exigen que
la ruta pertenezca al usuario autenticado.

**Service worker no se registra**
Solo en HTTPS o `localhost`, y solo en build de producción: usa
`npm run preview`, no `npm run dev`.

**GPS no se captura**
HTTPS + permiso de ubicación aceptado. En iOS Safari el permiso es por
sesión; instalada la PWA pasa a ser persistente.

---

## Documentación relacionada

- **`PUESTA-EN-PRODUCCION.md`** — guía paso a paso de demo → producción
  (Supabase + VAPID + Vercel + shim de Netlify + checklist go-live).
- **`GUIA-DE-ENTREGA.md`** — guía de entrega para el cliente (qué es la app,
  cómo usarla, credenciales).
- **`DEPLOY-casos-y-push.md`** — notas del despliegue incremental de casos +
  push (histórico).

---

## Licencia

Uso interno de Kingdoms Touch Services. Desarrollado por **Onserk**.
Sin licencia pública.
