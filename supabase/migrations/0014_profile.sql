-- =============================================================
-- Kingdom Touch · Pro editable profile
-- =============================================================
-- Run AFTER 0002_roles.sql (needs kt_is_* helpers + employees).
-- Adds self-service profile fields and a SECURITY DEFINER RPC so a
-- user can edit ONLY their own safe fields (never role/active/pin).
-- Idempotent.
-- =============================================================

alter table public.employees add column if not exists phone      text;
alter table public.employees add column if not exists email      text;
alter table public.employees add column if not exists skills     text[] not null default '{}';
alter table public.employees add column if not exists avatar_url text;

-- === Self-service profile update (column-safe via SECURITY DEFINER) ===
-- RLS is row-level only; a plain UPDATE policy could not stop a user from
-- also changing their own role. This RPC updates only the whitelisted
-- columns on the caller's own row.
create or replace function public.update_my_profile(
  p_name       text,
  p_phone      text,
  p_email      text,
  p_skills     text[],
  p_avatar_url text
)
returns public.employees
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name   text;
  v_result public.employees;
begin
  v_name := nullif(btrim(p_name), '');

  update public.employees e
     set name       = coalesce(v_name, e.name),
         initials   = case
           when v_name is null then e.initials
           else upper(
             left(split_part(v_name, ' ', 1), 1) ||
             coalesce(left(nullif(split_part(v_name, ' ', 2), ''), 1), '')
           )
         end,
         phone      = nullif(btrim(coalesce(p_phone, '')), ''),
         email      = nullif(btrim(coalesce(p_email, '')), ''),
         skills     = coalesce(p_skills, e.skills),
         avatar_url = nullif(btrim(coalesce(p_avatar_url, '')), '')
   where e.auth_user_id = auth.uid()
   returning e.* into v_result;

  return v_result;
end;
$fn$;

grant execute on function public.update_my_profile(text, text, text, text[], text)
  to authenticated;
