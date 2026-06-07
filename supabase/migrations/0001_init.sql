-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · initial schema
-- ─────────────────────────────────────────────────────────────
-- This migration creates the schema, RLS policies, storage bucket and
-- helper functions needed by the Field Reports PWA.
--
-- Run via the Supabase SQL editor, or:
--   supabase db push
-- ─────────────────────────────────────────────────────────────

-- Required extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────
do $$ begin
  create type kt_role as enum ('employee', 'supervisor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kt_report_status as enum (
    'pending',
    'submitted',
    'reviewed',
    'needs_update'
  );
exception when duplicate_object then null; end $$;

-- ─── Employees ───────────────────────────────────────────────
create table if not exists public.employees (
  id            uuid primary key default uuid_generate_v4(),
  -- Links the row to a Supabase auth user (created by the login-with-pin
  -- Edge Function so we can issue real JWTs that drive RLS).
  auth_user_id  uuid unique references auth.users (id) on delete cascade,
  name          text not null,
  pin_hash      text not null,
  role          kt_role not null default 'employee',
  active        boolean not null default true,
  initials      text generated always as (
                  upper(
                    coalesce(
                      substring(split_part(name, ' ', 1) from 1 for 1),
                      ''
                    )
                    ||
                    coalesce(
                      substring(split_part(name, ' ', 2) from 1 for 1),
                      ''
                    )
                  )
                ) stored,
  avatar_color  text default '#7FA66E',
  created_at    timestamptz not null default now()
);

comment on column public.employees.pin_hash is
  'bcrypt hash of the 4-digit PIN. Never store the plain PIN.';

create index if not exists employees_role_idx on public.employees (role);
create index if not exists employees_auth_user_id_idx on public.employees (auth_user_id);

-- ─── Reports ─────────────────────────────────────────────────
create table if not exists public.reports (
  id                    uuid primary key default uuid_generate_v4(),
  employee_id           uuid not null references public.employees(id) on delete cascade,
  job_type              text not null,
  location              text not null,
  gps_lat               double precision,
  gps_lng               double precision,
  gps_accuracy          double precision,
  description           text not null default '',
  notes                 text,
  completion_confirmed  boolean not null default false,
  status                kt_report_status not null default 'pending',
  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewed_by           uuid references public.employees(id) on delete set null,
  created_at            timestamptz not null default now()
);

create index if not exists reports_employee_idx on public.reports (employee_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, submitted_at desc);

-- ─── Report photos ───────────────────────────────────────────
create table if not exists public.report_photos (
  id            uuid primary key default uuid_generate_v4(),
  report_id     uuid not null references public.reports(id) on delete cascade,
  storage_path  text not null,
  caption       text,
  created_at    timestamptz not null default now()
);

create index if not exists report_photos_report_idx on public.report_photos (report_id);

-- ─── Helper: current employee row ────────────────────────────
create or replace function public.kt_current_employee()
returns public.employees
language sql
stable
security definer
set search_path = public
as $$
  select * from public.employees where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.kt_is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role = 'supervisor' from public.employees where auth_user_id = auth.uid()
  ), false)
$$;

-- ─── RLS ─────────────────────────────────────────────────────
alter table public.employees enable row level security;
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;

-- Employees: each user can read their own row; supervisors can read all.
drop policy if exists "employees: read self or any (sup)" on public.employees;
create policy "employees: read self or any (sup)"
  on public.employees for select
  using (auth_user_id = auth.uid() or public.kt_is_supervisor());

drop policy if exists "employees: supervisor manages" on public.employees;
create policy "employees: supervisor manages"
  on public.employees for all
  using (public.kt_is_supervisor())
  with check (public.kt_is_supervisor());

-- Reports: owners see their own; supervisors see all.
drop policy if exists "reports: read own or all (sup)" on public.reports;
create policy "reports: read own or all (sup)"
  on public.reports for select
  using (
    public.kt_is_supervisor()
    or employee_id = (select id from public.employees where auth_user_id = auth.uid())
  );

drop policy if exists "reports: employee inserts own" on public.reports;
create policy "reports: employee inserts own"
  on public.reports for insert
  with check (
    employee_id = (select id from public.employees where auth_user_id = auth.uid())
  );

drop policy if exists "reports: owner or supervisor updates" on public.reports;
create policy "reports: owner or supervisor updates"
  on public.reports for update
  using (
    public.kt_is_supervisor()
    or employee_id = (select id from public.employees where auth_user_id = auth.uid())
  );

-- Photos follow their parent report.
drop policy if exists "photos: read via report" on public.report_photos;
create policy "photos: read via report"
  on public.report_photos for select
  using (
    public.kt_is_supervisor()
    or report_id in (
      select id from public.reports
      where employee_id = (select id from public.employees where auth_user_id = auth.uid())
    )
  );

drop policy if exists "photos: insert via report" on public.report_photos;
create policy "photos: insert via report"
  on public.report_photos for insert
  with check (
    public.kt_is_supervisor()
    or report_id in (
      select id from public.reports
      where employee_id = (select id from public.employees where auth_user_id = auth.uid())
    )
  );

-- ─── Storage bucket: report-photos (private) ────────────────
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', false)
on conflict (id) do nothing;

drop policy if exists "report-photos: owner read" on storage.objects;
create policy "report-photos: owner read"
  on storage.objects for select
  using (
    bucket_id = 'report-photos'
    and (
      public.kt_is_supervisor()
      or (
        -- Path is `<report_id>/<photo_id>.<ext>`; check ownership.
        (storage.foldername(name))[1]::uuid in (
          select id from public.reports
          where employee_id = (
            select id from public.employees where auth_user_id = auth.uid()
          )
        )
      )
    )
  );

drop policy if exists "report-photos: owner write" on storage.objects;
create policy "report-photos: owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.reports
      where employee_id = (
        select id from public.employees where auth_user_id = auth.uid()
      )
    )
  );

-- ─── Seed: a handy supervisor + employee for development ─────
-- These PINs are placeholders; rotate them in production.
-- The Edge Function hashes PINs with bcrypt on creation; for the seed we
-- include precomputed hashes so you can log in immediately.
--
-- PIN 0000 → Sandra Ruiz (supervisor)
-- PIN 1234 → Jonathan Reyes (employee)
-- PIN 5678 → Maria López (employee)
--
-- Hashes verified to compare-true against their respective PINs with
-- bcryptjs cost=10. To rotate: see README §3.
insert into public.employees (name, pin_hash, role, avatar_color)
values
  ('Sandra Ruiz',    '$2b$10$VdXu/7h3ur0LHtaN13Vn/uYffJQUQUGOCSy5mYQzO98ZsP.zQ6uKy', 'supervisor', '#2A5238'), -- PIN 0000
  ('Jonathan Reyes', '$2b$10$Fr5C6cmjQmbibvdZzUhhM.MDpWMTiC1nu6SAA9TntrWHv.qADAsvi', 'employee',   '#7FA66E'), -- PIN 1234
  ('Maria López',    '$2b$10$5GzSKLvQ80O2Q1Vz8v2W4O.lRgNhMwC9uqDeI6SSXBAKGLsrHWvFK', 'employee',   '#C9A24D')  -- PIN 5678
on conflict do nothing;
