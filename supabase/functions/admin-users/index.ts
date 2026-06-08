/**
 * Supabase Edge Function: admin-users
 *
 * Lets an admin / super_admin manage team members:
 *   - create, access "pin":   field employee (bcrypt-hashed 4-digit PIN)
 *   - create, access "email": staff (Supabase Auth email + password)
 *   - reset_pin:      set a new 4-digit PIN for an employee (also unlocks)
 *   - reset_password: set a new password for an email/staff account
 *   - unlock:         clear a lockout (after 3 failed PIN tries)
 *
 * Security: the caller's JWT is verified, their employee role is checked, and
 * only a super_admin may create/modify admin / super_admin members.
 *
 * Deploy:  supabase functions deploy admin-users   (keep Verify JWT = ON)
 */

// @ts-expect-error Deno std import
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
// @ts-expect-error Deno deps
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-expect-error Deno deps — bcryptjs is CommonJS; its functions live on the
// default export, so `import * as bcrypt` would make `bcrypt.hash` undefined.
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Combining diacritical marks (U+0300..U+036F), ASCII-safe.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

// Tokens of a name — must match the login-with-pin throttle key exactly.
function tokensOf(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

// Clear any lockout rows for an employee (by id and by name subject).
async function clearLock(
  admin: any,
  employeeId: string,
  name?: string,
): Promise<void> {
  const subjects = [`emp:${employeeId}`];
  if (name) subjects.push(`name:${tokensOf(name).join(' ')}`);
  await admin.from('login_attempts').delete().in('subject', subjects);
}

// Insert an employee row. If the first_name/last_name columns don't exist yet
// (migration 0005 not applied), retry without them so creation still works.
async function insertEmployee(
  admin: any,
  row: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  let r = await admin.from('employees').insert(row);
  if (r.error && /first_name|last_name|column/i.test(r.error.message)) {
    const clone = { ...row };
    delete clone.first_name;
    delete clone.last_name;
    r = await admin.from('employees').insert(clone);
  }
  return r;
}

// True if `pin` already matches some *active* employee (optionally excluding one).
// Prevents two people sharing a PIN, which would log into the wrong account.
async function pinTaken(
  admin: any,
  pin: string,
  exceptId?: string,
): Promise<boolean> {
  const { data } = await admin
    .from('employees')
    .select('id, pin_hash')
    .eq('active', true);
  for (const e of data ?? []) {
    if (exceptId && e.id === exceptId) continue;
    if (e.pin_hash && (await bcrypt.compare(pin, e.pin_hash))) return true;
  }
  return false;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    // Identify the caller from their JWT.
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await caller.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: callerEmp } = await admin
      .from('employees')
      .select('role')
      .eq('auth_user_id', uid)
      .single();
    const callerRole = callerEmp?.role as string | undefined;
    if (callerRole !== 'admin' && callerRole !== 'super_admin') {
      return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json();
    const action = (body?.action as string) ?? 'create';

    // Only a super_admin can touch admin / super_admin rows.
    const requiresSuper = (role?: string) =>
      role === 'admin' || role === 'super_admin';

    /* ── Reset a 4-digit PIN ─────────────────────────────────── */
    if (action === 'reset_pin') {
      const { employeeId, pin } = body ?? {};
      if (!employeeId || !/^\d{4}$/.test(pin ?? '')) {
        return json({ error: 'PIN must be 4 digits' }, 400);
      }
      const { data: target } = await admin
        .from('employees')
        .select('role, name')
        .eq('id', employeeId)
        .single();
      if (!target) return json({ error: 'Member not found' }, 404);
      if (requiresSuper(target.role) && callerRole !== 'super_admin') {
        return json({ error: 'Only super admin can reset admins' }, 403);
      }
      if (await pinTaken(admin, pin, employeeId)) {
        return json({ error: 'PIN already in use. Choose another.' }, 409);
      }
      const hash = await bcrypt.hash(pin, 10);
      const { error } = await admin
        .from('employees')
        .update({ pin_hash: hash })
        .eq('id', employeeId);
      if (error) return json({ error: error.message }, 500);
      await clearLock(admin, employeeId, target.name); // reset also unlocks
      return json({ ok: true });
    }

    /* ── Unlock a locked-out employee (after 3 failed tries) ───── */
    if (action === 'unlock') {
      const { employeeId } = body ?? {};
      if (!employeeId) return json({ error: 'Missing employeeId' }, 400);
      const { data: target } = await admin
        .from('employees')
        .select('role, name')
        .eq('id', employeeId)
        .single();
      if (!target) return json({ error: 'Member not found' }, 404);
      if (requiresSuper(target.role) && callerRole !== 'super_admin') {
        return json({ error: 'Only super admin can unlock admins' }, 403);
      }
      await clearLock(admin, employeeId, target.name);
      return json({ ok: true });
    }

    /* ── Reset an email/staff password ───────────────────────── */
    if (action === 'reset_password') {
      const { employeeId, password } = body ?? {};
      if (!employeeId || !password || String(password).length < 6) {
        return json({ error: 'Password must be at least 6 characters' }, 400);
      }
      const { data: target } = await admin
        .from('employees')
        .select('role, auth_user_id')
        .eq('id', employeeId)
        .single();
      if (!target) return json({ error: 'Member not found' }, 404);
      if (requiresSuper(target.role) && callerRole !== 'super_admin') {
        return json({ error: 'Only super admin can reset admins' }, 403);
      }
      if (!target.auth_user_id) {
        return json(
          { error: 'This member has no email login to reset.' },
          400,
        );
      }
      const { error } = await admin.auth.admin.updateUserById(
        target.auth_user_id,
        { password },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    /* ── Create a new member (default) ───────────────────────── */
    const { name, first_name, last_name, role, access, pin, email, password } =
      body ?? {};
    if (!name || !role || !access) return json({ error: 'Missing fields' }, 400);
    if (!['employee', 'supervisor', 'admin', 'super_admin'].includes(role)) {
      return json({ error: 'Invalid role' }, 400);
    }
    if (requiresSuper(role) && callerRole !== 'super_admin') {
      return json({ error: 'Only super admin can create admins' }, 403);
    }

    if (access === 'pin') {
      if (!/^\d{4}$/.test(pin ?? '')) {
        return json({ error: 'PIN must be 4 digits' }, 400);
      }
      if (await pinTaken(admin, pin)) {
        return json({ error: 'PIN already in use. Choose another.' }, 409);
      }
      const hash = await bcrypt.hash(pin, 10);
      const { error } = await insertEmployee(admin, {
        name,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        pin_hash: hash,
        role,
        active: true,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (access === 'email') {
      if (!email || !password) {
        return json({ error: 'Email and password required' }, 400);
      }
      const { data: created, error: cErr } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role },
        });
      if (cErr || !created.user) {
        return json({ error: cErr?.message ?? 'Could not create user' }, 500);
      }
      // Staff sign in by email, not PIN — store an unusable bcrypt hash so the
      // NOT NULL pin_hash column is satisfied and never matches a 4-digit PIN.
      const placeholder = await bcrypt.hash(crypto.randomUUID(), 10);
      const { error: insErr } = await insertEmployee(admin, {
        name,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        pin_hash: placeholder,
        role,
        active: true,
        auth_user_id: created.user.id,
      });
      if (insErr) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: insErr.message }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: 'Invalid access type' }, 400);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
