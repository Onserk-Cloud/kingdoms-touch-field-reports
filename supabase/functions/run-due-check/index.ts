/**
 * Supabase Edge Function: run-due-check
 *
 * Calls public.kt_notify_due_cases() once (idempotent) to create
 * 'case_due_soon' notifications for cases due within 2 days. Those inserts
 * fire the push trigger, so assignees get a phone push.
 *
 * Triggered daily by a GitHub Action (notify-due-cases.yml). The service
 * role key stays here — it never leaves Supabase.
 *
 * Deploy:  supabase functions deploy run-due-check --no-verify-jwt
 */

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await admin.rpc('kt_notify_due_cases');
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

function json(b: unknown, status = 200): Response {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
}
