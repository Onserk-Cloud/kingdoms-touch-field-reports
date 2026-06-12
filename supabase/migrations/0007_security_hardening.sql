-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Security hardening (role hierarchy + pin_hash)
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001..0006. Safe to re-run (idempotent).
-- Paste into the Supabase SQL editor and run once.
--
-- Fixes three findings from the delivery security audit:
--   1. The single "admin manages" policy let ANY admin update/delete
--      admin/super_admin rows via the raw REST API — including promoting
--      THEMSELVES to super_admin or disabling the owner. Split into two
--      policies so admins only manage employee/supervisor rows; only the
--      super_admin touches elevated rows.
--   2. pin_hash (password-equivalent, 4-digit search space) was readable
--      by any staff token via column selection. Revoke and re-grant
--      column-by-column without it (Edge Functions use the service role,
--      which is unaffected).
--   3. The reports INSERT policy allowed creating a report already marked
--      'reviewed' (self-approval on the insert path). Constrain it.
-- ─────────────────────────────────────────────────────────────

-- 1. Role hierarchy on employees -------------------------------------------
drop policy if exists "employees: admin manages" on public.employees;
drop policy if exists "employees: super admin manages all" on public.employees;
drop policy if exists "employees: admin manages basic roles" on public.employees;

-- Super admin manages everyone.
create policy "employees: super admin manages all"
  on public.employees for all
  using (public.kt_is_super_admin())
  with check (public.kt_is_super_admin());

-- Admins manage ONLY employee/supervisor rows (both the row they touch and
-- the values they write). They cannot edit elevated rows — including their
-- own — so self-promotion and owner lockout are impossible.
create policy "employees: admin manages basic roles"
  on public.employees for all
  using (
    public.kt_is_admin()
    and role::text in ('employee', 'supervisor')
  )
  with check (
    public.kt_is_admin()
    and role::text in ('employee', 'supervisor')
  );

-- 2. Hide pin_hash from the data API ---------------------------------------
revoke select on table public.employees from anon, authenticated;
grant select (
  id, auth_user_id, name, first_name, last_name, role, active,
  initials, avatar_color, created_at
) on table public.employees to authenticated;

-- 3. Reports can only be INSERTed as pending/submitted ----------------------
drop policy if exists "reports: employee inserts own" on public.reports;
create policy "reports: employee inserts own"
  on public.reports for insert
  with check (
    employee_id = (select id from public.employees where auth_user_id = auth.uid())
    and status::text in ('pending', 'submitted')
  );
