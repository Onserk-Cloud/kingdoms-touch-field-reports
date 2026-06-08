-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Login throttle (anti brute-force)
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001..0003. Safe to re-run (idempotent).
--
-- A 4-digit PIN on a public endpoint is only ~10,000 combinations, so the
-- login-with-pin Edge Function counts failed attempts per identity and per IP
-- and locks out after too many. Only the service role (the function) touches
-- this table; RLS is on with no policies so clients can never read/write it.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.login_attempts (
  subject       text primary key, -- 'emp:<id>' | 'name:<norm>' | 'ip:<addr>'
  fail_count    int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.login_attempts enable row level security;
-- Intentionally NO policies: only the service-role Edge Function uses it.
