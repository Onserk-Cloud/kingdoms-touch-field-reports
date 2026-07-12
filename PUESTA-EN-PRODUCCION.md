# Puesta en producción — Kingdoms Touch Services · Field Reports

Guía para pasar de **modo demo** (datos de ejemplo en el teléfono) a **producción real**
con Supabase + Vercel, para que la cuadrilla y el staff la usen de verdad.

> Mientras NO existan las variables `VITE_SUPABASE_*`, la app corre en modo demo
> (IndexedDB sembrado). En cuanto agregues las credenciales de Supabase,
> automáticamente cambia a producción.

**Producción actual:** https://kingdom-touch.vercel.app
(Vercel, proyecto `kingdom-touch`, equipo `kingdomstouchservices`).

---

## Resumen de pasos

1. Crear el proyecto en Supabase
2. Correr las **19 migraciones SQL** en orden
3. Desplegar las **4 Edge Functions**
4. Configurar las **notificaciones push** (VAPID)
5. Conectar la app (`.env.local`)
6. Cambiar los PINs de prueba (¡importante!)
7. Probar en local
8. Desplegar a **Vercel** (`vercel --prod`)
9. Secrets de **GitHub Actions**
10. Sitio viejo de Netlify (shim de redirección)

Tiempo estimado: **45–60 minutos**.

---

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com/dashboard → **New project**.
2. Región: **East US (North Virginia)** (la más cercana a Florida).
3. Guarda la **Database Password** que te pida.
4. Cuando termine de crearse, ve a **Project Settings → API** y copia:
   - **Project URL** → será tu `VITE_SUPABASE_URL`
   - **anon public key** → será tu `VITE_SUPABASE_ANON_KEY`
   - (La `service_role` key NO se usa en la app; solo del lado del servidor —
     la necesitarás una vez en el paso 4.)

---

## 2. Crear las tablas (19 migraciones SQL)

**Opción A — SQL Editor (lo más rápido):**

1. En el dashboard: **SQL Editor → New query**.
2. Ejecuta **en orden** el contenido de cada archivo de `supabase/migrations/`
   (todas son idempotentes, seguras de re-ejecutar):
   `0001_init` → `0002_roles` → `0003_notifications` → `0004_login_throttle` →
   `0005_employee_names` → `0006_report_update_check` → `0007_security_hardening` →
   `0008_cases` → `0009_push` → `0010_case_photos` → `0011_due_reminders` →
   `0012_urgent_time_reminder` → `0013_case_activity` → `0014_profile` →
   `0015_status_and_profile` → `0016_profile_prefs_rpc` → `0017_case_notifications` →
   `0018_comment_notifications` → `0019_photo_and_status_notifications`.
   - Saltarte alguna deja la app sin roles, sin casos, sin push, sin revisión,
     sin notificaciones de comentarios/fotos/aprobación o sin las protecciones de seguridad.
3. Verifica en **Table Editor** que existen `employees`, `reports`,
   `report_photos`, `notifications`, `login_attempts`, `cases`, `case_photos`,
   `case_activity`, `push_subscriptions`; y en **Storage** los buckets privados
   `report-photos` y `case-photos`.
4. **Bucket de avatares (manual):** en **Storage → New bucket** crea `avatars`
   como bucket **público** (lo usa la foto de perfil; ninguna migración lo crea).

**Opción B — Supabase CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <TU-PROJECT-REF>
supabase db push   # aplica las 19 migraciones en orden
```

*(También puedes ejecutarlas vía la Management API de Supabase si automatizas
el aprovisionamiento; el orden es el mismo.)*

---

## 3. Desplegar las 4 Edge Functions

| Función | Qué hace | Verify JWT |
| --- | --- | --- |
| `login-with-pin` | Verifica el PIN (bcrypt) y devuelve la sesión | **OFF** (es la puerta de entrada a los tokens) |
| `admin-users` | Gestión de equipo: crear miembros, resetear PIN/contraseña, desbloquear | **ON** (además valida rol admin/super_admin) |
| `send-push` | Envía el Web Push; la llama un trigger de la BD (pg_net) con la service key | **OFF** |
| `run-due-check` | Corre el chequeo de vencimientos; la invoca un GitHub Action diario | **OFF** |

**Opción A — CLI:**

```bash
supabase functions deploy login-with-pin --no-verify-jwt
supabase functions deploy admin-users
supabase functions deploy send-push --no-verify-jwt
supabase functions deploy run-due-check --no-verify-jwt
```

*(Agrega `--project-ref <TU-PROJECT-REF>` si no hiciste `supabase link`.)*

**Opción B — Dashboard:** **Edge Functions → Create a function** para cada una,
pega el contenido de `supabase/functions/<nombre>/index.ts` y **Deploy**. Fija
el flag *Verify JWT* según la tabla de arriba.

> En Supabase Cloud, las variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y
> `SUPABASE_ANON_KEY` que las funciones necesitan se configuran **solas**.
> Importante: en **Authentication → Providers**, el proveedor **Email** debe
> estar **habilitado** (login-with-pin firma sesiones por correo).

---

## 4. Notificaciones push (Web Push / VAPID — gratis)

```bash
# a) Generar las llaves VAPID (una sola vez). Guarda las dos.
npx web-push generate-vapid-keys

# b) Secrets de las Edge Functions (la llave privada NUNCA va al cliente)
supabase secrets set \
  VAPID_PUBLIC_KEY="<public key>" \
  VAPID_PRIVATE_KEY="<private key>" \
  VAPID_SUBJECT="mailto:admin@kingdomstouch.app"
```

Luego, en **SQL Editor**, conecta el trigger `kt_push_on_notification` con la
función `send-push` (una sola vez):

```sql
alter database postgres set app.send_push_url =
  'https://<TU-PROJECT-REF>.functions.supabase.co/send-push';
alter database postgres set app.send_push_key =
  '<service_role_key>';   -- Settings → API → service_role (secreto)
```

- La **llave pública** también va al frontend como `VITE_VAPID_PUBLIC_KEY` (paso 5).
- Cada usuario activa el push desde **Notificaciones → "Activar notificaciones"**.
  En **iPhone (iOS 16.4+)** la PWA debe estar **instalada** en la pantalla de
  inicio; Safari en pestaña no entrega push.
- **Recordatorios de vencimiento:** la función SQL `kt_notify_due_cases` +
  la Edge Function `run-due-check` + el workflow `notify-due-cases.yml`
  (diario, ver paso 9) avisan de casos por vencer.

---

## 5. Conectar la app (`.env.local`)

En la raíz del proyecto, crea un archivo llamado **`.env.local`** con:

```env
VITE_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # la anon public key del paso 1
VITE_VAPID_PUBLIC_KEY=B...             # la public key VAPID del paso 4
VITE_DEFAULT_THEME=forest              # opcional (único tema soportado)
```

> En cuanto guardes este archivo y reinicies (`npm run dev`), la app deja el modo
> demo y usa Supabase real.

---

## 6. Cambiar los PINs de prueba (¡SEGURIDAD!)

La migración siembra empleados con PINs públicos. **Hay que cambiarlos antes de
entregar**, o cualquiera que vea el código podría entrar.

**Forma recomendada (sin SQL):** entra en la app como **admin/super_admin** →
**Gestionar equipo**. Para cada empleado sembrado usa **Restablecer PIN** y
escribe el nuevo PIN de 4 dígitos (la Edge Function `admin-users` lo hashea de
forma segura). Aprovecha para **agregar a los empleados reales** de Kingdoms
Touch Services con su nombre, rol y PIN propio.

> Rol: `supervisor`/`admin`/`super_admin` para el personal de gestión (entran
> con correo + contraseña), `employee` para los técnicos de campo (PIN).

**Alternativa por SQL** (si prefieres no usar la UI). Declara primero la
dependencia bcryptjs (no viene instalada) y genera el hash:

```bash
npm i -D bcryptjs
node -e "console.log(require('bcryptjs').hashSync('4827', 10))"   # PIN de ejemplo
```

Luego en **SQL Editor** actualiza la columna `pin_hash`:

```sql
update public.employees
set pin_hash = '<EL-HASH-QUE-TE-DIO>'
where name = 'Sandra Ruiz';   -- repite por cada empleado
```

---

## 7. Probar en local

```bash
npm install
npm run dev
```

Antes de dar por bueno el build, corre las verificaciones del proyecto:

```bash
npm run typecheck                 # TypeScript estricto
npm run lint                      # ESLint
npm test                          # 18 tests (Vitest)
npm run build                     # build de producción
npx tsx scripts/check-i18n.ts     # paridad de textos EN/ES
```

Abre http://localhost:5173 y prueba el flujo completo: como **staff** crea y
asigna un **caso**; como **empleado** ábrelo, **INICIAR TRABAJO** y envía el
reporte (mínimo 2 fotos + GPS); como staff **Iniciar revisión → Aprobar**.
Verifica que llegue la notificación (y el push, si lo activaste).

---

## 8. Desplegar a Vercel

El hosting de producción es **Vercel** (proyecto `kingdom-touch`, equipo
`kingdomstouchservices`). URL: **https://kingdom-touch.vercel.app**.

1. **Vincular el proyecto** (una sola vez por máquina):

   ```bash
   npm i -g vercel
   vercel login
   vercel link      # elegir team kingdomstouchservices → proyecto kingdom-touch
   ```

2. **Variables de entorno** en **Vercel → Project → Settings →
   Environment Variables** (entorno *Production*):

   | Variable | Valor |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | anon public key |
   | `VITE_VAPID_PUBLIC_KEY` | public key VAPID (paso 4) |
   | `VITE_DEFAULT_THEME` | `forest` (opcional) |

3. **Desplegar:**

   ```bash
   vercel --prod
   ```

   > El CI de GitHub (`deploy.yml`) solo **verifica** (typecheck, lint, build,
   > artifact) — **NO despliega**. El deploy a producción siempre es
   > `vercel --prod` desde el repo.

4. **Dominio propio (opcional):** **Vercel → Project → Settings → Domains →
   Add**, escribe el dominio del cliente y sigue las instrucciones DNS que
   muestra Vercel (registro `A` para apex o `CNAME` → `cname.vercel-dns.com`
   para subdominios). El certificado SSL se emite solo. Después agrega el
   dominio nuevo a la lista de orígenes permitidos si aplica.

---

## 9. GitHub Actions (repo `Onserk-Cloud/kingdoms-touch-field-reports`, público)

En **Settings → Secrets and variables → Actions** del repo deben existir:

| Secret | Lo usa | De dónde sale |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `deploy.yml` (build de CI) | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | `deploy.yml` (build de CI) | Supabase anon public key |
| `SUPABASE_ANON_KEY` | `keep-supabase-alive.yml` | Supabase anon public key |

Workflows:

- **`deploy.yml`** — CI en cada push/PR a `main`: typecheck, lint, build y
  artifact `kt-dist`. **No despliega.**
- **`keep-supabase-alive.yml`** — ping diario a Supabase (REST + Auth health)
  para que el proyecto del plan gratis **nunca se pause** por inactividad.
- **`notify-due-cases.yml`** — dispara `run-due-check` a diario (recordatorios
  de casos por vencer). No necesita secrets: la Edge Function usa su propia
  service key.

---

## 10. Sitio viejo de Netlify (shim de redirección)

La app vivía antes en `kingdomstouchservices.netlify.app`. Para que nadie
aterrice en un build viejo, el repo incluye un **shim de redirección**:

- **`netlify.toml`** — hace que el sitio de Netlify publique solo la carpeta
  `netlify-redirect/` (sin build real).
- **`netlify-redirect/`** — un `_redirects` con **301** de todo hacia
  `https://kingdom-touch.vercel.app` (+ un `index.html` de respaldo con
  meta-refresh).

> **No borres estos archivos** mientras el sitio viejo de Netlify siga vivo en
> DNS: son lo que convierte la URL vieja en una redirección permanente.
> La **baja definitiva** es eliminar el sitio desde el **dashboard de Netlify**
> (Site settings → Delete site); solo entonces se puede quitar el shim del repo.

---

## Verificación final (checklist)

- [ ] Login con PIN real funciona (y el de staff con correo + contraseña)
- [ ] El staff crea y asigna un caso; al empleado le llega la notificación/push
- [ ] El empleado inicia el trabajo y envía el reporte (mín. 2 fotos + GPS)
- [ ] El reporte sube (no se queda en "por sincronizar" con internet)
- [ ] El staff lo revisa (Aprobar / Pedir cambios) y exporta el PDF
- [ ] PINs de prueba cambiados / empleados reales cargados
- [ ] App instalable en el teléfono (Agregar a pantalla de inicio)
- [ ] La URL vieja de Netlify redirige a kingdom-touch.vercel.app

---

## Problemas comunes

- **"Invalid PIN" con el PIN correcto** → el `pin_hash` no coincide; vuelve a
  generar el hash (paso 6) y actualízalo, o usa **Restablecer PIN** en la app.
- **Las fotos no suben** → revisa que los buckets `report-photos` y
  `case-photos` existan y sean privados (y `avatars` público para el perfil).
- **El sitio en producción salió en modo demo** → faltaron las variables
  `VITE_SUPABASE_*` en Vercel; agrégalas (paso 8) y vuelve a correr
  `vercel --prod`.
- **No llega el push** → en iPhone la PWA debe estar **instalada** (iOS 16.4+);
  revisa los logs de la función `send-push` y que `app.send_push_url` /
  `app.send_push_key` estén configurados (paso 4).
