# Kingdoms Touch Services · Field Reports — Guía de entrega

**App en vivo:** https://kingdom-touch.vercel.app
**App bilingüe** (Español / English — detecta el idioma y se cambia desde Perfil).

---

## 1. Qué es

PWA (app web instalable) para gestionar el trabajo de campo de punta a punta:

- El **staff** (supervisor/admin) **crea y asigna casos** de trabajo, con prioridad,
  fecha límite y fotos de referencia.
- El **empleado** ve su caso en Inicio, va al sitio y envía el **reporte de trabajo**
  con **fotos + GPS**.
- El staff lo **revisa, aprueba o pide cambios**, con historial de actividad y
  comentarios por caso.
- **Notificaciones push** al celular (caso asignado, cambios pedidos, recordatorios
  de vencimiento).
- **Perfil** editable con foto, datos de contacto y estadísticas reales.

Funciona en celular, se puede **instalar como app** en la pantalla de inicio, es
**bilingüe (ES/EN)** y trabaja aun con conexión intermitente: guarda offline y
sincroniza sola al volver la señal.

---

## 2. Cómo instalar la app (PWA)

Hay un botón **"Instalar app"** en la **pantalla de login** y en **Perfil**.

- **Android / Chrome / Edge:** toca **Instalar app** → confirma. Queda como app en el teléfono.
- **iPhone / iPad (Safari):** Apple no permite un botón directo. Toca **Compartir ⬆️** →
  **"Agregar a inicio"**. (El botón de la app te muestra estas instrucciones.)
- **Computadora (Chrome/Edge):** el botón instala, o usa el ícono de instalar en la barra de
  direcciones.

Una vez instalada, abre como app a pantalla completa, con su ícono de corona.

---

## 3. Roles y quién hace qué

| Rol | Entra con | Puede |
|-----|-----------|-------|
| **Empleado** | Nombre + PIN (4 dígitos) | Ver sus **casos asignados**, iniciar el trabajo, enviar **reportes** (mín. 2 fotos + GPS), comentar el caso, editar su **perfil** y activar las **notificaciones push** |
| **Supervisor** | Correo + contraseña | Todo lo anterior + **crear y asignar casos**, revisar reportes, **aprobar** / **pedir cambios** |
| **Admin** | Correo + contraseña | + Crear/gestionar **empleados y supervisores**, resetear accesos |
| **Super admin** | Correo + contraseña | + Crear/gestionar **admins** y todo lo demás (no aparece en la lista de equipo de los admins) |

---

## 4. Cómo entra cada quién

- **Empleados (PIN):** la **primera vez** escriben su **nombre + apellido + PIN**. El dispositivo
  los recuerda; las siguientes veces solo aparece su nombre y piden el PIN. Si no es su
  dispositivo, "¿No eres tú?" lo limpia.
- **Staff (supervisor/admin/super admin):** en el login tocan **"Entrar como staff"** y usan
  **correo + contraseña**.

> Seguridad (con el Supabase del cliente): tras **3 intentos** de PIN fallidos la identidad se
> **bloquea ~15 minutos** y luego se libera sola; un admin también puede **desbloquearla o
> resetear el PIN** al instante (evita que adivinen PINs). En el **modo demo local** no hay
> bloqueo: los PINs de prueba son públicos y los datos están sembrados, sin información real.

---

## 5. Crear y gestionar el equipo (admin / super admin)

**Perfil → Gestionar equipo:**
1. **Agregar miembro:** nombre, apellido, rol, y método de acceso:
   - **PIN** (empleado de campo) — eliges un PIN de 4 dígitos.
   - **Correo + contraseña** (staff).
2. **Reiniciar** acceso de un miembro: nuevo PIN o nueva contraseña (también lo **desbloquea**).
3. **Desbloquear**: si un empleado se bloqueó por los 3 intentos.
4. **Activar / Desactivar** miembros.

Reglas: el **admin** gestiona empleados y supervisores; el **super admin** además gestiona admins.

---

## 6. Flujo de un caso (de la asignación a la aprobación)

1. **Staff** → **Gestionar casos → Nuevo caso**: tipo de trabajo, instrucciones,
   **prioridad** (urgente / alta / media / baja), **fecha y hora límite**, tiempo estimado,
   **fotos de referencia**, recordatorio opcional, y lo **asigna** a un empleado (o lo deja
   disponible para el grupo).
2. Al **empleado** le llega la **notificación push** + campana 🔔, y el caso aparece como
   **"Siguiente"** en su Inicio.
3. Abre el caso (instrucciones, fotos de referencia, enlace al **mapa** de la ubicación) y toca
   **INICIAR TRABAJO** → el caso pasa a *en progreso*.
4. Al terminar envía el **reporte**: **mínimo 2 fotos**, **GPS** y descripción del trabajo.
5. Al **staff** le llega la notificación → **Iniciar revisión** → **Aprobar** ✅ o
   **Pedir cambios** (con una nota). Si pide cambios, el empleado corrige y **reenvía**
   hasta quedar aprobado.
6. Cada caso guarda su **historial de actividad** y admite **comentarios**; los reportes se
   pueden **exportar a PDF** (bilingüe).

Estados del caso: *disponible → asignado → en progreso → enviado → en revisión →
cambios solicitados / aprobado → cerrado*.

---

## 7. Notificaciones push (gratis, sin apps de terceros)

- Cada quien las activa una vez por dispositivo en **Notificaciones → "Activar notificaciones"**.
- **Android / Chrome / Edge:** funcionan en pestaña o con la app instalada.
- **iPhone / iPad (iOS 16.4 o más):** hay que **instalar la app primero** ("Agregar a inicio");
  Safari en pestaña no entrega push.
- Avisan de: **caso asignado**, **cambios solicitados**, reporte recibido (staff) y
  **recordatorios de vencimiento** (revisión automática diaria de casos por vencer).

---

## 8. Perfil

Cada usuario edita su propio perfil (**Perfil**): **foto** (avatar), teléfono, correo,
habilidades, cuadrilla/región, **preferencias de notificación** y sección de seguridad.
Las **estadísticas son reales**: casos asignados / terminados / activos y reportes enviados.

---

## 9. Idioma

Se detecta automático (ES/EN) y se cambia manual en **Perfil → Idioma**. Todo, incluido el PDF,
está en ambos idiomas.

---

## 10. Despliegue y mantenimiento (para la agencia)

**Repositorio:** GitHub `Onserk-Cloud/kingdoms-touch-field-reports` (público).
**Hosting:** Vercel (proyecto `kingdom-touch`, equipo `kingdomstouchservices`) →
https://kingdom-touch.vercel.app. La URL vieja de Netlify redirige aquí de forma
permanente (ver `PUESTA-EN-PRODUCCION.md`, sección "Sitio viejo de Netlify").
**Deploy:** `vercel --prod` desde la raíz del repo. El CI de GitHub (`deploy.yml`)
solo **verifica** (typecheck, lint, build) — **no despliega**.
**Backend:** Supabase (proyecto `siphkouwkdbouktpmmpo`).

### Variables de entorno
- Local: archivo `.env.local` (no se sube a git):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`
  - `VITE_DEFAULT_THEME=forest` (opcional; único tema soportado)
- Vercel: las mismas en **Project → Settings → Environment Variables** (ya configuradas en Production).

### Comandos
```bash
npm install          # instalar dependencias
npm run dev          # desarrollo local
npm run build        # build de producción
npm test             # tests (Vitest)
npm run typecheck    # TypeScript
npm run lint         # ESLint
npx tsx scripts/check-i18n.ts   # verifica paridad ES/EN de textos
```

### Base de datos (SQL en orden, en Supabase → SQL Editor)
`supabase/migrations/` — **19 migraciones**, todas idempotentes (seguras de re-ejecutar):
1. `0001_init.sql` — tablas base, RLS, storage, seed
2. `0002_roles.sql` — roles admin/super_admin + RLS por staff (UPDATE con `WITH CHECK`)
3. `0003_notifications.sql` — notificaciones + trigger
4. `0004_login_throttle.sql` — anti fuerza bruta
5. `0005_employee_names.sql` — columnas first_name / last_name
6. `0006_report_update_check.sql` — refuerza la política UPDATE de `reports`
7. `0007_security_hardening.sql` — jerarquía real de roles, oculta `pin_hash` del API
8. `0008_cases.sql` — tabla `cases` (casos de trabajo) + RLS
9. `0009_push.sql` — `push_subscriptions` + trigger de push (pg_net → `send-push`)
10. `0010_case_photos.sql` — fotos de caso + bucket `case-photos`
11. `0011_due_reminders.sql` — recordatorios de vencimiento (`kt_notify_due_cases`)
12. `0012_urgent_time_reminder.sql` — prioridad urgente + hora límite + toggle de recordatorio
13. `0013_case_activity.sql` — historial de actividad + comentarios por caso
14. `0014_profile.sql` — perfil editable (RPC self-service)
15. `0015_status_and_profile.sql` — estados `in_review`/`approved` + campos de perfil
16. `0016_profile_prefs_rpc.sql` — preferencias de notificación + cuadrilla vía RPC
17. `0017_case_notifications.sql` — notificaciones de caso del lado del servidor (trigger)
18. `0018_comment_notifications.sql` — al comentar un caso notifica a la contraparte (asignado ↔ creador) + `case_id` en el push para deep-link al caso
19. `0019_photo_and_status_notifications.sql` — al agregar una foto al caso registra evento y notifica a la contraparte; al aprobar un caso notifica al empleado

*(En un proyecto nuevo se corren **todas en orden**; en el del cliente, solo las que
falten — al ser idempotentes no pasa nada por repetir una.)*

### Edge Functions (Supabase)
- `login-with-pin` — login por PIN/identidad (**Verify JWT = OFF**)
- `admin-users` — crear/gestionar miembros + reseteo/desbloqueo (**Verify JWT = ON**)
- `send-push` — envía el Web Push; la llama el trigger de la BD (**Verify JWT = OFF**)
- `run-due-check` — chequeo diario de vencimientos; lo invoca un GitHub Action (**Verify JWT = OFF**)

Redesplegar:
```bash
supabase functions deploy login-with-pin --project-ref siphkouwkdbouktpmmpo --no-verify-jwt
supabase functions deploy admin-users    --project-ref siphkouwkdbouktpmmpo
supabase functions deploy send-push      --project-ref siphkouwkdbouktpmmpo --no-verify-jwt
supabase functions deploy run-due-check  --project-ref siphkouwkdbouktpmmpo --no-verify-jwt
```

### Requisitos de Supabase
- **Authentication → Providers → Email: habilitado** (lo usa el login de staff y, por debajo, el de PIN).
- **Secrets VAPID** (push): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  vía `supabase secrets set` (la pública también va como `VITE_VAPID_PUBLIC_KEY` al frontend).
- **Storage:** buckets privados `report-photos` y `case-photos` (los crean las migraciones)
  y bucket **público `avatars`** para la foto de perfil.

### Automatización (GitHub Actions)
- `deploy.yml` — CI en cada push/PR: typecheck, lint, build (no despliega).
- `keep-supabase-alive.yml` — ping diario para que el Supabase gratuito **no se pause**
  (usa el secret `SUPABASE_ANON_KEY` del repo).
- `notify-due-cases.yml` — dispara a diario el recordatorio push de casos por vencer.

### Crear el PRIMER super admin (arranque)
En **Supabase → Table Editor → `employees`**, pon a un empleado existente con `role = super_admin`
(entra por su PIN). Desde **Gestionar equipo** ya puede crear a los demás con correo.

### Correr en MODO DEMO (sin Supabase)
Sin `.env.local`, la app arranca sola en **modo demo**: siembra ~15 reportes con
fotos y datos de ejemplo en el teléfono (IndexedDB). Útil para mostrarla sin
backend. PINs demo: **1234 / 5678 / 4321** (empleados) y **Sandra Ruiz + 0000**
(supervisor). Para resembrar: **Perfil → Reiniciar datos demo**.
> ⚠️ Si entregas la app **copiando la carpeta** (en vez de `git clone`),
> **elimina `.env.local`** antes de empaquetar — si viaja con la carpeta, la app
> apuntará al Supabase real en vez de arrancar en demo. (Con `git clone` no
> aplica: `.env.local` está en `.gitignore`.)

---

## 11. Solución de problemas

### Para usuarios (resumen — el detalle está en el manual PDF y en la app: Perfil → Manual de uso)
| Problema | Solución |
|---|---|
| No captura el GPS / no abre la cámara | Activar el permiso de Ubicación/Cámara en los ajustes del teléfono y reintentar |
| Reporte en «Esperando sincronizar» | Está guardado en el teléfono; se envía solo al abrir la app con señal |
| «No se pudo cargar. Revisa tu conexión» | Tocar Reintentar; revisar señal/WiFi. Los datos no se pierden |
| ¿Cómo se actualiza la app? | **Sola**: busca versiones al abrir, al volver a primer plano y cada 30 min, y se recarga automáticamente. Nunca hay que reinstalar |
| «Reporte no encontrado» | El reporte es de otra cuenta (RLS) o fue eliminado; entrar con la cuenta correcta |
| Cuenta bloqueada / PIN olvidado | Admin: Perfil → Gestionar equipo → Desbloquear o Reiniciar |
| No llegan las notificaciones push | Activarlas en **Notificaciones**; en iPhone hay que **instalar la app primero** (iOS 16.4+); revisar el permiso de notificaciones del teléfono |

### Para el admin / la agencia
| Problema | Solución |
|---|---|
| «PIN already in use» al crear miembro | Ese PIN ya lo usa otro empleado activo — elegir otro |
| El login con PIN devuelve error 500 | Supabase → Edge Functions → `login-with-pin` → Logs. Verificar que **Authentication → Providers → Email** esté habilitado |
| Empleado nuevo no puede entrar | Verificar el nombre tal como se registró (acentos no importan; acepta nombre parcial) o Reiniciar su PIN |
| Cambios en una Edge Function no aplican | Redesplegar: `supabase functions deploy <nombre> --project-ref siphkouwkdbouktpmmpo` (todas menos `admin-users` llevan `--no-verify-jwt`) |
| El deploy de Vercel falla | Correr `npm run build` local para ver el error; corregir y `vercel --prod` |
| Teléfonos con versión vieja de la app | No debería pasar: la app se auto-actualiza (al abrir, al enfocar y cada 30 min). Si un teléfono quedara pegado: cerrar y reabrir la app una vez |
| ¿Pueden falsear el GPS con una VPN o apps? | Una **VPN no cambia el GPS** (la ubicación viene del satélite/SO, no de la red). Apps de "ubicación falsa" sí existen (sobre todo Android) y **ninguna app web puede detectarlas con certeza**. Mitigación: precisión ±m registrada, dirección legible visible, fotos obligatorias y revisión del supervisor |

---

## 12. Calidad

- **Lighthouse (producción):** Performance ~95 · Accesibilidad 100 · Best Practices 100 · SEO 100
- **Tests:** 18 (lógica de login, formato, paridad de idiomas) — `npm test`
- **Diseño:** sistema propio *Forest & Gold* (tipografías Fraunces + Manrope)
- PWA instalable, offline-first, bilingüe, con notificaciones push.

---

*Entregado por Onserk · 2026*
