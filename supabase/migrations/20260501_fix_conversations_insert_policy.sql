alter table public.conversations enable row level security;

drop policy if exists "Allow users to create conversations" on public.conversations;
drop policy if exists "Conversations can be created by participants" on public.conversations;

create policy "Allow users to create conversations"
  on public.conversations
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and (auth.uid() = buyer_id or auth.uid() = seller_id)
  );
