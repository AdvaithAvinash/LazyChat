-- LazyChat schema: profiles, chats, chat membership, messages, calls.
-- Run this once against a fresh Supabase project (SQL Editor, or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  about text not null default 'Hey there! I am using LazyChat.',
  expo_push_tokens text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- chats + chat_members
-- ---------------------------------------------------------------------------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct', 'group')),
  group_name text,
  group_photo text,
  created_by uuid not null references auth.users (id),
  last_message jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_members (
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  unread_count int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- SECURITY DEFINER helper so membership checks don't recurse through RLS on
-- chat_members itself (the standard Supabase pattern for join-table access).
create or replace function public.is_chat_member(p_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = p_chat_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_chat_member(uuid) to authenticated;

alter table public.chats enable row level security;
alter table public.chat_members enable row level security;

create policy "members can read their chats"
  on public.chats for select
  to authenticated
  using (public.is_chat_member(id));

create policy "authenticated users can create chats"
  on public.chats for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "members can update their chats"
  on public.chats for update
  to authenticated
  using (public.is_chat_member(id))
  with check (public.is_chat_member(id));

create policy "members can read their chat's member list"
  on public.chat_members for select
  to authenticated
  using (public.is_chat_member(chat_id));

create policy "join a chat you created, or add yourself"
  on public.chat_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.chats c where c.id = chat_id and c.created_by = auth.uid())
  );

create policy "members can update their own membership row"
  on public.chat_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.touch_chat_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger chats_set_updated_at
  before update on public.chats
  for each row
  execute function public.touch_chat_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_id uuid not null references auth.users (id),
  type text not null check (type in ('text', 'image', 'file', 'video', 'audio')),
  text text,
  media_url text,
  media_type text,
  file_name text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read')),
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index messages_chat_id_created_at_idx on public.messages (chat_id, created_at);

alter table public.messages enable row level security;

create policy "members can read messages in their chats"
  on public.messages for select
  to authenticated
  using (public.is_chat_member(chat_id));

create policy "members can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (public.is_chat_member(chat_id) and sender_id = auth.uid());

-- Update is only meant for read-receipt bookkeeping (status/read_by); there
-- is no column-level RLS in Postgres, so this is enforced by convention in
-- the client (messageService.markMessagesRead) rather than the database.
create policy "members can update messages in their chats"
  on public.messages for update
  to authenticated
  using (public.is_chat_member(chat_id))
  with check (public.is_chat_member(chat_id));

-- ---------------------------------------------------------------------------
-- calls
-- ---------------------------------------------------------------------------
-- offer/answer live on the call row itself (like a Firestore document) so a
-- callee who subscribes a moment late still sees the offer via the initial
-- SELECT, rather than missing it the way an ephemeral broadcast event would.
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users (id),
  caller_name text not null,
  callee_id uuid not null references auth.users (id),
  type text not null check (type in ('voice', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'ended', 'missed')),
  offer jsonb,
  answer jsonb,
  created_at timestamptz not null default now()
);

alter table public.calls enable row level security;

create policy "participants can read their calls"
  on public.calls for select
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "callers can create calls"
  on public.calls for insert
  to authenticated
  with check (auth.uid() = caller_id);

create policy "participants can update their calls"
  on public.calls for update
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- ICE candidates as rows (same reasoning as offer/answer above) rather than
-- broadcast events, so a late subscriber still catches earlier candidates.
create table public.call_candidates (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls (id) on delete cascade,
  sender_id uuid not null references auth.users (id),
  candidate jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.call_candidates enable row level security;

create policy "call participants can read candidates"
  on public.call_candidates for select
  to authenticated
  using (
    exists (
      select 1 from public.calls c
      where c.id = call_id and (auth.uid() = c.caller_id or auth.uid() = c.callee_id)
    )
  );

create policy "call participants can add their own candidates"
  on public.call_candidates for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.calls c
      where c.id = call_id and (auth.uid() = c.caller_id or auth.uid() = c.callee_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes on these tables to subscribed clients.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.chat_members;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.call_candidates;
