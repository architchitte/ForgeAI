-- Forge — comment replies, comment likes, follows
-- Target: FORGE-Development ONLY (project ref pcuympsnmojctdgdkgrq).
-- NEVER run against production (ytnqdrqhxhqrjnjdyrxt).
-- Requires: 2026-11-08_profile_management.sql and 2026-11-08_publisher_profile.sql.
-- Review, then run in the Supabase SQL editor. Not applied by the app or any tooling.
--
-- public.repositories and its policies are NOT changed (only read).
--
-- What this adds:
--  1. Replies: project_comments.parent_id (one level deep; enforced by trigger).
--     Deleting a comment deletes its replies (ON DELETE CASCADE).
--  2. comment_likes: like / unlike any comment or reply.
--  3. follows: users follow each other (no self-follow, no duplicates).
--  4. get_project_publisher now also returns the publisher's account id
--     (needed to follow them) — still never the email.
--  5. get_user_profile(user id): same public profile fields for any user,
--     plus their project ids — used to open a follower's profile.
--
-- The app degrades gracefully before this runs: no Reply / comment hearts /
-- Follow button are shown, and everything that exists keeps working.

begin;

-- ---------------------------------------------------------------------------
-- 1. Replies
-- ---------------------------------------------------------------------------
alter table public.project_comments
  add column if not exists parent_id uuid
  references public.project_comments (id) on delete cascade;

create index if not exists project_comments_parent_id_idx
  on public.project_comments (parent_id);
create index if not exists project_comments_repo_top_level_idx
  on public.project_comments (repository_id, created_at desc)
  where parent_id is null;

-- One level only, same project, and the parent can't change after posting.
create or replace function public.check_comment_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_parent uuid;
  v_parent_repo   uuid;
begin
  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
    raise exception 'A comment cannot be moved to another thread.';
  end if;
  if new.parent_id is null then
    return new;
  end if;
  select c.parent_id, c.repository_id
    into v_parent_parent, v_parent_repo
    from public.project_comments c
   where c.id = new.parent_id;
  if not found then
    raise exception 'The comment you are replying to no longer exists.';
  end if;
  if v_parent_parent is not null then
    raise exception 'Replies can only be added to top-level comments.';
  end if;
  if v_parent_repo <> new.repository_id then
    raise exception 'A reply must belong to the same project as its comment.';
  end if;
  return new;
end;
$$;

drop trigger if exists project_comments_check_parent on public.project_comments;
create trigger project_comments_check_parent
  before insert or update on public.project_comments
  for each row execute function public.check_comment_parent();

-- (Existing project_comments policies are unchanged: replies are comments,
--  so the same read / own-insert / own-edit / own-delete rules apply.)

-- ---------------------------------------------------------------------------
-- 2. Comment likes
-- ---------------------------------------------------------------------------
create table if not exists public.comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.project_comments (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comment_likes_unique unique (comment_id, user_id)
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

create policy "Authenticated users can view comment likes"
  on public.comment_likes for select
  to authenticated
  using (true);

create policy "Users can like as themselves"
  on public.comment_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own comment likes"
  on public.comment_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.comment_likes to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx
  on public.follows (following_id, created_at desc);

alter table public.follows enable row level security;

create policy "Authenticated users can view follows"
  on public.follows for select
  to authenticated
  using (true);

create policy "Users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "Users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

grant select, insert, delete on public.follows to authenticated;

-- ---------------------------------------------------------------------------
-- 4–5. Public profile functions (shared body)
--    Returns ONLY public fields. user_id is the account id (same value as
--    public.profiles.id, already visible to signed-in users) — never email.
-- ---------------------------------------------------------------------------
create or replace function public.build_public_profile(p_user_id uuid, p_meta jsonb,
                                                        p_fallback_name text,
                                                        p_fallback_college text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_avatar_path  text;
  v_city         text;
  v_country      text;
  v_bio          text;
  v_edu          jsonb;
begin
  select p.display_name, p.avatar_path into v_display_name, v_avatar_path
    from public.profiles p where p.id = p_user_id;
  select d.city, d.country, d.bio into v_city, v_country, v_bio
    from public.profile_details d where d.id = p_user_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'degree', e.degree, 'custom_degree', e.custom_degree,
           'specialization', e.specialization, 'institution_name', e.institution_name,
           'start_year', e.start_year, 'graduation_year', e.graduation_year,
           'status', e.status, 'created_at', e.created_at)), '[]'::jsonb)
    into v_edu
    from public.profile_education e where e.user_id = p_user_id;

  return jsonb_build_object(
    'has_account', true,
    'user_id', p_user_id,
    'display_name', coalesce(
      nullif(btrim(coalesce(p_meta ->> 'full_name', p_meta ->> 'name', '')), ''),
      v_display_name,
      nullif(btrim(coalesce(p_fallback_name, '')), '')),
    'avatar_path', v_avatar_path,
    'college', coalesce(
      nullif(btrim(coalesce(p_meta ->> 'university', '')), ''),
      nullif(btrim(coalesce(p_fallback_college, '')), '')),
    'city', v_city,
    'country', v_country,
    'bio', v_bio,
    'education', v_edu
  );
end;
$$;

revoke all on function public.build_public_profile(uuid, jsonb, text, text) from public, anon, authenticated;

-- Publisher of one project (now includes user_id).
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
begin
  if (select auth.uid()) is null then
    return null;
  end if;

  select r.student_email, r.student_name, r.university
    into v_email, v_student_name, v_university
    from public.repositories r where r.id = repo_id;
  if not found then
    return null;
  end if;

  select u.id, u.raw_user_meta_data into v_user_id, v_meta
    from auth.users u where lower(u.email) = lower(v_email) limit 1;

  if v_user_id is null then
    return jsonb_build_object(
      'has_account', false, 'user_id', null,
      'display_name', nullif(btrim(coalesce(v_student_name, '')), ''),
      'avatar_path', null,
      'college', nullif(btrim(coalesce(v_university, '')), ''),
      'city', null, 'country', null, 'bio', null, 'education', '[]'::jsonb);
  end if;

  return public.build_public_profile(v_user_id, v_meta, v_student_name, v_university);
end;
$$;

revoke all on function public.get_project_publisher(uuid) from public, anon;
grant execute on function public.get_project_publisher(uuid) to authenticated;

-- Any user's public profile + the ids of their projects.
create or replace function public.get_user_profile(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email   text;
  v_meta    jsonb;
  v_name    text;
  v_college text;
  v_ids     jsonb;
begin
  if (select auth.uid()) is null then
    return null;
  end if;

  select u.email, u.raw_user_meta_data into v_email, v_meta
    from auth.users u where u.id = target;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(r.id order by r.created_at desc), '[]'::jsonb),
         max(r.student_name), max(r.university)
    into v_ids, v_name, v_college
    from public.repositories r
   where lower(r.student_email) = lower(v_email);

  return public.build_public_profile(target, v_meta, v_name, v_college)
         || jsonb_build_object('project_ids', v_ids);
end;
$$;

revoke all on function public.get_user_profile(uuid) from public, anon;
grant execute on function public.get_user_profile(uuid) to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- READ-ONLY AUDIT
-- ---------------------------------------------------------------------------
-- select tablename, policyname, cmd from pg_policies
--  where schemaname = 'public' and tablename in ('project_comments','comment_likes','follows');

-- ---------------------------------------------------------------------------
-- ROLLBACK (replies are deleted with their column)
-- ---------------------------------------------------------------------------
-- drop function if exists public.get_user_profile(uuid);
-- (re-run 2026-11-08_publisher_profile.sql to restore the previous get_project_publisher)
-- drop function if exists public.build_public_profile(uuid, jsonb, text, text);
-- drop table if exists public.follows;
-- drop table if exists public.comment_likes;
-- drop trigger if exists project_comments_check_parent on public.project_comments;
-- drop function if exists public.check_comment_parent();
-- delete from public.project_comments where parent_id is not null;
-- alter table public.project_comments drop column if exists parent_id;
