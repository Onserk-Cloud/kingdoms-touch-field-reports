import { HAS_SUPABASE, getSupabase } from './supabase';
import { nameMatches } from './names';
import type { Employee, Role } from './types';

const SESSION_KEY = 'kt:session';
const REMEMBER_KEY = 'kt:remember';
const DEVICE_EMP_KEY = 'kt:device-employee';

/** Identity hint persisted on the device so a returning employee only types a PIN. */
export interface DeviceEmployee {
  id: string;
  name: string;
}

/** Lightweight session record persisted client-side. */
export interface KtSession {
  employee: Employee;
  /** Supabase JWT (when configured). */
  token?: string;
  /** Optional refresh token. */
  refreshToken?: string;
  expiresAt?: number;
}

/* ─── Demo data ─────────────────────────────────────────────── */

/**
 * Demo employees used when Supabase is not configured.
 * PIN → employee mapping (PIN never sent to the server in demo mode).
 */
const DEMO_EMPLOYEES: Record<string, Employee> = {
  '1234': {
    id: 'demo-emp-1',
    name: 'Jonathan Reyes',
    role: 'employee',
    active: true,
    initials: 'JR',
    avatar_color: '#7FA66E',
    created_at: '2026-01-01T00:00:00Z',
  },
  '5678': {
    id: 'demo-emp-2',
    name: 'Maria López',
    role: 'employee',
    active: true,
    initials: 'ML',
    avatar_color: '#C9A24D',
    created_at: '2026-01-01T00:00:00Z',
  },
  '0000': {
    id: 'demo-sup-1',
    name: 'Sandra Ruiz',
    role: 'supervisor',
    active: true,
    initials: 'SR',
    avatar_color: '#2A5238',
    created_at: '2026-01-01T00:00:00Z',
  },
  '4321': {
    id: 'demo-emp-3',
    name: 'José Rivera',
    role: 'employee',
    active: true,
    initials: 'JR',
    avatar_color: '#8FA58B',
    created_at: '2026-01-01T00:00:00Z',
  },
};

/** Demo employees keyed by id — used by supervisor views in demo mode. */
export const DEMO_EMPLOYEES_BY_ID: Record<string, Employee> =
  Object.fromEntries(Object.values(DEMO_EMPLOYEES).map((e) => [e.id, e]));

/** Resolve a demo employee by id (e.g. to label a report's author). */
export function getDemoEmployee(id: string): Employee | undefined {
  return DEMO_EMPLOYEES_BY_ID[id];
}

/* ─── Public API ────────────────────────────────────────────── */

export function getSession(): KtSession | null {
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ??
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as KtSession;
    if (s.expiresAt && s.expiresAt < Date.now()) {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  return getSession() !== null;
}

export function getRole(): Role | null {
  return getSession()?.employee.role ?? null;
}

export function getCurrentEmployee(): Employee | null {
  return getSession()?.employee ?? null;
}

export function setRemember(on: boolean) {
  window.localStorage.setItem(REMEMBER_KEY, on ? '1' : '0');
}

export function getRemember(): boolean {
  return window.localStorage.getItem(REMEMBER_KEY) !== '0';
}

/* ─── Device identity (so a returning employee only types a PIN) ── */

export function rememberDeviceEmployee(emp: DeviceEmployee): void {
  try {
    window.localStorage.setItem(
      DEVICE_EMP_KEY,
      JSON.stringify({ id: emp.id, name: emp.name }),
    );
  } catch {
    /* ignore */
  }
}

export function getDeviceEmployee(): DeviceEmployee | null {
  try {
    const raw = window.localStorage.getItem(DEVICE_EMP_KEY);
    return raw ? (JSON.parse(raw) as DeviceEmployee) : null;
  } catch {
    return null;
  }
}

export function forgetDeviceEmployee(): void {
  try {
    window.localStorage.removeItem(DEVICE_EMP_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Sign in with a 4-digit PIN. When Supabase is configured, posts to the
 * `login-with-pin` Edge Function which performs the bcrypt check and returns
 * a JWT. In demo mode, validates against an in-memory map.
 */
export async function signInWithPin(
  pin: string,
  ident?: { employeeId?: string; name?: string },
): Promise<KtSession> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be 4 digits');
  }
  if (!ident?.employeeId && !ident?.name) {
    throw new Error('Identify with name or device');
  }

  // ─── Supabase mode ─────────────────────────────────────────
  if (HAS_SUPABASE) {
    const sb = getSupabase();
    const { data, error } = await sb.functions.invoke('login-with-pin', {
      body: { pin, employeeId: ident.employeeId, name: ident.name },
    });

    if (error) {
      // functions.invoke hides the JSON body on non-2xx; read it from context.
      let code: string | undefined;
      let message = error.message || 'Login failed';
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) message = body.error as string;
        if (body?.code) code = body.code as string;
      } catch {
        /* ignore */
      }
      const e = new Error(message) as Error & { code?: string };
      e.code = code;
      throw e;
    }
    if (!data?.employee || !data?.access_token) {
      throw new Error('Invalid response from auth function');
    }

    // Set the session on the supabase client so RLS works.
    await sb.auth.setSession({
      access_token: data.access_token as string,
      refresh_token: data.refresh_token as string,
    });

    const session: KtSession = {
      employee: data.employee as Employee,
      token: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresAt: data.expires_at
        ? new Date(data.expires_at as string).getTime()
        : Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
    };
    persistSession(session);
    if (getRemember()) rememberDeviceEmployee(session.employee);
    return session;
  }

  // ─── Demo mode ─────────────────────────────────────────────
  let employee: Employee | undefined;
  if (ident.employeeId) {
    const e = DEMO_EMPLOYEES_BY_ID[ident.employeeId];
    if (e && DEMO_EMPLOYEES[pin]?.id === e.id) employee = e;
  } else if (ident.name) {
    const candidates = Object.values(DEMO_EMPLOYEES_BY_ID).filter((x) =>
      nameMatches(x.name, ident.name as string),
    );
    const m = candidates.find((x) => DEMO_EMPLOYEES[pin]?.id === x.id);
    if (m) employee = m;
  }
  if (!employee) {
    const e = new Error('Invalid name or PIN') as Error & { code?: string };
    e.code = 'invalid';
    throw e;
  }
  // Simulate latency so UI states are visible.
  await new Promise((r) => setTimeout(r, 350));
  const session: KtSession = {
    employee,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  persistSession(session);
  if (getRemember()) rememberDeviceEmployee(session.employee);
  return session;
}

/** Sign in a staff member (supervisor/admin/super_admin) with email + password. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<KtSession> {
  if (!HAS_SUPABASE) {
    throw new Error('El acceso por correo requiere Supabase configurado.');
  }
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message || 'Login failed');
  }
  const { data: emp, error: empErr } = await sb
    .from('employees')
    .select('id, name, role, active, initials, avatar_color, created_at')
    .eq('auth_user_id', data.user.id)
    .single();
  if (empErr || !emp) {
    await sb.auth.signOut();
    throw new Error('No hay un perfil de empleado vinculado a esta cuenta.');
  }
  const session: KtSession = {
    employee: emp as unknown as Employee,
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at
      ? data.session.expires_at * 1000
      : Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  persistSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  if (HAS_SUPABASE) {
    try {
      // 'local' only — global revoke 403s on PIN-minted sessions and isn't
      // needed (we just want to drop this device's session).
      await getSupabase().auth.signOut({ scope: 'local' });
    } catch {
      /* ignore */
    }
  }
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
}

function persistSession(session: KtSession) {
  const remember = getRemember();
  const blob = JSON.stringify(session);
  // Write to one store and clear the other so the two never diverge.
  if (remember) {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.setItem(SESSION_KEY, blob);
  } else {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.setItem(SESSION_KEY, blob);
  }
}
