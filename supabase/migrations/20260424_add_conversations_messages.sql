create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  last_message text null,
  last_message_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_buyer_id_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations (seller_id);
create index if not exists conversations_listing_id_idx on public.conversations (listing_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_recipient_id_idx on public.messages (recipient_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Conversations are readable by participants"
  on public.conversations
  for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Conversations can be created by participants"
  on public.conversations
  for insert
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Conversations can be updated by participants"
  on public.conversations
  for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Messages are readable by conversation members"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Messages can be inserted by sender"
  on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Messages can be marked read by recipient"
  on public.messages
  for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
