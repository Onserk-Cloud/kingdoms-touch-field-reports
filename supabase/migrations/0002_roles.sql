-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Roles (admin + super_admin) and staff RLS
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001_init.sql. Safe to re-run (idempotent).
-- Paste into the Supabase SQL editor and run once.
-- ─────────────────────────────────────────────────────────────

-- 1. Add the two new roles to the enum.
alter type kt_role add value if not exists 'admin';
alter type kt_role add value if not exists 'super_admin';

-- 2. Column used by the review flow (reviewer note shown to the employee).
alter table public.reports add column if not exists review_note text;

-- 3. Role helpers. We compare role::text so the function never depends on the
--    new enum values existing at parse time (avoids same-transaction issues).
create or replace function public.kt_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role::text in ('supervisor', 'admin', 'super_admin')
    from public.employees where auth_user_id = auth.uid()
  ), false)
$$;

create or replace function public.kt_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role::text in ('admin', 'super_admin')
    from public.employees where auth_user_id = auth.uid()
  ), false)
$$;

create or replace function public.kt_is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role::text = 'super_admin'
    from public.employees where auth_user_id = auth.uid()
  ), false)
$$;

-- 4. Broaden report / photo visibility from "supervisor only" to all staff.
drop policy if exists "reports: read own or all (sup)" on public.reports;
create policy "reports: read own or all (sup)"
  on public.reports for select
  using (
    public.kt_is_staff()
    or employee_id = (select id from public.employees where auth_user_id = auth.uid())
  );

drop policy if exists "reports: owner or supervisor updates" on public.reports;
create policy "reports: owner or supervisor updates"
  on public.reports for update
  using (
    public.kt_is_staff()
    or employee_id = (select id from public.employees where auth_user_id = auth.uid())
  );

drop policy if exists "photos: read via report" on public.report_photos;
create policy "photos: read via report"
  on public.report_photos for select
  using (
    public.kt_is_staff()
    or report_id in (
      select id from public.reports
      where employee_id = (select id from public.employees where auth_user_id = auth.uid())
    )
  );

-- 5. Employees: any staff can read the roster; admins manage it.
drop policy if exists "employees: read self or any (sup)" on public.employees;
drop policy if exists "employees: read self or staff" on public.employees;
create policy "employees: read self or staff"
  on public.employees for select
  using (auth_user_id = auth.uid() or public.kt_is_staff());

drop policy if exists "employees: supervisor manages" on public.employees;
drop policy if exists "employees: admin manages" on public.employees;
create policy "employees: admin manages"
  on public.employees for all
  using (public.kt_is_admin())
  with check (public.kt_is_admin());

-- 6. Storage: let staff view any report photo.
drop policy if exists "report-photos: owner read" on storage.objects;
create policy "report-photos: owner read"
  on storage.objects for select
  using (
    bucket_id = 'report-photos'
    and (
      public.kt_is_staff()
      or (storage.foldername(name))[1]::uuid in (
        select id from public.reports
        where employee_id = (select id from public.employees where auth_user_id = auth.uid())
      )
    )
  );
