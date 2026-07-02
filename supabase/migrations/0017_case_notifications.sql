-- 0017_case_notifications.sql
-- Fix: case notifications were inserted CLIENT-SIDE, but notifications has
-- RLS enabled with no INSERT policy — every case_assigned /
-- case_needs_changes insert silently failed, so no push ever fired for
-- case assignment. Move them into a SECURITY DEFINER trigger on cases
-- (same pattern as kt_notify_report), and allow a user to insert a
-- notification for THEMSELVES (used by the in-app "test notification").
-- Idempotent: safe to run more than once.

-- === Server-side case notifications ==========================
create or replace function public.kt_notify_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  actor uuid;
begin
  select id into actor from public.employees where auth_user_id = auth.uid();

  -- New case created already assigned to someone (skip self-assignment).
  if tg_op = 'INSERT' then
    if new.assigned_to is not null
       and new.assigned_to is distinct from actor then
      insert into public.notifications (recipient_id, type, case_id, ref_label, note)
      values (new.assigned_to, 'case_assigned', new.id, new.job_type, new.instructions);
    end if;
    return new;
  end if;

  -- (Re)assigned to a new employee (skip when the employee claims it themselves).
  if new.assigned_to is distinct from old.assigned_to
     and new.assigned_to is not null
     and new.assigned_to is distinct from actor then
    insert into public.notifications (recipient_id, type, case_id, ref_label, note)
    values (new.assigned_to, 'case_assigned', new.id, new.job_type, new.instructions);
  end if;

  -- Changes requested → tell the assignee what to fix.
  if new.status = 'needs_changes'
     and new.status is distinct from old.status
     and new.assigned_to is not null
     and new.assigned_to is distinct from actor then
    insert into public.notifications (recipient_id, type, case_id, ref_label, note)
    values (new.assigned_to, 'case_needs_changes', new.id, new.job_type, new.review_note);
  end if;

  return new;
end;
$fn$;

drop trigger if exists kt_notify_case_trg on public.cases;
create trigger kt_notify_case_trg
  after insert or update on public.cases
  for each row execute function public.kt_notify_case();

-- === Self-insert policy (in-app test notification) ===========
drop policy if exists "notifications: insert own (test)" on public.notifications;
create policy "notifications: insert own (test)"
  on public.notifications for insert
  with check (
    recipient_id = (select id from public.employees where auth_user_id = auth.uid())
  );

grant insert on public.notifications to authenticated;
