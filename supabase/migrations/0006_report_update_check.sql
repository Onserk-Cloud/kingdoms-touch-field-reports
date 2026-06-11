-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Harden the reports UPDATE policy (WITH CHECK)
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001..0005. Safe to re-run (idempotent).
--
-- The original UPDATE policy on public.reports had a USING clause but no
-- WITH CHECK, so PostgreSQL reused USING for the new row and an authenticated
-- employee could craft an API call that set their own report to
-- status='reviewed' (self-approval) — bypassing the supervisor review flow.
--
-- This replaces it with two policies that constrain the NEW row:
--   • staff (supervisor/admin/super_admin): may review any report freely.
--   • owner (employee): may edit/resubmit only their own report and may NOT
--     move it to 'reviewed' (only a reviewer approves) nor reassign it.
--
-- Idempotent on an already-provisioned project (this is the migration to run
-- on the client's existing Supabase). 0002_roles.sql already carries the same
-- corrected policies for fresh installs.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "reports: owner or supervisor updates" on public.reports;
drop policy if exists "reports: staff updates" on public.reports;
drop policy if exists "reports: owner updates own" on public.reports;

create policy "reports: staff updates"
  on public.reports for update
  using (public.kt_is_staff())
  with check (public.kt_is_staff());

create policy "reports: owner updates own"
  on public.reports for update
  using (
    employee_id = (select id from public.employees where auth_user_id = auth.uid())
  )
  with check (
    employee_id = (select id from public.employees where auth_user_id = auth.uid())
    and status::text in ('pending', 'submitted', 'needs_update')
  );
