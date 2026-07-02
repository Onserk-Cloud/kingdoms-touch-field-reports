-- 0016_profile_prefs_rpc.sql
-- Profile wave 2: let a user persist their own notification_prefs (jsonb)
-- and crew (text) — columns added in 0015 — through the self-service RPC.
-- Replaces update_my_profile with a 7-arg version; the old 5-arg overload is
-- dropped first so PostgREST named-argument resolution stays unambiguous.
-- Idempotent: safe to run more than once.

drop function if exists public.update_my_profile(text, text, text, text[], text);

create or replace function public.update_my_profile(
  p_name               text,
  p_phone              text,
  p_email              text,
  p_skills             text[],
  p_avatar_url         text,
  p_notification_prefs jsonb default null,
  p_crew               text  default null
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
         avatar_url = nullif(btrim(coalesce(p_avatar_url, '')), ''),
         notification_prefs = coalesce(p_notification_prefs, e.notification_prefs),
         crew       = nullif(btrim(coalesce(p_crew, '')), '')
   where e.auth_user_id = auth.uid()
   returning e.* into v_result;

  return v_result;
end;
$fn$;

grant execute on function public.update_my_profile(text, text, text, text[], text, jsonb, text)
  to authenticated;
