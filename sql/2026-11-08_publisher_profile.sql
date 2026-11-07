-- ForgeAI — view a project publisher's profile from the project page
-- Target: FORGE-Development ONLY (project ref pcuympsnmojctdgdkgrq).
-- NEVER run against production (ytnqdrqhxhqrjnjdyrxt).
-- Requires 2026-11-08_profile_management.sql to have been applied first.
--
-- Why a function: projects are owned by email (repositories.user_id is never
-- set), and profile_details / profile_education are owner-only. The app
-- cannot — and must not — look up auth.users to turn a project's email into
-- an account. This SECURITY DEFINER function does that lookup server-side
-- and returns ONLY public profile fields for the publisher of ONE project:
--   name, avatar path, college, city, country, bio, education.
-- It never returns the email, the account id, or anything from auth.users
-- beyond the name/university the user set themselves.
--
-- No tables, columns or existing policies are changed. public.repositories
-- is only read.

begin;

create or replace function public.get_project_publisher(repo_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email        text;
  v_student_name text;
  v_university   text;
  v_user_id      uuid;
  v_meta         jsonb;
  v_display_name text;
  v_avatar_path  text;
  v_city         text;
  v_country      text;
  v_bio          text;
  v_edu          jsonb;
begin
  -- Signed-in users only.
  if (select auth.uid()) is null then
    return null;
  end if;

  select r.student_email, r.student_name, r.university
    into v_email, v_student_name, v_university
    from public.repositories r
   where r.id = repo_id;
  if not found then
    return null;
  end if;

  select u.id, u.raw_user_meta_data
    into v_user_id, v_meta
    from auth.users u
   where lower(u.email) = lower(v_email)
   limit 1;

  -- Publisher without an account (or a deleted one): project data only.
  if v_user_id is null then
    return jsonb_build_object(
      'has_account', false,
      'display_name', nullif(btrim(coalesce(v_student_name, '')), ''),
      'avatar_path', null,
      'college', nullif(btrim(coalesce(v_university, '')), ''),
      'city', null,
      'country', null,
      'bio', null,
      'education', '[]'::jsonb
    );
  end if;

  -- Missing rows simply leave these variables null.
  select p.display_name, p.avatar_path
    into v_display_name, v_avatar_path
    from public.profiles p where p.id = v_user_id;
  select d.city, d.country, d.bio
    into v_city, v_country, v_bio
    from public.profile_details d where d.id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'degree', e.degree,
           'custom_degree', e.custom_degree,
           'specialization', e.specialization,
           'institution_name', e.institution_name,
           'start_year', e.start_year,
           'graduation_year', e.graduation_year,
           'status', e.status,
           'created_at', e.created_at
         )), '[]'::jsonb)
    into v_edu
    from public.profile_education e
   where e.user_id = v_user_id;

  return jsonb_build_object(
    'has_account', true,
    'display_name', coalesce(
      nullif(btrim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), ''),
      v_display_name,
      nullif(btrim(coalesce(v_student_name, '')), '')
    ),
    'avatar_path', v_avatar_path,
    'college', coalesce(
      nullif(btrim(coalesce(v_meta ->> 'university', '')), ''),
      nullif(btrim(coalesce(v_university, '')), '')
    ),
    'city', v_city,
    'country', v_country,
    'bio', v_bio,
    'education', v_edu
  );
end;
$$;

revoke all on function public.get_project_publisher(uuid) from public, anon;
grant execute on function public.get_project_publisher(uuid) to authenticated;

commit;

-- ROLLBACK
-- drop function if exists public.get_project_publisher(uuid);
