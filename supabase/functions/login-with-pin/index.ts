/**
 * Supabase Edge Function: login-with-pin
 *
 * Deno runtime. Validates a 4-digit PIN with bcrypt against the
 * `employees.pin_hash` column, then asks Supabase Auth for a real JWT bound
 * to that employee's auth user (creating one if it doesn't exist yet).
 *
 * Deploy:
 *   supabase functions deploy login-with-pin
 *
 * Required env vars (set in Project → Settings → Functions):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

// @ts-expect-error Deno standard import
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
// @ts-expect-error Deno deps
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-expect-error Deno deps
import * as bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pin } = (await req.json()) as { pin?: string };

    if (!pin || !/^\d{4}$/.test(pin)) {
      return json({ error: 'PIN must be 4 digits' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Pull all *active* employees and compare bcrypt. PIN space is tiny
    // (10 000 values) so collisions are possible if you scale; treat this
    // as a *low-friction* auth, not a high-security one.
    const { data: employees, error: empErr } = await admin
      .from('employees')
      .select('*')
      .eq('active', true);

    if (empErr) return json({ error: empErr.message }, 500);

    let match: any = null;
    for (const emp of employees ?? []) {
      const ok = await bcrypt.compare(pin, emp.pin_hash);
      if (ok) {
        match = emp;
        break;
      }
    }

    if (!match) {
      return json({ error: 'Invalid PIN' }, 401);
    }

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
          { error: createErr?.message ?? 'Could not create auth user' },
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

    // Now sign in *as* that user to mint a JWT we can hand back.
    const signInClient = createClient(supabaseUrl, serviceKey);
    const { data: signed, error: signInErr } =
      await signInClient.auth.signInWithPassword({
        email: placeholderEmail,
        password: placeholderPwd,
      });

    if (signInErr || !signed.session) {
      return json(
        { error: signInErr?.message ?? 'Could not sign in' },
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
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
