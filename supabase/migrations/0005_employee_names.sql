-- ─────────────────────────────────────────────────────────────
-- Kingdom Touch · Split employee name into first_name / last_name
-- ─────────────────────────────────────────────────────────────
-- Run AFTER 0001..0004. Safe to re-run (idempotent).
--
-- We keep the existing `name` column (full name) — it drives `initials`,
-- login matching, greetings, the PDF, etc. — and ADD first_name / last_name
-- as real columns so the data is visible/usable on its own. The app writes
-- all three when creating members; `name` stays the source of truth.
-- ─────────────────────────────────────────────────────────────

alter table public.employees add column if not exists first_name text;
alter table public.employees add column if not exists last_name  text;

-- Backfill from existing full names (only where not already set).
update public.employees
set
  first_name = coalesce(first_name, nullif(split_part(name, ' ', 1), '')),
  last_name = coalesce(
    last_name,
    case
      when position(' ' in name) > 0
        then nullif(trim(substring(name from position(' ' in name) + 1)), '')
      else null
    end
  )
where first_name is null or last_name is null;
