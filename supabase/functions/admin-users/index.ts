/**
 * Supabase Edge Function: admin-users
 *
 * Lets an admin / super_admin create team members:
 *   - access "pin":   field employee (bcrypt-hashed 4-digit PIN)
 *   - access "email": staff (Supabase Auth email + password) → supervisor/admin/…
 *
 * Security: the caller's JWT is verified, their employee role is checked, and
 * only a super_admin may create admin / super_admin members.
 *
 * Deploy:  supabase functions deploy admin-users   (keep Verify JWT = ON)
 */

// @ts-expect-error Deno std import
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
// @ts-expect-error Deno deps
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-expect-error Deno deps
import * as bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const { name, role, access, pin, email, password } = body ?? {};
    if (!name || !role || !access) return json({ error: 'Missing fields' }, 400);
    if (!['employee', 'supervisor', 'admin', 'super_admin'].includes(role)) {
      return json({ error: 'Invalid role' }, 400);
    }
    // Only a super_admin can mint admins / super_admins.
    if (
      (role === 'admin' || role === 'super_admin') &&
      callerRole !== 'super_admin'
    ) {
      return json({ error: 'Only super admin can create admins' }, 403);
    }

    if (access === 'pin') {
      if (!/^\d{4}$/.test(pin ?? '')) {
        return json({ error: 'PIN must be 4 digits' }, 400);
      }
      const hash = await bcrypt.hash(pin, 10);
      const { error } = await admin
        .from('employees')
        .insert({ name, pin_hash: hash, role, active: true });
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
      const { error: insErr } = await admin.from('employees').insert({
        name,
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
