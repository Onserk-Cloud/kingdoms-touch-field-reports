-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Case photos table + RLS + storage
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001_init.sql, 0002_roles.sql, 0008_cases.sql. Safe to
-- re-run (idempotent). Creates the case_photos table, storage bucket,
-- and all RLS policies for secure case photo uploads and access.
-- ─────────────────────────────────────────────────────────────

-- ─── Case photos table ────────────────────────────────────────
create table if not exists public.case_photos (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  uploaded_by   uuid references public.employees(id) on delete set null,
  storage_path  text not null,
  caption       text,
  created_at    timestamptz not null default now()
);

comment on table public.case_photos is
  'Photos attached to a case. Storage path layout: <case_id>/<photo_id>.<ext>';
comment on column public.case_photos.uploaded_by is
  'Employee who uploaded the photo. NULL if the uploader is later deleted.';

-- ─── Indexes ──────────────────────────────────────────────────
create index if not exists case_photos_case_idx on public.case_photos (case_id);

-- ─── RLS: enable on case_photos ───────────────────────────────
alter table public.case_photos enable row level security;

-- ─── RLS Policies on case_photos ──────────────────────────────

-- SELECT: staff can read any; non-staff can read if assigned to the case
drop policy if exists "case_photos: staff or assignee" on public.case_photos;
create policy "case_photos: staff or assignee"
  on public.case_photos for select
  using (
    public.kt_is_staff()
    or exists(
      select 1 from public.cases c
      where c.id = case_id
      and c.assigned_to = (select id from public.employees where auth_user_id = auth.uid())
    )
  );

-- INSERT: staff can insert any; non-staff can insert if assigned to the case,
-- and must be the uploader (cannot create on behalf of others)
drop policy if exists "case_photos: staff or assignee insert" on public.case_photos;
create policy "case_photos: staff or assignee insert"
  on public.case_photos for insert
  with check (
    (
      public.kt_is_staff()
      or exists(
        select 1 from public.cases c
        where c.id = case_id
        and c.assigned_to = (select id from public.employees where auth_user_id = auth.uid())
      )
    )
    and uploaded_by = (select id from public.employees where auth_user_id = auth.uid())
  );

-- DELETE: staff can delete any; non-staff can delete only their own uploads
drop policy if exists "case_photos: uploader or staff" on public.case_photos;
create policy "case_photos: uploader or staff"
  on public.case_photos for delete
  using (
    public.kt_is_staff()
    or uploaded_by = (select id from public.employees where auth_user_id = auth.uid())
  );

-- ─── Column grants ────────────────────────────────────────────
grant select, insert, delete on public.case_photos to authenticated;

-- ─── Storage bucket: case-photos (private) ───────────────────
insert into storage.buckets (id, name, public)
values ('case-photos', 'case-photos', false)
on conflict (id) do nothing;

-- ─── Storage RLS: case-photos READ ────────────────────────────
-- Staff can read any; non-staff can read if assigned to the case.
-- Path layout: <case_id>/<photo_id>.<ext>, so case_id = split_part(name,'/',1)
drop policy if exists "case-photos: read" on storage.objects;
create policy "case-photos: read"
  on storage.objects for select
  using (
    bucket_id = 'case-photos'
    and (
      public.kt_is_staff()
      or exists(
        select 1 from public.cases c
        where c.id::text = split_part(name, '/', 1)
        and c.assigned_to = (select id from public.employees where auth_user_id = auth.uid())
      )
    )
  );

-- ─── Storage RLS: case-photos INSERT ───────────────────────────
-- Staff can insert any; non-staff can insert if assigned to the case.
drop policy if exists "case-photos: insert" on storage.objects;
create policy "case-photos: insert"
  on storage.objects for insert
  with check (
    bucket_id = 'case-photos'
    and (
      public.kt_is_staff()
      or exists(
        select 1 from public.cases c
        where c.id::text = split_part(name, '/', 1)
        and c.assigned_to = (select id from public.employees where auth_user_id = auth.uid())
      )
    )
  );

-- ─── Storage RLS: case-photos DELETE ───────────────────────────
-- Staff can delete any; non-staff can delete if assigned to the case.
drop policy if exists "case-photos: delete" on storage.objects;
create policy "case-photos: delete"
  on storage.objects for delete
  using (
    bucket_id = 'case-photos'
    and (
      public.kt_is_staff()
      or exists(
        select 1 from public.cases c
        where c.id::text = split_part(name, '/', 1)
        and c.assigned_to = (select id from public.employees where auth_user_id = auth.uid())
      )
    )
  );
