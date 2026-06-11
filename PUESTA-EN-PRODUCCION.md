# Puesta en producción — Kingdoms Touch Services · Field Reports

Guía para pasar de **modo demo** (datos de ejemplo en el teléfono) a **producción real**
con Supabase, para que la cuadrilla y el supervisor la usen de verdad.

> Mientras NO exista `.env.local`, la app corre en modo demo. En cuanto agregues
> las credenciales de Supabase, automáticamente cambia a producción.

---

## Resumen de pasos

1. Crear el proyecto en Supabase
2. Crear las tablas (correr las 6 migraciones SQL en orden)
3. Desplegar las 2 Edge Functions (`login-with-pin` + `admin-users`)
4. Conectar la app (`.env.local`)
5. Cambiar los PINs de prueba (¡importante!)
6. Probar en local
7. Desplegar a Netlify

Tiempo estimado: **20–30 minutos**.

---

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com/dashboard → **New project**.
2. Región: **East US (North Virginia)** (la más cercana a Florida).
3. Guarda la **Database Password** que te pida.
4. Cuando termine de crearse, ve a **Project Settings → API** y copia:
   - **Project URL** → será tu `VITE_SUPABASE_URL`
   - **anon public key** → será tu `VITE_SUPABASE_ANON_KEY`
   - (La `service_role` key NO se usa en la app; solo del lado del servidor.)

---

## 2. Crear las tablas (migración SQL)

**Opción A — SQL Editor (lo más rápido):**

1. En el dashboard: **SQL Editor → New query**.
2. Ejecuta **en orden** el contenido de cada archivo de
   `supabase/migrations/` (cada uno es idempotente, seguro de re-ejecutar):
   `0001_init` → `0002_roles` → `0003_notifications` → `0004_login_throttle` →
   `0005_employee_names` → `0006_report_update_check`.
   - Saltarte alguna deja la app sin roles admin/super_admin, sin flujo de
     revisión, sin notificaciones o sin las protecciones de seguridad.
3. Verifica en **Table Editor** que aparecen las tablas `employees`, `reports`,
   `report_photos`, `notifications`, `login_attempts`, y en **Storage** un
   bucket privado `report-photos`.

**Opción B — Supabase CLI** (si la tienes instalada):

```bash
npm install -g supabase
supabase login
supabase link --project-ref <TU-PROJECT-REF>
supabase db push   # aplica las 6 migraciones en orden
```

---

## 3. Desplegar las 2 Edge Functions

- **`login-with-pin`** — recibe el PIN, lo verifica con bcrypt y devuelve un
  token seguro. *Verify JWT = OFF* (es la puerta de entrada a los tokens).
- **`admin-users`** — gestión de equipo (crear empleados/staff, restablecer
  PIN/contraseña, desbloquear). *Verify JWT = ON* (la función valida además el
  rol admin/super_admin).

**Opción A — CLI:**

```bash
supabase functions deploy login-with-pin --no-verify-jwt
supabase functions deploy admin-users
```

**Opción B — Dashboard:** **Edge Functions → Create a function** para cada una
(nombres `login-with-pin` y `admin-users`), pega el contenido de
`supabase/functions/<nombre>/index.ts` y **Deploy**. Fija el flag *Verify JWT*
de cada una (OFF para login-with-pin, ON para admin-users).

> En Supabase Cloud, las variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y
> `SUPABASE_ANON_KEY` que las funciones necesitan se configuran **solas**.
> Importante: en **Authentication → Providers**, el proveedor **Email** debe
> estar **habilitado** (login-with-pin firma sesiones por correo).

---

## 4. Conectar la app (`.env.local`)

En la raíz del proyecto, crea un archivo llamado **`.env.local`** con:

```env
VITE_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # la anon public key del paso 1
VITE_DEFAULT_THEME=forest
```

> En cuanto guardes este archivo y reinicies (`npm run dev`), la app deja el modo
> demo y usa Supabase real.

---

## 5. Cambiar los PINs de prueba (¡SEGURIDAD!)

La migración siembra 3 empleados con PINs públicos (0000 / 1234 / 5678). **Hay que
cambiarlos antes de entregar**, o cualquiera que vea el código podría entrar.

**Forma recomendada (sin SQL):** entra en la app como **supervisor/admin** →
**Gestionar equipo**. Para cada empleado sembrado usa **Restablecer PIN** y
escribe el nuevo PIN de 4 dígitos (la Edge Function `admin-users` lo hashea de
forma segura). Aprovecha para **agregar a los empleados reales** de Kingdoms
Touch Services con su nombre, rol y PIN propio.

> Rol: `supervisor`/`admin`/`super_admin` para el personal de gestión,
> `employee` para los técnicos de campo.

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

## 6. Probar en local

```bash
npm install
npm run dev
```

Abre http://localhost:5173 e inicia sesión con un PIN real. Crea un reporte con
foto y revisa que aparezca en el panel del supervisor y que el **PDF** exporte bien.

---

## 7. Desplegar a Netlify

**Opción A — Manual (rápido):**

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

**Opción B — Automático (GitHub Actions, recomendado):**

1. Sube el proyecto a un repo de GitHub (`git init`, commit, push).
2. En el repo: **Settings → Secrets and variables → Actions** y agrega:

   | Secret | De dónde sale |
   | --- | --- |
   | `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → New access token |
   | `NETLIFY_SITE_ID` | Netlify → Site settings → Site information → Site ID |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |

3. Cada push a `main` hace build y deploy solo.

> `netlify.toml` ya trae los redirects de SPA, cabeceras de seguridad y los
> permisos de cámara + GPS configurados.

---

## Verificación final (checklist)

- [ ] Login con PIN real funciona
- [ ] Se crea un reporte con foto y GPS
- [ ] El reporte sube (no se queda en "por sincronizar" con internet)
- [ ] El supervisor lo ve, lo abre y exporta el PDF
- [ ] PINs de prueba cambiados / empleados reales cargados
- [ ] App instalable en el teléfono (Agregar a pantalla de inicio)

---

## Problemas comunes

- **"Invalid PIN" con el PIN correcto** → el `pin_hash` no coincide; vuelve a
  generar el hash (paso 5) y actualízalo.
- **Las fotos no suben** → revisa que el bucket `report-photos` exista y sea privado.
- **El sitio en producción salió en modo demo** → faltaron los secrets
  `VITE_SUPABASE_*` en Netlify; agrégalos y vuelve a desplegar.
