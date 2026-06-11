# Kingdoms Touch Services · Field Reports

PWA offline-first para reportes de campo de **Kingdoms Touch Services**
(Florida). Vite + React + TypeScript + Supabase, lista para producción.

- Pantallas premium con la marca oficial (paleta **Forest & Gold**,
  tipografías **Manrope + Cinzel + Cormorant Garamond**, micro-interacciones
  suaves) e **i18n ES/EN** completo.
- **Empleados** entran con **PIN de 4 dígitos** (identidad por nombre +
  dispositivo recordado); **staff** (supervisor/admin/super_admin) entra con
  **correo + contraseña**. bcrypt en Edge Functions de Supabase con JWT real.
- **4 roles** (employee, supervisor, admin, super_admin) con RLS por rol, panel
  de **gestión de equipo** y **flujo de revisión** (aprobar / pedir cambios →
  el empleado edita y reenvía) + **notificaciones in-app**.
- Cámara nativa, GPS de alta precisión, compresión de fotos a 1920px.
- Cola offline en IndexedDB con auto-flush al recuperar conexión.
- PDF export en el panel del supervisor (jsPDF), bilingüe.
- Paleta de marca única **Forest & Gold** (la app está fijada a este tema).
- Despliegue por la integración nativa de Netlify (CI en GitHub Actions corre
  type-check + lint + build).

---

## Estructura

```
kingdom-touch/
├── src/
│   ├── theme.ts                  # Paleta Forest & Gold + tokens tipográficos
│   ├── theme-context.tsx         # Provider + hook useTheme()
│   ├── index.css                 # Reset + utilidades globales
│   ├── main.tsx, App.tsx
│   ├── components/               # Button, Card, Field, PhoneFrame,
│   │                             # Badge, AppBar, TabBar, PhotoTile, Icons
│   ├── screens/                  # Pantallas tipadas (login, reportes,
│   │                             # supervisor, gestión de equipo, perfil…)
│   ├── routes/RequireAuth.tsx    # Guard por rol
│   ├── store/                    # Zustand: session, draft
│   └── lib/                      # supabase, auth, offline-store, uploader,
│                                 # compress, geo, pdf, format, i18n, locales/
├── public/                       # Iconos PWA + branding oficial
├── supabase/
│   ├── migrations/               # 0001_init … 0006_report_update_check (6)
│   └── functions/                # login-with-pin + admin-users (Edge, bcrypt)
├── .github/workflows/deploy.yml  # CI (type-check + lint + build)
├── netlify.toml                  # SPA redirects + headers
├── vite.config.ts                # vite-plugin-pwa configurado
└── .env.example
```

---

## Requisitos

- Node.js **20+**
- Cuenta gratuita en [Supabase](https://supabase.com)
- Cuenta gratuita en [Netlify](https://www.netlify.com) (para deploy)
- (Opcional) Supabase CLI para correr migraciones desde la terminal:
  ```bash
  npm install -g supabase
  ```

---

## 1. Clonar e instalar

```bash
git clone <tu-repo> kingdom-touch
cd kingdom-touch
npm install
```

> **¿Sin Supabase configurado todavía?** La app arranca en **modo demo**:
> usa datos en memoria + IndexedDB. **En el primer arranque siembra
> automáticamente ~15 reportes realistas con fotos placeholder generadas
> por canvas** — para que el dashboard, MyReports y el supervisor estén
> poblados desde el primer minuto.
>
> PINs de prueba:
>
> | PIN  | Usuario          | Rol         |
> | ---- | ---------------- | ----------- |
> | 1234 | Jonathan Reyes   | employee    |
> | 5678 | Maria López      | employee    |
> | 4321 | José Rivera      | employee    |
> | 0000 | Sandra Ruiz      | supervisor  |
>
> Para **resembrar / limpiar la demo**: Profile → **Reset Demo Data**.

---

## 2. Crear el proyecto Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard) → **New
   project**.
2. Elige una región cercana (US East para Florida) y guarda la contraseña
   de la base de datos.
3. En **Settings → API** copia:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → **solo para el servidor**, nunca al cliente.

---

## 3. Aplicar las migrations

> Hay **6 migraciones**. Aplícalas **en orden** — cada una es idempotente
> (segura de re-ejecutar). Saltarte alguna deja la app sin roles, sin el flujo
> de revisión, sin notificaciones o sin las protecciones de seguridad.

### Opción A · SQL editor

1. En el dashboard de Supabase, abre **SQL Editor → New query**.
2. Pega y ejecuta el contenido de cada archivo de `supabase/migrations/`, en
   orden:
   1. `0001_init.sql` — tablas (`employees`, `reports`, `report_photos`), RLS,
      bucket `report-photos`, seed.
   2. `0002_roles.sql` — roles `admin`/`super_admin`, columna `review_note`,
      RLS por staff (incluye la política UPDATE endurecida con `WITH CHECK`).
   3. `0003_notifications.sql` — tabla `notifications` + trigger de fan-out.
   4. `0004_login_throttle.sql` — tabla `login_attempts` (anti fuerza bruta).
   5. `0005_employee_names.sql` — columnas `first_name` / `last_name`.
   6. `0006_report_update_check.sql` — refuerza la política UPDATE de `reports`
      (idempotente; sobre todo útil para proyectos ya provisionados con una
      versión anterior).

### Opción B · Supabase CLI (recomendado a largo plazo)

```bash
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase db push   # aplica las 6 migraciones en orden
```

> Tras correr `0001_init.sql` tendrás 3 empleados sembrados:
>
> | Nombre          | PIN  | Rol         |
> | --------------- | ---- | ----------- |
> | Sandra Ruiz     | 0000 | supervisor  |
> | Jonathan Reyes  | 1234 | employee    |
> | Maria López     | 5678 | employee    |
>
> **Estos PINs son públicos — rótalos antes de producción.** La forma más
> simple (sin tocar SQL) es desde la app: entra como **supervisor/admin** →
> **Gestionar equipo** → **Restablecer PIN** para cada empleado sembrado, y
> agrega ahí a los empleados reales (la Edge Function `admin-users` hashea el
> PIN por ti). Si prefieres SQL, genera el hash declarando bcryptjs primero:
>
> ```bash
> npm i -D bcryptjs
> node -e "console.log(require('bcryptjs').hashSync('NUEVO_PIN', 10))"
> ```
>
> y actualiza la columna `pin_hash` en la tabla `employees`.

---

## 4. Desplegar las Edge Functions

Hay **dos** Edge Functions:

- **`login-with-pin`** — recibe un PIN, lo compara con bcrypt contra
  `pin_hash` y devuelve un JWT real de Supabase Auth ligado al empleado.
- **`admin-users`** — gestión de equipo (crear empleados/staff, restablecer
  PIN/contraseña, desbloquear). Verifica el JWT del llamante y su rol.

```bash
supabase functions deploy login-with-pin --no-verify-jwt   # Verify JWT = OFF
supabase functions deploy admin-users                       # Verify JWT = ON
```

`login-with-pin` **debe** tener *Verify JWT = OFF* (es la puerta de entrada a
los JWT; no puede exigir uno). `admin-users` mantiene *Verify JWT = ON*. Ambos
flags ya están declarados en `supabase/config.toml`.

Asegúrate de tener en **Project → Settings → Functions** estas variables
(auto-inyectadas por Supabase): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY`. Y en **Authentication → Providers**, el proveedor
**Email** debe estar **habilitado** (login-with-pin firma sesiones por correo).

> Si prefieres no usar la CLI, puedes pegar el contenido de cada
> `supabase/functions/<nombre>/index.ts` en el editor de Edge Functions del
> dashboard (recuerda fijar el flag *Verify JWT* de cada una).

---

## 5. Variables de entorno

Copia el ejemplo:

```bash
cp .env.example .env.local
```

Y rellena:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_DEFAULT_THEME=forest
```

---

## 6. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El service worker solo
se registra en producción (`npm run build && npm run preview`).

### Otros scripts

```bash
npm run typecheck   # tsc sin emitir
npm run lint        # ESLint
npm run build       # build producción → dist/
npm run preview     # preview del build (con SW activo)
npm run format      # Prettier
```

---

## 7. Despliegue a Netlify

### Opción A · Manual (rápido)

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Opción B · GitHub Actions (recomendado)

1. Sube el repo a GitHub.
2. En el repositorio: **Settings → Secrets and variables → Actions**, añade:

   | Secret                   | Cómo obtenerlo                                                                       |
   | ------------------------ | ------------------------------------------------------------------------------------ |
   | `NETLIFY_AUTH_TOKEN`     | Netlify → **User settings → Applications → Personal access tokens** → New token       |
   | `NETLIFY_SITE_ID`        | Netlify site → **Site settings → Site information → Site ID**                         |
   | `VITE_SUPABASE_URL`      | Supabase Project URL                                                                 |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key                                                                    |

3. Push a `main`. El workflow `.github/workflows/deploy.yml` corre type-check,
   build y deploy.

> `netlify.toml` ya tiene los **SPA redirects** (`/*` → `/index.html`),
> headers de cache y la `Permissions-Policy` para cámara + geolocalización.

---

## 8. Instalar en el móvil (Add to Home Screen)

- **iPhone (iOS 16.4+):** abre la URL en Safari → botón **Share** → **Add
  to Home Screen**. El icono dorado de KT aparece en la pantalla principal.
- **Android:** Chrome muestra un chip de instalación automáticamente.
- **Desktop (Chrome/Edge):** el icono "Instalar app" aparece en la barra de
  direcciones.

> Para que `localStorage` se mantenga y los push funcionen, la app **debe
> estar instalada** (no abierta como pestaña).

---

## 9. Modo offline

Probar el flujo offline en local:

1. `npm run build && npm run preview`
2. Abre DevTools → **Network → Offline**.
3. Recarga la app: sigue funcionando.
4. Crea un reporte; queda en estado **Pending sync** (IndexedDB).
5. Vuelve a poner Network en **Online** → el reporte sube automáticamente.

El `service worker` está generado por `vite-plugin-pwa` con `autoUpdate`:
cada `npm run build` regenera el precache con los hashes nuevos, así nunca
hay que reregistrar manualmente.

---

## 10. Tema

La app está **fijada a la paleta oficial de marca Forest & Gold** (no hay
selector de tema). Los colores son CSS variables (`--kt-forest`, `--kt-gold`,
etc.) más un objeto JS (`useTheme().colors`) para componentes que necesitan los
valores en línea. `VITE_DEFAULT_THEME` solo acepta `forest`; cualquier otro
valor cae a `forest` de forma segura.

---

## 11. Calidad

- **TypeScript estricto** en todo `src/` (la app cliente).
- **18 tests** (Vitest) + verificación de paridad i18n EN/ES
  (`npx tsx scripts/check-i18n.ts`).
- **ESLint + Prettier** preconfigurados.
- **Mobile-first**: probado en iPhone SE (375px) y iPhone 15 Pro Max
  (430px). El `<PhoneFrame>` solo muestra el chrome de iPhone en desktop;
  en móvil real va full-bleed.
- **Lighthouse PWA ≥ 90**: manifest válido, iconos 192 + 512 + maskable,
  service worker, `theme_color`, `display: standalone`.

---

## 12. Troubleshooting

**"Invalid PIN" pero el PIN es correcto**
La Edge Function compara con la columna `pin_hash`. Vuelve a generar el
hash y actualízalo en la tabla `employees`.

**Fotos no llegan al storage**
Revisa que el bucket `report-photos` existe y es privado. Las RLS exigen
que la ruta `<report_id>/<photo_id>.jpg` empiece por un report que pertenezca
al usuario autenticado.

**Service worker no se registra**
Sólo se registra en HTTPS o `localhost`. Prueba con `npm run preview` (no
con `npm run dev`).

**GPS no se captura**
La PWA debe servirse por HTTPS y el usuario debe aceptar el permiso de
ubicación cuando el navegador lo pregunta. En iOS Safari el permiso es
por sesión; al instalar la PWA pasa a ser persistente.

---

## Licencia

Uso interno de Kingdoms Touch Services. Sin licencia pública.
