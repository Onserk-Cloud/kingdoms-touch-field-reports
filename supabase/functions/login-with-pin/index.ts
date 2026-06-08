/**
 * Supabase Edge Function: login-with-pin
 *
 * Deno runtime. The employee is identified FIRST (by their saved id on a
 * returning device, or by typing their name the first time), and the 4-digit
 * PIN is verified against ONLY that person. Shared PINs are therefore harmless.
 *
 * Brute-force defense: a 4-digit PIN is only ~10,000 combinations on a public
 * endpoint, so failed attempts are counted per identity and the identity is
 * locked after 3 wrong tries until an admin resets the PIN or unlocks it
 * (admin-users functions reset_pin / unlock). Table: public.login_attempts.
 *
 * Request body:
 *   { pin, employeeId }  -> returning device (verify PIN for that employee)
 *   { pin, name }        -> first time (find the named employee, verify PIN)
 *
 * Deploy:
 *   supabase functions deploy login-with-pin   (Verify JWT = OFF)
 *
 * Required env vars (auto-injected by Supabase - no manual setup needed):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 *
 * NOTE: the Email provider must be ENABLED in Authentication -> Providers,
 * otherwise the signInWithPassword step below returns
 * "Email logins are disabled" and this function 500s.
 */

// @ts-expect-error Deno standard import
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
// @ts-expect-error Deno deps
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-expect-error Deno deps - bcryptjs is CommonJS; the functions live on the
// default export, so `import * as bcrypt` would give `bcrypt.compare === undefined`.
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 3 wrong tries locks the identity until an admin resets the PIN or unlocks it.
const MAX_FAILS = 3;

// Combining diacritical marks (U+0300..U+036F). Built from an ASCII-only
// string so copy/paste into the dashboard editor can never mangle it.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

// Tokens of a name, accent/case/punctuation-insensitive. 'José O'Brien-Lee'
// -> ['jose', 'o', 'brien', 'lee'].
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

// Does the typed name plausibly identify the stored name? Matches either the
// punctuation/space-insensitive whole ("OBrien" == "O'Brien") or a token subset
// ("Maria Lopez" identifies "Maria Del Carmen Lopez"). A shared PIN still has to
// match too, so loose name matching can't log you into the wrong account.
function nameMatches(stored: string, typedTokens: string[]): boolean {
  if (!typedTokens.length) return false;
  const st = tokensOf(stored);
  if (!st.length) return false;
  if (st.join('') === typedTokens.join('')) return true;
  return typedTokens.every((t) => st.includes(t));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pin, employeeId, name } = (await req.json()) as {
      pin?: string;
      employeeId?: string;
      name?: string;
    };

    if (!pin || !/^\d{4}$/.test(pin)) {
      return json({ error: 'PIN must be 4 digits', code: 'pin_format' }, 400);
    }
    if (!employeeId && !name) {
      return json(
        { error: 'Identify with name or device', code: 'identify' },
        400,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
      serviceKey;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Throttle by identity so a 4-digit PIN can't be hammered.
    const subject = employeeId
      ? `emp:${employeeId}`
      : `name:${tokensOf(name ?? '').join(' ')}`;
    if (await isLocked(admin, subject)) {
      return json(
        { error: 'Too many attempts. Try again later.', code: 'locked' },
        429,
      );
    }

    // ── Resolve the ONE employee this login is for, then verify the PIN. ──
    let match: any = null;
    let duplicate = false;

    if (employeeId) {
      const { data: emp } = await admin
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .eq('active', true)
        .maybeSingle();
      if (emp && (await bcrypt.compare(pin, emp.pin_hash))) match = emp;
    } else if (name) {
      const typed = tokensOf(name);
      const { data: employees, error: empErr } = await admin
        .from('employees')
        .select('*')
        .eq('active', true);
      if (empErr) return json({ error: empErr.message, code: 'server' }, 500);

      const byName = (employees ?? []).filter((e: any) =>
        nameMatches(e.name, typed),
      );
      const pinMatches: any[] = [];
      for (const e of byName) {
        if (await bcrypt.compare(pin, e.pin_hash)) pinMatches.push(e);
      }
      if (pinMatches.length === 1) match = pinMatches[0];
      else if (pinMatches.length > 1) duplicate = true;
    }

    if (!match) {
      await recordFail(admin, subject);
      if (duplicate) {
        return json(
          { error: 'Duplicate name and PIN. Contact your admin.', code: 'duplicate' },
          409,
        );
      }
      return json({ error: 'Invalid name or PIN', code: 'invalid' }, 401);
    }

    // Success — clear the failure counter for this identity.
    await clearFails(admin, subject);

    // Ensure an auth.users row exists for this employee.
    let userId = match.auth_user_id as string | null;
    const placeholderEmail = `kt-${match.id}@kingdom-touch.local`;
    const placeholderPwd = crypto.randomUUID() + crypto.randomUUID();

    if (!userId) {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: placeholderEmail,
          password: placeholderPwd,
          email_confirm: true,
          user_metadata: {
            employee_id: match.id,
            name: match.name,
            role: match.role,
          },
        });
      if (createErr || !created.user) {
        return json(
          {
            error: createErr?.message ?? 'Could not create auth user',
            code: 'server',
          },
          500,
        );
      }
      userId = created.user.id;
      await admin
        .from('employees')
        .update({ auth_user_id: userId })
        .eq('id', match.id);
    } else {
      // Rotate the password so we can sign in below.
      await admin.auth.admin.updateUserById(userId, {
        password: placeholderPwd,
      });
    }

    // Now sign in *as* that user to mint a JWT we can hand back. Use the
    // ANON key here (not the service key) - the GoTrue token endpoint expects
    // a public key as the apikey, and a service-role key can be rejected.
    const signInClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error: signInErr } =
      await signInClient.auth.signInWithPassword({
        email: placeholderEmail,
        password: placeholderPwd,
      });

    if (signInErr || !signed.session) {
      // Most common cause: the Email provider is disabled in Auth settings.
      return json(
        {
          error: signInErr?.message ?? 'Could not sign in',
          code: 'signin_failed',
          hint: 'Enable the Email provider in Authentication -> Providers.',
        },
        500,
      );
    }

    return json({
      employee: {
        id: match.id,
        name: match.name,
        role: match.role,
        active: match.active,
        initials: match.initials,
        avatar_color: match.avatar_color,
        created_at: match.created_at,
      },
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
      expires_at: signed.session.expires_at
        ? new Date(signed.session.expires_at * 1000).toISOString()
        : null,
    });
  } catch (err) {
    return json(
      {
        error: err instanceof Error ? err.message : String(err),
        code: 'server',
      },
      500,
    );
  }
});

/* ── Throttle helpers (public.login_attempts) ──────────────────── */

async function isLocked(admin: any, subject: string): Promise<boolean> {
  const { data } = await admin
    .from('login_attempts')
    .select('fail_count')
    .eq('subject', subject)
    .maybeSingle();
  // Count-based lock: stays locked until an admin clears it (no auto-expiry).
  return (data?.fail_count ?? 0) >= MAX_FAILS;
}

async function recordFail(admin: any, subject: string): Promise<void> {
  const { data } = await admin
    .from('login_attempts')
    .select('fail_count')
    .eq('subject', subject)
    .maybeSingle();
  const fail = (data?.fail_count ?? 0) + 1;
  await admin.from('login_attempts').upsert({
    subject,
    fail_count: fail,
    locked_until: fail >= MAX_FAILS ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

async function clearFails(admin: any, subject: string): Promise<void> {
  await admin.from('login_attempts').delete().eq('subject', subject);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
