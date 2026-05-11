create table if not exists public.conversation_blocks (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, blocker_id)
);

create index if not exists conversation_blocks_conversation_id_idx
  on public.conversation_blocks (conversation_id);
create index if not exists conversation_blocks_blocker_id_idx
  on public.conversation_blocks (blocker_id);

alter table public.conversation_blocks enable row level security;

drop policy if exists "Conversation blocks are readable by participants" on public.conversation_blocks;
create policy "Conversation blocks are readable by participants"
  on public.conversation_blocks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Conversation blocks can be inserted by participant" on public.conversation_blocks;
create policy "Conversation blocks can be inserted by participant"
  on public.conversation_blocks
  for insert
  to authenticated
  with check (
    auth.uid() = blocker_id
    and blocker_id <> blocked_user_id
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
        and (blocked_user_id = c.buyer_id or blocked_user_id = c.seller_id)
    )
  );

create table if not exists public.conversation_hidden (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index if not exists conversation_hidden_conversation_id_idx
  on public.conversation_hidden (conversation_id);
create index if not exists conversation_hidden_user_id_idx
  on public.conversation_hidden (user_id);

alter table public.conversation_hidden enable row level security;

drop policy if exists "Conversation hidden rows are readable by owner" on public.conversation_hidden;
create policy "Conversation hidden rows are readable by owner"
  on public.conversation_hidden
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Conversation hidden rows can be inserted by owner" on public.conversation_hidden;
create policy "Conversation hidden rows can be inserted by owner"
  on public.conversation_hidden
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
