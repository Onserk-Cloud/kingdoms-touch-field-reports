/**
 * Supabase Edge Function: send-push
 *
 * Sends Web Push notifications to all of a recipient's registered devices.
 * Called server-to-server by the `kt_push_on_notification` trigger (pg_net)
 * every time a row is inserted into `public.notifications`.
 *
 * Free Web Push (VAPID) — no third-party service. Requires these secrets:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:admin@…)
 *
 * Deploy:  supabase functions deploy send-push --no-verify-jwt
 */

// npm: specifiers bundle reliably and give proper Node compat for web-push.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function titleFor(type: string): string {
  switch (type) {
    case 'case_assigned':
      return 'New case assigned';
    case 'case_needs_changes':
      return 'Changes requested';
    case 'case_due_soon':
      return 'Case due soon';
    case 'case_comment':
      return 'New comment';
    case 'case_photo':
      return 'New photo added';
    case 'case_approved':
      return 'Case approved';
    case 'new_report':
      return 'New report submitted';
    case 'reviewed':
      return 'Report approved';
    case 'needs_update':
      return 'Changes requested';
    case 'test':
      return 'Test notification';
    default:
      return 'Kingdoms Touch';
  }
}

function urlFor(type: string, caseId?: string | null): string {
  // Deep-link straight into the case when we know which one it is.
  if (caseId) return `/cases/${caseId}`;
  if (
    type === 'case_assigned' ||
    type === 'case_needs_changes' ||
    type === 'case_due_soon'
  )
    return '/home';
  if (type === 'new_report') return '/supervisor';
  return '/notifications';
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject =
      Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@kingdomstouch.app';

    if (!vapidPublic || !vapidPrivate) {
      return json({ error: 'VAPID keys not configured' }, 500);
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const body = await req.json();
    const recipientId = body?.recipient_id as string | undefined;
    const type = (body?.type as string) ?? 'notification';
    if (!recipientId) return json({ error: 'recipient_id required' }, 400);

    const title = (body?.title as string) ?? titleFor(type);
    const text =
      (body?.body as string) ??
      `${body?.ref_label ? String(body.ref_label) : ''}${
        body?.note ? ` — ${body.note}` : ''
      }`.trim();
    const link =
      (body?.url as string) ?? urlFor(type, body?.case_id as string | null);

    const admin = createClient(url, serviceKey);
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('employee_id', recipientId);

    const payload = JSON.stringify({ title, body: text, url: link, tag: type });

    let sent = 0;
    let removed = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410 = the subscription is gone — clean it up.
        if (code === 404 || code === 410) {
          await admin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', s.endpoint);
          removed++;
        }
      }
    }

    return json({ sent, removed });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : String(err) },
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
