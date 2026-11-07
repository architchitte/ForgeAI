-- Forge — server-side like aggregation
-- Target: FORGE-Development ONLY (project ref pcuympsnmojctdgdkgrq).
-- NEVER run against production (ytnqdrqhxhqrjnjdyrxt).
-- Review, then run in the Supabase SQL editor. Not applied by the app or any tooling.
--
-- Why a function (not a cached likes_count column): the project rules forbid
-- changing public.repositories. This returns ONE small row per project
-- ({ repository_id, like_count, liked_by_me }) instead of one row per like,
-- so the feed no longer downloads and counts every like on the device.
--
-- "liked_by_me" uses auth.uid() from the caller's session — there is no
-- user-id parameter, so nobody can ask on someone else's behalf.
-- SECURITY INVOKER: the existing project_likes RLS (signed-in users may read)
-- still applies. The existing UNIQUE (repository_id, user_id) index makes the
-- repository_id = ANY(...) filter + GROUP BY index-backed.
--
-- The app falls back to the previous row-counting query if this function is
-- missing, so it is safe to deploy the app before or after running this.

begin;

create or replace function public.get_project_likes_summary(p_repository_ids uuid[])
returns table (repository_id uuid, like_count bigint, liked_by_me boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.repository_id,
         count(*)                                   as like_count,
         coalesce(bool_or(l.user_id = (select auth.uid())), false) as liked_by_me
    from public.project_likes l
   where l.repository_id = any (p_repository_ids)
   group by l.repository_id;
$$;

revoke all on function public.get_project_likes_summary(uuid[]) from public, anon;
grant execute on function public.get_project_likes_summary(uuid[]) to authenticated;

commit;

-- ROLLBACK
-- drop function if exists public.get_project_likes_summary(uuid[]);
