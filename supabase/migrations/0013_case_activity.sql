-- =============================================================
-- Kingdom Touch · Case activity timeline + comments
-- =============================================================
-- Run AFTER 0008_cases.sql. Idempotent.
-- Append-only feed of case events (created / status / assigned)
-- and free-text comments from staff and the assigned employee.
-- =============================================================

create table if not exists public.case_activity (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  actor_id    uuid references public.employees(id) on delete set null,
  kind        text not null default 'comment'
    check (kind in ('comment', 'status', 'assigned', 'created', 'submitted', 'reopened')),
  body        text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.case_activity is
  'Append-only timeline for a case: system events + comments.';

create index if not exists case_activity_case_idx
  on public.case_activity (case_id, created_at);

-- === RLS ======================================================
alter table public.case_activity enable row level security;

-- SELECT: staff, or the employee currently assigned to the case.
drop policy if exists "case_activity: visible" on public.case_activity;
create policy "case_activity: visible"
  on public.case_activity for select
  using (
    public.kt_is_staff()
    or exists (
      select 1 from public.cases c
      where c.id = case_activity.case_id
        and c.assigned_to = (select id from public.employees where auth_user_id = auth.uid())
    )
  );

-- INSERT: the actor must be the caller, and be staff or the assignee.
-- (System events are written by the SECURITY DEFINER trigger below,
--  which bypasses RLS — this policy governs app-side comments.)
drop policy if exists "case_activity: insert" on public.case_activity;
create policy "case_activity: insert"
  on public.case_activity for insert
  with check (
    actor_id = (select id from public.employees where auth_user_id = auth.uid())
    and (
      public.kt_is_staff()
      or exists (
        select 1 from public.cases c
        where c.id = case_activity.case_id
          and c.assigned_to = (select id from public.employees where auth_user_id = auth.uid())
      )
    )
  );

grant select, insert on public.case_activity to authenticated;

-- === Auto-log system events ===================================
create or replace function public.kt_log_case_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  actor uuid;
begin
  select id into actor from public.employees where auth_user_id = auth.uid();

  if (tg_op = 'INSERT') then
    insert into public.case_activity (case_id, actor_id, kind, meta)
      values (new.id, actor, 'created',
              jsonb_build_object('status', new.status));
    return new;
  end if;

  -- Status transition (attach the review note only for needs_changes).
  if (new.status is distinct from old.status) then
    insert into public.case_activity (case_id, actor_id, kind, body, meta)
      values (
        new.id, actor, 'status',
        case when new.status = 'needs_changes' then new.review_note else null end,
        jsonb_build_object('from', old.status, 'to', new.status)
      );
  end if;

  -- (Re)assignment to an employee.
  if (new.assigned_to is distinct from old.assigned_to
      and new.assigned_to is not null) then
    insert into public.case_activity (case_id, actor_id, kind, meta)
      values (new.id, actor, 'assigned',
              jsonb_build_object('assigned_to', new.assigned_to));
  end if;

  return new;
end;
$fn$;

drop trigger if exists kt_case_activity_trg on public.cases;
create trigger kt_case_activity_trg
  after insert or update on public.cases
  for each row execute function public.kt_log_case_activity();
