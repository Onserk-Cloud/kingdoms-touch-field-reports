-- 0019_photo_and_status_notifications.sql
-- More activity signals:
--   * adding a case photo logs a timeline event AND notifies the counterpart
--   * approving a case notifies the assignee ("your work was approved")
-- Idempotent: safe to run more than once.

-- Allow 'photo' in the activity kinds.
alter table public.case_activity drop constraint if exists case_activity_kind_check;
alter table public.case_activity
  add constraint case_activity_kind_check
  check (kind in ('comment', 'status', 'assigned', 'created', 'submitted', 'reopened', 'photo'));

-- === Photo added -> timeline event + notify the counterpart ====
create or replace function public.kt_notify_case_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cs record;
  recipient uuid;
begin
  select c.assigned_to, c.created_by, c.job_type
    into cs
    from public.cases c
   where c.id = new.case_id;
  if not found then
    return new;
  end if;

  -- Timeline event (the comment trigger ignores non-comment kinds).
  insert into public.case_activity (case_id, actor_id, kind)
  values (new.case_id, new.uploaded_by, 'photo');

  -- Uploader's counterpart: assignee's photos go to the creator, anyone
  -- else's to the assignee. Never notify the uploader themselves.
  if new.uploaded_by is not distinct from cs.assigned_to then
    recipient := cs.created_by;
  else
    recipient := cs.assigned_to;
  end if;

  if recipient is not null and recipient is distinct from new.uploaded_by then
    insert into public.notifications (recipient_id, type, case_id, ref_label)
    values (recipient, 'case_photo', new.case_id, cs.job_type);
  end if;

  return new;
end;
$fn$;

drop trigger if exists kt_notify_case_photo_trg on public.case_photos;
create trigger kt_notify_case_photo_trg
  after insert on public.case_photos
  for each row execute function public.kt_notify_case_photo();

-- === Approved -> notify the assignee ==========================
-- Extends kt_notify_case (0017) with the approval signal.
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

  -- Approved → congratulate the assignee.
  if new.status = 'approved'
     and new.status is distinct from old.status
     and new.assigned_to is not null
     and new.assigned_to is distinct from actor then
    insert into public.notifications (recipient_id, type, case_id, ref_label)
    values (new.assigned_to, 'case_approved', new.id, new.job_type);
  end if;

  return new;
end;
$fn$;
