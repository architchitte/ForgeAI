-- ForgeAI — profile management: avatar, personal details, education history
-- Target: FORGE-Development ONLY (project ref pcuympsnmojctdgdkgrq).
-- NEVER run against production (ytnqdrqhxhqrjnjdyrxt).
-- Review, then run in the Supabase SQL editor. Not applied by the app or any tooling.
--
-- Does NOT touch public.repositories or any existing policy. Ownership is the
-- authenticated user id (auth.uid()); the app never reads auth.users.
--
-- Data placement (why three places):
--   public.profiles          — PUBLIC to signed-in users: display_name (already
--                              used to label comments) + avatar_path (shown to others).
--   public.profile_details   — PRIVATE to the owner: city, country, bio.
--   public.profile_education — PRIVATE to the owner: education history.
--   Full name and college stay in auth user_metadata (full_name / university):
--   that is the existing source the submit flow copies onto projects and the
--   Profile screen keeps in sync, so a second copy here would drift.
--
-- The app degrades gracefully before this is applied: the new sections show a
-- "could not load" state and saving reports an error; nothing existing breaks.

begin;

-- ---------------------------------------------------------------------------
-- 1. public.profiles (existing) — add avatar + created_at
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists created_at  timestamptz not null default now();

-- An avatar path must live in the owner's own folder: <uid>/<file>.
alter table public.profiles
  drop constraint if exists profiles_avatar_path_owner;
alter table public.profiles
  add constraint profiles_avatar_path_owner
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);

-- (Existing policies kept as is: signed-in users can read profiles; users can
--  insert/update only their own row.)

-- ---------------------------------------------------------------------------
-- 2. public.profile_details — owner-only personal information
-- ---------------------------------------------------------------------------
create table if not exists public.profile_details (
  id         uuid primary key references auth.users (id) on delete cascade,
  city       text check (city is null or char_length(btrim(city)) between 1 and 80),
  country    text check (country is null or char_length(btrim(country)) between 1 and 80),
  bio        text check (bio is null or char_length(bio) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_details enable row level security;

create policy "Users can view their own details"
  on public.profile_details for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own details"
  on public.profile_details for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own details"
  on public.profile_details for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update on public.profile_details to authenticated;

-- ---------------------------------------------------------------------------
-- 3. public.profile_education — owner-only, any number of records
-- ---------------------------------------------------------------------------
create table if not exists public.profile_education (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  degree           text not null check (degree in (
                     'B.E.', 'B.Tech', 'B.Sc', 'BCA', 'B.Arch', 'BBA', 'B.Com',
                     'M.E.', 'M.Tech', 'M.Sc', 'MCA', 'MBA', 'PhD', 'Diploma', 'Other')),
  custom_degree    text check (custom_degree is null or char_length(btrim(custom_degree)) between 1 and 60),
  specialization   text not null check (char_length(btrim(specialization)) between 1 and 80),
  institution_name text not null check (char_length(btrim(institution_name)) between 1 and 120),
  start_year       integer not null check (start_year between 1950 and 2100),
  graduation_year  integer check (graduation_year is null or graduation_year between 1950 and 2100),
  status           text not null check (status in ('pursuing', 'completed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- "Other" needs its own name; predefined degrees must not carry one.
  constraint profile_education_custom_degree
    check ((degree = 'Other') = (custom_degree is not null)),
  -- Completed needs a graduation year; pursuing may have an expected one.
  constraint profile_education_completed_year
    check (status = 'pursuing' or graduation_year is not null),
  constraint profile_education_year_order
    check (graduation_year is null or graduation_year >= start_year)
);

create index if not exists profile_education_user_id_idx
  on public.profile_education (user_id);

-- Guard against accidental duplicates (same degree, field, institution, start).
create unique index if not exists profile_education_no_duplicates
  on public.profile_education (
    user_id, degree, lower(coalesce(custom_degree, '')),
    lower(specialization), lower(institution_name), start_year
  );

alter table public.profile_education enable row level security;

create policy "Users can view their own education"
  on public.profile_education for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own education"
  on public.profile_education for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own education"
  on public.profile_education for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own education"
  on public.profile_education for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profile_education to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Profile row for every user
--    New users: trigger on sign-up. Existing users: one-time backfill.
--    Both use ON CONFLICT DO NOTHING, so existing data is never overwritten.
--    The trigger swallows its own errors so it can never block a sign-up
--    (the app also creates the row on first sign-in as a fallback).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.profiles (id, display_name)
    values (
      new.id,
      nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name',
                                 new.raw_user_meta_data ->> 'name', '')), 80), '')
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user_profile failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Backfill: create missing profile rows only (copies names, never emails).
insert into public.profiles (id, display_name)
select u.id,
       nullif(left(btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
                                  u.raw_user_meta_data ->> 'name', '')), 80), '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Storage: profile-avatars (public read, 5 MB, JPEG/PNG/WebP)
--    Path: <uid>/<unique file>. Only the owner can write under their folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Avatars: authenticated can read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'profile-avatars');

create policy "Avatars: owners can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Avatars: owners can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Avatars: owners can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- ---------------------------------------------------------------------------
-- READ-ONLY AUDIT (changes nothing) — run first to see the current state
-- ---------------------------------------------------------------------------
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles';
-- select tablename, policyname, cmd, qual, with_check from pg_policies
--  where schemaname = 'public' and tablename in ('profiles', 'profile_details', 'profile_education');
-- select policyname, cmd from pg_policies
--  where schemaname = 'storage' and tablename = 'objects' and policyname like 'Avatars:%';

-- ---------------------------------------------------------------------------
-- ROLLBACK (if needed). Empty the profile-avatars bucket first (Dashboard).
-- ---------------------------------------------------------------------------
-- drop trigger if exists on_auth_user_created_profile on auth.users;
-- drop function if exists public.handle_new_user_profile();
-- drop policy if exists "Avatars: authenticated can read" on storage.objects;
-- drop policy if exists "Avatars: owners can upload" on storage.objects;
-- drop policy if exists "Avatars: owners can update" on storage.objects;
-- drop policy if exists "Avatars: owners can delete" on storage.objects;
-- delete from storage.buckets where id = 'profile-avatars';
-- drop table if exists public.profile_education;
-- drop table if exists public.profile_details;
-- alter table public.profiles drop constraint if exists profiles_avatar_path_owner;
-- alter table public.profiles drop column if exists avatar_path, drop column if exists created_at;
