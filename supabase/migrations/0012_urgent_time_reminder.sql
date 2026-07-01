-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Urgent priority + due time + reminder toggle
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0008_cases.sql and 0011_due_reminders.sql. Idempotent.
-- ─────────────────────────────────────────────────────────────

-- Allow an 'urgent' priority (highest).
alter table public.cases drop constraint if exists cases_priority_check;
alter table public.cases
  add constraint cases_priority_check
  check (priority in ('urgent', 'high', 'medium', 'low'));

-- Optional due time (e.g. '15:00') shown next to the due date.
alter table public.cases add column if not exists due_time text;

-- Per-case reminder opt-out (default on).
alter table public.cases add column if not exists remind boolean not null default true;

-- Respect the reminder toggle in the daily due-date check.
create or replace function public.kt_notify_due_cases()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.notifications (recipient_id, type, case_id, ref_label, note)
  select c.assigned_to, 'case_due_soon', c.id, c.job_type, c.due_date::text
  from public.cases c
  where c.assigned_to is not null
    and c.status <> 'closed'
    and c.remind is true
    and c.due_date is not null
    and c.due_date >= current_date
    and c.due_date <= current_date + 2
    and not exists (
      select 1 from public.notifications n
      where n.case_id = c.id
        and n.type = 'case_due_soon'
        and n.recipient_id = c.assigned_to
    );
end;
$fn$;
