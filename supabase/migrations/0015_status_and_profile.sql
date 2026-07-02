-- 0015_status_and_profile.sql
-- Wave 1 UI foundation: expand the case lifecycle and add profile fields.
--   * cases.status gains 'in_review' and 'approved'
--   * cases.est_time (free-text estimate of time on task)
--   * employees.notification_prefs (jsonb) + employees.crew (text)
-- Idempotent: safe to run more than once. DO NOT edit already-applied
-- migrations; this file is additive.

-- ── Case status CHECK: drop & recreate with the new lifecycle values ──
alter table public.cases drop constraint if exists cases_status_check;
alter table public.cases
  add constraint cases_status_check
  check (
    status in (
      'available',
      'assigned',
      'in_progress',
      'submitted',
      'in_review',
      'needs_changes',
      'approved',
      'closed'
    )
  );

-- ── New columns ──
alter table public.cases
  add column if not exists est_time text;

alter table public.employees
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

alter table public.employees
  add column if not exists crew text;
