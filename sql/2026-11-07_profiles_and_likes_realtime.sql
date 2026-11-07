-- ForgeAI — public profiles + realtime likes
-- Target: FORGE-Development ONLY. Review, then run in the Supabase SQL editor.
-- Not applied automatically by the app or by any tooling.
--
-- The app keeps working before this is applied: commenters fall back to
-- "Community member" and like counts refresh on revisit / foreground.

begin;

-- ---------------------------------------------------------------------------
-- 1. public.profiles — public display name per user (no email, no auth data)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null or char_length(btrim(display_name)) between 1 and 80
  ),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Signed-in users can read display names (needed to label comments).
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can create / change only their own row. No delete policy: rows go
-- away with the auth user via ON DELETE CASCADE.
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Realtime for likes — broadcast project_likes inserts/deletes.
--    Realtime applies the existing SELECT policy (authenticated only).
--    The app only uses events as a "something changed" signal and re-reads
--    counts, so REPLICA IDENTITY FULL is not needed.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.project_likes;

commit;

-- ---------------------------------------------------------------------------
-- OPTIONAL backfill (run separately, after the above): gives existing users a
-- display name from their auth metadata so their past comments are labelled
-- before they next open the app. Server-side only; copies names, never emails.
-- ---------------------------------------------------------------------------
-- insert into public.profiles (id, display_name)
-- select u.id,
--        nullif(left(btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
--                                   u.raw_user_meta_data ->> 'name', '')), 80), '')
-- from auth.users u
-- on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ROLLBACK (if needed)
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime drop table public.project_likes;
-- drop table if exists public.profiles;
