-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Cases table + RLS
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001_init.sql and 0002_roles.sql. Safe to re-run (idempotent).
-- Creates the cases table with full RLS, indexes, and updates notifications
-- and reports to reference cases.
-- ─────────────────────────────────────────────────────────────

-- ─── Cases table ──────────────────────────────────────────────
create table if not exists public.cases (
  id                uuid primary key default uuid_generate_v4(),
  created_by        uuid not null references public.employees(id) on delete restrict,
  assigned_to       uuid references public.employees(id) on delete set null,
  job_type          text not null,
  client_or_site    text,
  location          text,
  priority          text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  due_date          date,
  instructions      text,
  assignment_group  text,
  status            text not null default 'assigned'
    check (status in ('available', 'assigned', 'in_progress', 'submitted', 'needs_changes', 'closed')),
  report_id         uuid references public.reports(id) on delete set null,
  review_note       text,
  assigned_at       timestamptz,
  submitted_at      timestamptz,
  closed_at         timestamptz,
  created_at        timestamptz not null default now()
);

comment on table public.cases is
  'Work cases assigned to employees or posted to a pool (available).';
comment on column public.cases.created_by is
  'Staff member who created the case (supervisor/admin/super_admin).';
comment on column public.cases.assigned_to is
  'Employee assigned to the case. NULL when status = ''available'' (pool case).';
comment on column public.cases.assignment_group is
  'Optional: group name for pool/routing (future use).';
comment on column public.cases.status is
  'Status: available (pool), assigned, in_progress, submitted, needs_changes, closed.';
comment on column public.cases.report_id is
  'Optional: links case to a report if one is generated from this case.';

-- ─── Indexes ──────────────────────────────────────────────────
create index if not exists cases_assigned_to_status_idx
  on public.cases (assigned_to, status);
create index if not exists cases_created_by_idx
  on public.cases (created_by);
create index if not exists cases_status_idx
  on public.cases (status);

-- ─── Add case_id to reports ───────────────────────────────────
alter table public.reports add column if not exists case_id uuid
  references public.cases(id) on delete set null;

-- ─── Add case_id to notifications ─────────────────────────────
alter table public.notifications add column if not exists case_id uuid
  references public.cases(id) on delete set null;

-- ─── RLS: enable on cases ──────────────────────────────────────
alter table public.cases enable row level security;

-- ─── RLS Policies on cases ────────────────────────────────────

-- SELECT: visible to staff, assigned employee, or anyone viewing available pool
drop policy if exists "cases: staff or assignee or pool" on public.cases;
create policy "cases: staff or assignee or pool"
  on public.cases for select
  using (
    public.kt_is_staff()
    or assigned_to = (select id from public.employees where auth_user_id = auth.uid())
    or (assigned_to is null and status = 'available')
  );

-- INSERT: only staff can create
drop policy if exists "cases: staff create" on public.cases;
create policy "cases: staff create"
  on public.cases for insert
  with check (
    public.kt_is_staff()
    and created_by = (select id from public.employees where auth_user_id = auth.uid())
  );

-- UPDATE: staff manage; only creator/super_admin can set to closed
drop policy if exists "cases: staff manage" on public.cases;
create policy "cases: staff manage"
  on public.cases for update
  using (public.kt_is_staff())
  with check (
    public.kt_is_staff()
    and (
      status <> 'closed'
      or created_by = (select id from public.employees where auth_user_id = auth.uid())
      or public.kt_is_super_admin()
    )
  );

-- UPDATE: assignee can claim pool and progress their own case
drop policy if exists "cases: assignee progresses" on public.cases;
create policy "cases: assignee progresses"
  on public.cases for update
  using (
    assigned_to = (select id from public.employees where auth_user_id = auth.uid())
    or (assigned_to is null and status = 'available')
  )
  with check (
    assigned_to = (select id from public.employees where auth_user_id = auth.uid())
    and status in ('assigned', 'in_progress', 'submitted')
  );

-- ─── Column grants ────────────────────────────────────────────
grant select, insert, update on public.cases to authenticated;
