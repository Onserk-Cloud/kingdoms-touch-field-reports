-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Notifications
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001_init.sql and the roles/RLS update (admin/super_admin).
-- Paste into the Supabase SQL editor and run once.
--
-- Notifications are generated automatically by a trigger on `reports`:
--   • report submitted / resubmitted  → all active staff
--   • report approved (reviewed)       → the report's author
--   • changes requested (needs_update) → the report's author (incl. note)
-- The app only reads them and marks them read. RLS scopes every row to the
-- signed-in employee.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.employees(id) on delete cascade,
  type          text not null, -- 'new_report' | 'reviewed' | 'needs_update'
  report_id     uuid references public.reports(id) on delete cascade,
  ref_label     text,          -- snapshot of the report job type
  note          text,          -- reviewer note (needs_update)
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, read, created_at desc);

-- ─── RLS: each user sees / updates only their own notifications ──
alter table public.notifications enable row level security;

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own"
  on public.notifications for select
  using (
    recipient_id = (select id from public.employees where auth_user_id = auth.uid())
  );

drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own"
  on public.notifications for update
  using (
    recipient_id = (select id from public.employees where auth_user_id = auth.uid())
  )
  with check (
    recipient_id = (select id from public.employees where auth_user_id = auth.uid())
  );

-- ─── Trigger: fan out notifications on report status changes ─────
create or replace function public.kt_notify_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- New / resubmitted report → notify every active staff member.
  if (tg_op = 'INSERT' and new.status = 'submitted')
     or (tg_op = 'UPDATE' and new.status = 'submitted'
         and old.status is distinct from 'submitted') then
    insert into public.notifications (recipient_id, type, report_id, ref_label)
    select e.id, 'new_report', new.id, new.job_type
    from public.employees e
    where e.active = true
      and e.role::text in ('supervisor', 'admin', 'super_admin');
  end if;

  -- Approved → notify the author.
  if tg_op = 'UPDATE' and new.status = 'reviewed'
     and old.status is distinct from 'reviewed' then
    insert into public.notifications (recipient_id, type, report_id, ref_label)
    values (new.employee_id, 'reviewed', new.id, new.job_type);
  end if;

  -- Changes requested → notify the author with the note.
  if tg_op = 'UPDATE' and new.status = 'needs_update'
     and old.status is distinct from 'needs_update' then
    insert into public.notifications (recipient_id, type, report_id, ref_label, note)
    values (new.employee_id, 'needs_update', new.id, new.job_type, new.review_note);
  end if;

  return new;
end;
$$;

drop trigger if exists kt_notify_report_trg on public.reports;
create trigger kt_notify_report_trg
  after insert or update on public.reports
  for each row execute function public.kt_notify_report();
