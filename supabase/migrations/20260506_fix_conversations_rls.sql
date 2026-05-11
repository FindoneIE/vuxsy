alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Allow users to create conversations" on public.conversations;
drop policy if exists "Conversations can be created by participants" on public.conversations;
drop policy if exists "Conversations are readable by participants" on public.conversations;
drop policy if exists "Conversations can be updated by participants" on public.conversations;

create policy "Conversations are readable by participants"
  on public.conversations
  for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Conversations can be created by participants"
  on public.conversations
  for insert
  to authenticated
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Conversations can be updated by participants"
  on public.conversations
  for update
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

alter table public.messages enable row level security;

drop policy if exists "Messages are readable by participants" on public.messages;
drop policy if exists "Messages can be created by participants" on public.messages;
drop policy if exists "Messages can be updated by recipients" on public.messages;

create policy "Messages are readable by participants"
  on public.messages
  for select
  to authenticated
  using (
    auth.uid() = sender_id
    or auth.uid() = recipient_id
  );

create policy "Messages can be created by participants"
  on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
  );

create policy "Messages can be updated by recipients"
  on public.messages
  for update
  to authenticated
  using (
    auth.uid() = recipient_id
  )
  with check (
    auth.uid() = recipient_id
  );
