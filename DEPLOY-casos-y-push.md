# Despliegue — Casos asignados + Notificaciones push + Landscape

Tres cambios nuevos. El frontend ya está verificado (type-check, build, 18 tests, paridad i18n).
**Orden:** primero la base de datos y la Edge Function, **después** el frontend.

> Proyecto Supabase del cliente: `siphkouwkdbouktpmmpo` · Hosting: Vercel (`kingdom-touch`).

---

## 1. Base de datos (Supabase → SQL Editor) — correr una vez, en orden

1. `supabase/migrations/0008_cases.sql` — tabla `cases` + `case_id` en `reports`/`notifications` + RLS.
2. `supabase/migrations/0009_push.sql` — tabla `push_subscriptions` + `pg_net` + trigger de push.

(Son idempotentes: seguras de re-ejecutar.)

---

## 2. Notificaciones push (gratis — Web Push / VAPID)

```bash
# a) Generar las llaves VAPID (gratis). Guarda las dos.
npx web-push generate-vapid-keys

# b) Secrets de la Edge Function (privada NUNCA va al cliente)
supabase secrets set \
  VAPID_PUBLIC_KEY="<public key>" \
  VAPID_PRIVATE_KEY="<private key>" \
  VAPID_SUBJECT="mailto:admin@kingdomstouch.app" \
  --project-ref siphkouwkdbouktpmmpo

# c) Desplegar la función
supabase functions deploy send-push --no-verify-jwt --project-ref siphkouwkdbouktpmmpo
```

Luego, en **Supabase → SQL Editor**, conecta el trigger con la función (una vez):

```sql
alter database postgres set app.send_push_url =
  'https://siphkouwkdbouktpmmpo.functions.supabase.co/send-push';
alter database postgres set app.send_push_key =
  '<service_role_key>';   -- Settings → API → service_role (secreto)
```

---

## 3. Frontend (Vercel)

- Añade la variable de entorno **`VITE_VAPID_PUBLIC_KEY`** = `<public key>` en
  **Vercel → Settings → Environment Variables (Production)** y en tu `.env.local`.
- Despliega: `vercel --prod` (o `git push` a `main` si el deploy automático está conectado).

---

## 4. Probar

- **Casos:** entra como staff (supervisor/admin/super) → en el dashboard, botón **"Gestionar casos"** → **Nuevo caso** → asigna a un empleado o déjalo en el grupo. El empleado lo ve en su **Inicio ("Tus casos")**, lo abre y toca **Iniciar reporte**.
- **Push:** el empleado entra a **Notificaciones → "Activar notificaciones"** y acepta el permiso.
  - **Android/Chrome:** funciona en pestaña o instalada.
  - **iPhone (iOS 16.4+):** **debe instalar la PWA** ("Agregar a inicio") primero; en pestaña de Safari iOS no entrega push.
  - Prueba: el staff crea/asigna un caso → al empleado le llega el push al celular.
- **Landscape:** rota el teléfono — la app mantiene su forma (columna centrada), ya no muestra el marco de escritorio.

---

## Qué se construyó

**Casos (proceso nuevo):** `0008_cases.sql`, `src/lib/cases.ts`, pantallas `CreateCase`/`ManageCases`/`CaseDetail`, card "Tus casos" en Home, botón "Gestionar casos" en Supervisor, prefill de NuevoReporte desde el caso, rutas `/cases`, `/cases/new`, `/cases/:id`, i18n `cases.*`.

**Push:** `0009_push.sql`, `supabase/functions/send-push/`, `public/push-sw.js` (+ `importScripts` en `vite.config.ts`), `src/lib/push.ts`, toggle en Notificaciones, i18n `push.*`.

**Landscape:** `src/components/PhoneFrame.tsx` (detección por lado corto + columna en landscape), `vite.config.ts` (`orientation: 'any'`).

## Pendientes (follow-ups, no bloquean)

- Auto-vincular `report_id` del caso cuando el empleado **envía** el reporte (hoy: al "Iniciar reporte" el caso pasa a *in_progress*; el staff lo cierra tras revisar el reporte). La columna `cases.report_id` ya existe para esto.
- "Grupo/pool" = todos los empleados activos. Si el cliente quiere **equipos** definidos, se añade una tabla de equipos + filtro en la política RLS de SELECT.
