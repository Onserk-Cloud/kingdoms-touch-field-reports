-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Due-date reminders for cases
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0008_cases.sql and 0009_push.sql. Idempotent.
--
-- public.kt_notify_due_cases() inserts a 'case_due_soon' notification
-- (deduped per case + recipient) for every open, assigned case whose
-- due date is within 2 days. The notification insert fires the existing
-- push trigger, so the assignee also gets a phone push.
--
-- SCHEDULING: pg_cron is not enabled on this project, so the function is
-- invoked once a day by the `run-due-check` Edge Function, which a GitHub
-- Action calls on a cron (.github/workflows/notify-due-cases.yml). The
-- service_role key stays inside Supabase — it never touches CI.
-- ─────────────────────────────────────────────────────────────

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
    and c.due_date is not null
    and c.due_date >= current_date
    and c.due_date <= current_date + 2
    and not exists (
      select 1
      from public.notifications n
      where n.case_id = c.id
        and n.type = 'case_due_soon'
        and n.recipient_id = c.assigned_to
    );
end;
$fn$;

revoke all on function public.kt_notify_due_cases() from public;
grant execute on function public.kt_notify_due_cases() to service_role;
