-- Forge — direct messaging, phase 1: schema, RLS, RPCs, Realtime broadcast
--
-- STATUS: architecture approved 2026-11-09. NOT yet applied anywhere.
-- Decisions:
--   * Any authenticated user can start a direct conversation with another user.
--   * Deleting an account keeps the conversation history: the user's messages
--     stay with sender_id = NULL (shown as "Deleted user"), their participant
--     row is removed, and the other person can no longer reply.
-- Target: FORGE-Development ONLY (project ref pcuympsnmojctdgdkgrq).
-- NEVER run against production.
-- Requires: 2026-11-08_profile_management.sql (public.profiles.avatar_path).
-- Review, then run in the Supabase SQL editor. Not applied by the app or any tooling.
--
-- Existing application tables and policies are NOT changed. public.profiles
-- and auth.users are only READ (inside SECURITY DEFINER functions, the same
-- pattern as get_user_profile). One policy is ADDED on realtime.messages to
-- authorize private broadcast channels.
--
-- What this adds:
--  1. public.conversations              — one row per chat ('direct' now, 'group' reserved).
--  2. public.conversation_participants  — who is in a chat + per-user last_read_at.
--  3. public.messages                   — immutable messages (no edit / delete yet).
--  4. Read access: participants only (RLS). Clients get SELECT only; every write
--     goes through a SECURITY DEFINER function that checks auth.uid().
--  5. RPCs: get_or_create_direct_conversation, send_message, mark_conversation_read,
--     list_conversations, get_unread_total, search_chat_users.
--  6. After-insert trigger: updates the conversation preview and broadcasts the
--     message to each participant's private topic 'chat:user:<uid>'.
--
-- The app is unaffected until the client switches to a Supabase ChatService.

begin;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  type            text not null default 'direct' check (type in ('direct', 'group')),
  -- '<smaller uuid>:<larger uuid>' for direct chats: one chat per pair of users.
  direct_key      text unique,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  -- Denormalized preview / sort key, maintained by the messages trigger.
  last_message_id uuid,
  last_message_at timestamptz,
  constraint conversations_direct_key_matches_type
    check ((type = 'direct') = (direct_key is not null))
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  -- Messages from others newer than this are unread for this user.
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- NULL only after the sender's account is deleted (history is preserved).
  -- send_message always sets it to auth.uid().
  sender_id       uuid references auth.users (id) on delete set null,
  body            text not null
                  check (char_length(body) <= 4000
                         and char_length(btrim(body, E' \t\r\n')) >= 1),
  -- Client-generated id: makes sending idempotent (safe retries).
  client_id       text check (client_id is null or char_length(client_id) between 1 and 64),
  -- clock_timestamp(): distinct values even within one transaction.
  created_at      timestamptz not null default clock_timestamp()
);

-- Circular reference for the preview; dropping a message clears the pointer.
alter table public.conversations
  drop constraint if exists conversations_last_message_fk;
alter table public.conversations
  add constraint conversations_last_message_fk
  foreign key (last_message_id) references public.messages (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------
-- "My conversations" + the participant check used by every RLS policy.
create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id, conversation_id);

-- Keyset pagination (newest first), unread counts and previews.
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc, id desc);

-- Idempotent send: one row per (sender, client_id).
create unique index if not exists messages_sender_client_id_key
  on public.messages (sender_id, client_id)
  where client_id is not null;

-- Per-sender rate limit check in send_message.
create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at desc);

-- Inbox ordering.
create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc);

-- ---------------------------------------------------------------------------
-- 3. Participant check (SECURITY DEFINER avoids RLS recursion on
--    conversation_participants referencing itself)
-- ---------------------------------------------------------------------------
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.conversation_participants cp
     where cp.conversation_id = p_conversation_id
       and cp.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS — participants can read; nobody writes directly
-- ---------------------------------------------------------------------------
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;

create policy "Participants can view their conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_participant(id));

create policy "Participants can view conversation members"
  on public.conversation_participants for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "Participants can view messages"
  on public.messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

-- No INSERT / UPDATE / DELETE policies: all writes go through the functions
-- below. Supabase grants ALL on new public tables by default, so narrow it.
revoke all on public.conversations, public.conversation_participants, public.messages
  from anon, authenticated;
grant select on public.conversations, public.conversation_participants, public.messages
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5. After-insert trigger: preview, sender read marker, broadcast
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_user    uuid;
begin
  update public.conversations c
     set last_message_id = new.id,
         last_message_at = new.created_at
   where c.id = new.conversation_id
     and (c.last_message_at is null or new.created_at >= c.last_message_at);

  -- Your own message never counts as unread for you.
  update public.conversation_participants cp
     set last_read_at = greatest(cp.last_read_at, new.created_at)
   where cp.conversation_id = new.conversation_id
     and cp.user_id = new.sender_id;

  v_payload := jsonb_build_object(
    'id', new.id,
    'conversation_id', new.conversation_id,
    'sender_id', new.sender_id,
    'body', new.body,
    'client_id', new.client_id,
    'created_at', new.created_at
  );

  -- One private topic per user: a single channel covers the inbox, the
  -- badge and any open thread. Delivery is best effort — the row is already
  -- persisted and clients re-sync on reconnect, so a broadcast failure must
  -- never fail the insert.
  for v_user in
    select cp.user_id from public.conversation_participants cp
     where cp.conversation_id = new.conversation_id
  loop
    begin
      perform realtime.send(v_payload, 'message_created', 'chat:user:' || v_user::text, true);
    exception when others then
      raise warning 'chat broadcast failed for %: %', v_user, sqlerrm;
    end;
  end loop;

  return new;
end;
$$;

revoke all on function public.handle_new_message() from public, anon, authenticated;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- ---------------------------------------------------------------------------
-- 6. Write RPCs
-- ---------------------------------------------------------------------------

-- Existing direct chat with a user, or a new one. Clients can never insert
-- participants themselves, so nobody can join a conversation uninvited.
create or replace function public.get_or_create_direct_conversation(p_other_user uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me  uuid := (select auth.uid());
  v_key text;
  v_id  uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_other_user is null or p_other_user = v_me then
    raise exception 'Invalid recipient' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_other_user) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  v_key := least(v_me::text, p_other_user::text) || ':' || greatest(v_me::text, p_other_user::text);

  -- Concurrent calls: the loser waits on the unique key, then reads the winner's row.
  insert into public.conversations (type, direct_key, created_by)
  values ('direct', v_key, v_me)
  on conflict (direct_key) do nothing
  returning id into v_id;

  if v_id is null then
    select c.id into v_id from public.conversations c where c.direct_key = v_key;
  else
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_id, v_me), (v_id, p_other_user)
    on conflict do nothing;
  end if;

  return v_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- Send as yourself (sender_id is always auth.uid()). Idempotent on client_id:
-- a retry after a lost response returns the already-stored message.
create or replace function public.send_message(
  p_conversation_id uuid,
  p_body            text,
  p_client_id       text default null
)
returns public.messages
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me  uuid := (select auth.uid());
  v_msg public.messages;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.conversation_participants cp
     where cp.conversation_id = p_conversation_id and cp.user_id = v_me
  ) then
    raise exception 'Not a participant of this conversation' using errcode = '42501';
  end if;

  -- Direct chat whose other member deleted their account: read-only.
  if (select c.type from public.conversations c where c.id = p_conversation_id) = 'direct'
     and (select count(*) from public.conversation_participants cp
           where cp.conversation_id = p_conversation_id) < 2 then
    raise exception 'This account no longer exists' using errcode = 'P0001';
  end if;

  -- Retry of a message that was already stored.
  if p_client_id is not null then
    select m.* into v_msg from public.messages m
     where m.sender_id = v_me and m.client_id = p_client_id;
    if found then
      return v_msg;
    end if;
  end if;

  -- Basic flood protection: 30 messages per minute per sender.
  if (select count(*) from public.messages m
       where m.sender_id = v_me
         and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'You are sending messages too quickly' using errcode = 'P0001';
  end if;

  insert into public.messages (conversation_id, sender_id, body, client_id)
  values (p_conversation_id, v_me, p_body, p_client_id)
  on conflict (sender_id, client_id) where client_id is not null do nothing
  returning * into v_msg;

  if v_msg.id is null then
    select m.* into v_msg from public.messages m
     where m.sender_id = v_me and m.client_id = p_client_id;
  end if;

  return v_msg;
end;
$$;

revoke all on function public.send_message(uuid, text, text) from public, anon;
grant execute on function public.send_message(uuid, text, text) to authenticated;

-- Mark read up to the latest message (server time, not the device clock).
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.conversation_participants cp
     set last_read_at = greatest(
           cp.last_read_at,
           coalesce((select c.last_message_at from public.conversations c
                      where c.id = p_conversation_id), now()))
   where cp.conversation_id = p_conversation_id
     and cp.user_id = (select auth.uid());
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Read RPCs (shape matches the app's Conversation / ChatUser types)
--    Names/colleges come from the same sources as build_public_profile:
--    user_metadata full_name / university, falling back to profiles.display_name.
--    Never returns emails.
-- ---------------------------------------------------------------------------

-- Inbox page (newest first) or, with p_conversation_id, one conversation
-- (including a new one with no messages yet). Unread counts are capped at 100.
-- other_user_id is NULL when the other account was deleted.
create or replace function public.list_conversations(
  p_limit           integer     default 50,
  p_before          timestamptz default null,
  p_conversation_id uuid        default null
)
returns table (
  conversation_id         uuid,
  conversation_type       text,
  last_message_at         timestamptz,
  other_user_id           uuid,
  other_display_name      text,
  other_avatar_path       text,
  other_college           text,
  last_message_id         uuid,
  last_message_sender_id  uuid,
  last_message_body       text,
  last_message_client_id  text,
  last_message_created_at timestamptz,
  unread_count            integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.type,
    c.last_message_at,
    o.user_id,
    coalesce(
      nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
                            u.raw_user_meta_data ->> 'name', '')), ''),
      p.display_name),
    p.avatar_path,
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'university', '')), ''),
    m.id,
    m.sender_id,
    m.body,
    m.client_id,
    m.created_at,
    (select count(*)::integer from (
       select 1 from public.messages x
        where x.conversation_id = c.id
          and x.created_at > me.last_read_at
          and x.sender_id is distinct from me.user_id
        limit 100) unread)
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  -- LEFT JOIN: a deleted account leaves no participant row; the app then
  -- shows "Deleted user" (other_user_id is NULL).
  left join public.conversation_participants o
    on o.conversation_id = c.id and o.user_id <> me.user_id
  left join auth.users u on u.id = o.user_id
  left join public.profiles p on p.id = o.user_id
  left join public.messages m on m.id = c.last_message_id
  where me.user_id = (select auth.uid())
    and c.type = 'direct'
    and (
      (p_conversation_id is not null and c.id = p_conversation_id)
      or (p_conversation_id is null
          and c.last_message_id is not null
          and (p_before is null or c.last_message_at < p_before))
    )
  order by c.last_message_at desc nulls last, c.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.list_conversations(integer, timestamptz, uuid) from public, anon;
grant execute on function public.list_conversations(integer, timestamptz, uuid) to authenticated;

-- Header badge: total unread messages (capped at 999).
create or replace function public.get_unread_total()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from (
    select 1
      from public.conversation_participants me
      join public.messages x
        on x.conversation_id = me.conversation_id
       and x.created_at > me.last_read_at
       and x.sender_id is distinct from me.user_id
     where me.user_id = (select auth.uid())
     limit 999
  ) unread;
$$;

revoke all on function public.get_unread_total() from public, anon;
grant execute on function public.get_unread_total() to authenticated;

-- New chat: people by name or college. Requires 2+ characters (no full
-- directory listing), excludes yourself, at most 25 rows.
create or replace function public.search_chat_users(p_query text, p_limit integer default 20)
returns table (
  user_id      uuid,
  display_name text,
  avatar_path  text,
  college      text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me      uuid := (select auth.uid());
  v_q       text := btrim(coalesce(p_query, ''));
  v_pattern text;
begin
  if v_me is null or char_length(v_q) < 2 then
    return;
  end if;
  v_pattern := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select s.id, s.name, s.avatar_path, s.college
    from (
      select u.id,
             coalesce(
               nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name',
                                     u.raw_user_meta_data ->> 'name', '')), ''),
               p.display_name) as name,
             p.avatar_path,
             nullif(btrim(coalesce(u.raw_user_meta_data ->> 'university', '')), '') as college
        from auth.users u
        left join public.profiles p on p.id = u.id
       where u.id <> v_me
    ) s
   where s.name is not null
     and (s.name ilike v_pattern or s.college ilike v_pattern)
   order by s.name
   limit least(greatest(coalesce(p_limit, 20), 1), 25);
end;
$$;

revoke all on function public.search_chat_users(text, integer) from public, anon;
grant execute on function public.search_chat_users(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Realtime authorization (private broadcast channels)
--    A user may only receive on their own topic 'chat:user:<uid>'. There is no
--    INSERT policy, so clients cannot broadcast on these topics; only the
--    database trigger (realtime.send) publishes to them.
-- ---------------------------------------------------------------------------
create policy "Chat: users receive their own inbox broadcasts"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'chat:user:' || (select auth.uid())::text
  );

commit;

-- ---------------------------------------------------------------------------
-- READ-ONLY AUDIT (changes nothing) — run first to see the current state
-- ---------------------------------------------------------------------------
-- select table_name from information_schema.tables
--  where table_schema = 'public' and table_name in ('conversations','conversation_participants','messages');
-- select schemaname, tablename, policyname, cmd from pg_policies
--  where (schemaname = 'public' and tablename in ('conversations','conversation_participants','messages'))
--     or (schemaname = 'realtime' and tablename = 'messages');
-- select proname from pg_proc where proname in ('send','topic')
--   and pronamespace = 'realtime'::regnamespace;   -- realtime.send / realtime.topic must exist

-- ---------------------------------------------------------------------------
-- ROLLBACK (deletes all chat data)
-- ---------------------------------------------------------------------------
-- drop policy if exists "Chat: users receive their own inbox broadcasts" on realtime.messages;
-- drop function if exists public.search_chat_users(text, integer);
-- drop function if exists public.get_unread_total();
-- drop function if exists public.list_conversations(integer, timestamptz, uuid);
-- drop function if exists public.mark_conversation_read(uuid);
-- drop function if exists public.send_message(uuid, text, text);
-- drop function if exists public.get_or_create_direct_conversation(uuid);
-- drop trigger if exists on_message_created on public.messages;
-- drop function if exists public.handle_new_message();
-- alter table if exists public.conversations drop constraint if exists conversations_last_message_fk;
-- drop table if exists public.messages;
-- drop table if exists public.conversation_participants;
-- drop table if exists public.conversations;
-- drop function if exists public.is_conversation_participant(uuid);
