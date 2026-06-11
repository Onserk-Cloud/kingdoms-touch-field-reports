# Kingdoms Touch Services · Field Reports — Guía de entrega

**App en vivo:** https://kingdom-touch.vercel.app
**App bilingüe** (Español / English — detecta el idioma y se cambia desde Perfil).

---

## 1. Qué es

PWA (app web instalable) para que el equipo de campo capture **reportes de trabajo** con
**fotos + GPS**, y el supervisor/admin los **revise, apruebe o pida cambios**. Funciona en
celular y se puede **instalar como app** en la pantalla de inicio. Trabaja aun con conexión
intermitente.

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
| **Empleado** | Nombre + PIN (4 dígitos) | Crear reportes (fotos, GPS), ver los suyos, editar y reenviar si le piden cambios |
| **Supervisor** | Correo + contraseña | Todo lo anterior + revisar reportes, **aprobar** / **pedir cambios** |
| **Admin** | Correo + contraseña | + Crear/gestionar **empleados y supervisores**, resetear accesos |
| **Super admin** | Correo + contraseña | + Crear/gestionar **admins** y todo lo demás |

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

## 6. Flujo de un reporte

1. **Empleado** → "Nuevo reporte": tipo de trabajo, ubicación, **GPS**, **fotos**, notas, confirma
   y envía.
2. Le llega **notificación** al supervisor/admin (campana 🔔 con contador).
3. **Supervisor/Admin** abre el reporte → **Aprobar** ✅ o **Pedir cambios** (con un motivo).
4. Si pide cambios, al **empleado** le llega la notificación con el motivo → **Editar y reenviar**
   hasta que quede aprobado.
5. Cualquier reporte se puede **exportar a PDF** (bilingüe).

---

## 7. Idioma

Se detecta automático (ES/EN) y se cambia manual en **Perfil → Idioma**. Todo, incluido el PDF,
está en ambos idiomas.

---

## 8. Despliegue y mantenimiento (para la agencia)

**Repositorio:** GitHub `Onserk-Cloud/kingdoms-touch-field-reports` (público).
**Hosting:** Vercel (proyecto `kingdom-touch`, cuenta `webmasterkingdomstouch`).
Deploy manual: `vercel --prod` · Deploy automático: conectar el repo en
**Vercel → Settings → Git** (cada `git push` a `main` publica solo).
**Backend:** Supabase (proyecto `siphkouwkdbouktpmmpo`).

### Variables de entorno
- Local: archivo `.env.local` (no se sube a git):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
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
`supabase/migrations/`:
1. `0001_init.sql` — tablas, RLS, storage, seed
2. `0002_roles.sql` — roles admin/super_admin + RLS por staff (UPDATE con `WITH CHECK`)
3. `0003_notifications.sql` — notificaciones + trigger
4. `0004_login_throttle.sql` — anti fuerza bruta
5. `0005_employee_names.sql` — columnas first_name / last_name
6. `0006_report_update_check.sql` — refuerza la política UPDATE de `reports`
   (impide que un empleado auto-apruebe su reporte)

*(Las 1–5 ya estaban aplicadas; **corre `0006` una vez** sobre el proyecto del
cliente — es idempotente.)*

### Edge Functions (Supabase)
- `login-with-pin` — login por PIN/identidad (**Verify JWT = OFF**)
- `admin-users` — crear/gestionar miembros + reseteo/desbloqueo (**Verify JWT = ON**)

Redesplegar:
```bash
supabase functions deploy login-with-pin --project-ref siphkouwkdbouktpmmpo --no-verify-jwt
supabase functions deploy admin-users    --project-ref siphkouwkdbouktpmmpo
```

### Requisitos de Supabase
- **Authentication → Providers → Email: habilitado** (lo usa el login de staff y, por debajo, el de PIN).

### Crear el PRIMER super admin (arranque)
En **Supabase → Table Editor → `employees`**, pon a un empleado existente con `role = super_admin`
(entra por su PIN). Desde **Gestionar equipo** ya puede crear a los demás con correo.

### Correr en MODO DEMO (sin Supabase)
Sin `.env.local`, la app arranca sola en **modo demo**: siembra ~17 reportes con
fotos y datos de ejemplo en el teléfono (IndexedDB). Útil para mostrarla sin
backend. PINs demo: **1234 / 5678 / 4321** (empleados) y **Sandra Ruiz + 0000**
(supervisor). Para resembrar: **Perfil → Reiniciar datos demo**.
> ⚠️ Si entregas la app **copiando la carpeta** (en vez de `git clone`),
> **elimina `.env.local`** antes de empaquetar — si viaja con la carpeta, la app
> apuntará al Supabase real en vez de arrancar en demo. (Con `git clone` no
> aplica: `.env.local` está en `.gitignore`.)

---

## 9. Calidad

- **Lighthouse (producción):** Performance ~95 · Accesibilidad 100 · Best Practices 100 · SEO 100
- **Tests:** 18 (lógica de login, formato, paridad de idiomas) — `npm test`
- PWA instalable, offline-capable, bilingüe.

---

*Entregado por Onserk · 2026*
