-- 0018_comment_notifications.sql
-- Activity should notify: when someone comments on a case, tell the OTHER
-- side of the conversation (assignee <-> case creator). Also pass case_id to
-- the push function so pushes can deep-link straight to the case.
-- Idempotent: safe to run more than once.

-- === Comment -> notify the counterpart =========================
create or replace function public.kt_notify_case_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cs record;
  recipient uuid;
begin
  if new.kind <> 'comment' then
    return new;
  end if;

  select c.assigned_to, c.created_by, c.job_type
    into cs
    from public.cases c
   where c.id = new.case_id;
  if not found then
    return new;
  end if;

  -- The assignee's comments go to the case creator; anyone else's go to the
  -- assignee. Never notify the author of the comment.
  if new.actor_id is not distinct from cs.assigned_to then
    recipient := cs.created_by;
  else
    recipient := cs.assigned_to;
  end if;

  if recipient is not null and recipient is distinct from new.actor_id then
    insert into public.notifications (recipient_id, type, case_id, ref_label, note)
    values (recipient, 'case_comment', new.case_id, cs.job_type, left(new.body, 140));
  end if;

  return new;
end;
$fn$;

drop trigger if exists kt_notify_case_comment_trg on public.case_activity;
create trigger kt_notify_case_comment_trg
  after insert on public.case_activity
  for each row execute function public.kt_notify_case_comment();

-- === Push payload: include case_id for deep links ==============
create or replace function public.kt_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://siphkouwkdbouktpmmpo.functions.supabase.co/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'recipient_id', new.recipient_id,
      'type', new.type,
      'ref_label', new.ref_label,
      'note', new.note,
      'case_id', new.case_id
    )
  );
  return new;
exception
  when others then
    return new;
end;
$$;
