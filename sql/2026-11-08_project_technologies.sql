-- ForgeAI — multiple AI technologies per project
-- Target: FORGE-Development ONLY (project ref pcuympsnmojctdgdkgrq — confirm first).
-- Review, then run in the Supabase SQL editor. Not applied by the app or any tooling.
--
-- Why a table: repositories.framework is a single TEXT value. Storing several
-- technologies (with category + custom flag, deduplicated per project) needs
-- one row per selection. public.repositories and its RLS are NOT modified.
-- New projects still get a readable summary written to repositories.framework
-- (e.g. "LangChain, LangGraph, PyTorch +1") so legacy display keeps working.
--
-- The app degrades gracefully before this is applied: projects show their
-- framework text, and saving technologies reports an error without blocking
-- the project itself.

begin;

-- Ownership helper (same definition as in the screenshots migration; safe to
-- re-run). SECURITY INVOKER: sees only what the caller can already read.
create or replace function public.is_repository_owner(repo_id text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.repositories r
    where r.id::text = repo_id
      and lower(r.student_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

revoke all on function public.is_repository_owner(text) from public, anon;
grant execute on function public.is_repository_owner(text) to authenticated;

create table if not exists public.project_technologies (
  id              uuid primary key default gen_random_uuid(),
  repository_id   uuid not null references public.repositories (id) on delete cascade,
  technology_id   text not null,
  technology_name text not null
                  check (char_length(btrim(technology_name)) between 1 and 60),
  category        text not null
                  check (category in (
                    'machine-learning', 'deep-learning', 'llm-frameworks', 'agent-frameworks',
                    'computer-vision', 'nlp', 'generative-audio', 'training-finetuning',
                    'rag-vector', 'reinforcement-learning', 'graph-ml', 'serving-deployment',
                    'custom'
                  )),
  is_custom       boolean not null default false,
  created_at      timestamptz not null default now(),
  -- Custom entries live in the 'custom' category with id "custom:<lowercased name>";
  -- catalogue ids are lowercase slugs.
  constraint project_technologies_custom_shape check (
    (is_custom and category = 'custom'
       and technology_id = 'custom:' || lower(regexp_replace(btrim(technology_name), '\s+', ' ', 'g')))
    or (not is_custom and category <> 'custom' and technology_id ~ '^[a-z0-9][a-z0-9-]*$')
  )
);

-- No duplicate technology per project, by id and by (case-insensitive) name.
create unique index if not exists project_technologies_repo_tech_key
  on public.project_technologies (repository_id, technology_id);
create unique index if not exists project_technologies_repo_name_key
  on public.project_technologies (repository_id, lower(technology_name));
-- Feed filtering by technology across projects.
create index if not exists project_technologies_technology_id_idx
  on public.project_technologies (technology_id);

alter table public.project_technologies enable row level security;

create policy "Authenticated users can view project technologies"
  on public.project_technologies for select
  to authenticated
  using (true);

create policy "Owners can add project technologies"
  on public.project_technologies for insert
  to authenticated
  with check (public.is_repository_owner(repository_id::text));

create policy "Owners can update project technologies"
  on public.project_technologies for update
  to authenticated
  using (public.is_repository_owner(repository_id::text))
  with check (public.is_repository_owner(repository_id::text));

create policy "Owners can remove project technologies"
  on public.project_technologies for delete
  to authenticated
  using (public.is_repository_owner(repository_id::text));

grant select, insert, update, delete on public.project_technologies to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- READ-ONLY AUDIT (changes nothing)
-- ---------------------------------------------------------------------------
-- select column_name, data_type, is_nullable, character_maximum_length
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'repositories' and column_name = 'framework';
-- select framework, count(*) from public.repositories group by 1 order by 2 desc;
-- select policyname, cmd, qual, with_check from pg_policies
--  where schemaname = 'public' and tablename = 'project_technologies';

-- ---------------------------------------------------------------------------
-- ROLLBACK (if needed)
-- ---------------------------------------------------------------------------
-- drop table if exists public.project_technologies;
-- (keep public.is_repository_owner if the screenshots migration uses it)
