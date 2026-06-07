import { HAS_SUPABASE, getSupabase } from './supabase';
import type { Employee, Role } from './types';

const SESSION_KEY = 'kt:session';
const REMEMBER_KEY = 'kt:remember';

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

/**
 * Sign in with a 4-digit PIN. When Supabase is configured, posts to the
 * `login-with-pin` Edge Function which performs the bcrypt check and returns
 * a JWT. In demo mode, validates against an in-memory map.
 */
export async function signInWithPin(pin: string): Promise<KtSession> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be 4 digits');
  }

  // ─── Supabase mode ─────────────────────────────────────────
  if (HAS_SUPABASE) {
    const sb = getSupabase();
    const { data, error } = await sb.functions.invoke('login-with-pin', {
      body: { pin },
    });

    if (error) {
      throw new Error(error.message || 'Login failed');
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
    return session;
  }

  // ─── Demo mode ─────────────────────────────────────────────
  const employee = DEMO_EMPLOYEES[pin];
  if (!employee) {
    throw new Error('Invalid PIN');
  }
  // Simulate latency so UI states are visible.
  await new Promise((r) => setTimeout(r, 350));
  const session: KtSession = {
    employee,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  persistSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  if (HAS_SUPABASE) {
    try {
      await getSupabase().auth.signOut();
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
