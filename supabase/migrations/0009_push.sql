-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Push Subscriptions & Notifications
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001..0008. Idempotent: safe to re-run.
-- Paste into the Supabase SQL editor and run once.
--
-- Adds Web Push Protocol support:
--   1. push_subscriptions table: endpoint + p256dh/auth keys per employee
--   2. RLS: employees manage their own subscriptions
--   3. Trigger on notifications: calls send-push Edge Function via pg_net
--   4. pg_net extension: async HTTP calls, failures are non-blocking
--
-- DEPLOYMENT STEPS:
--   - Ensure the send-push Edge Function is deployed
--   - Run: alter database postgres set app.send_push_url = 'https://<ref>.functions.supabase.co/send-push';
--   - Run: alter database postgres set app.send_push_key = '<service_role_key>';
--   These must be set before the trigger will work.
-- ─────────────────────────────────────────────────────────────

-- Enable pg_net for async HTTP calls (idempotent). On Supabase pg_net manages
-- its own `net` schema, so don't pin a schema here.
create extension if not exists pg_net;

-- 1. Push subscriptions table ─────────────────────────────────
create table if not exists public.push_subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists push_subscriptions_employee_idx
  on public.push_subscriptions (employee_id);

-- 2. RLS: each user manages only their own subscriptions ───────
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: user manages own" on public.push_subscriptions;
create policy "push_subscriptions: user manages own"
  on public.push_subscriptions for all
  using (
    employee_id = (select id from public.employees where auth_user_id = auth.uid())
  )
  with check (
    employee_id = (select id from public.employees where auth_user_id = auth.uid())
  );

grant select, insert, delete on table public.push_subscriptions to authenticated;

-- 3. Trigger: send push notifications via Edge Function ───────
-- NOTE: app.send_push_url and app.send_push_key must be set via:
--   alter database postgres set app.send_push_url = 'https://<ref>.functions.supabase.co/send-push';
--   alter database postgres set app.send_push_key = '<service_role_key>';
--
-- pg_net.http_post is asynchronous and non-blocking: failures are logged
-- but do not fail the notification insert. This is intentional — the
-- notification was created successfully; if push fails, the user will
-- see it in their unread feed next time they open the app.
create or replace function public.kt_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := current_setting('app.send_push_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.send_push_key', true)
    ),
    body := jsonb_build_object(
      'recipient_id', new.recipient_id,
      'type', new.type,
      'ref_label', new.ref_label,
      'note', new.note
    )
  );
  return new;
end;
$$;

drop trigger if exists kt_push_on_notification_trg on public.notifications;
create trigger kt_push_on_notification_trg
  after insert on public.notifications
  for each row execute function public.kt_push_on_notification();
