alter table if exists public.conversation_hidden enable row level security;

drop policy if exists "Conversation hidden rows can be updated by owner" on public.conversation_hidden;
create policy "Conversation hidden rows can be updated by owner"
  on public.conversation_hidden
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Conversation hidden rows can be deleted by owner" on public.conversation_hidden;
create policy "Conversation hidden rows can be deleted by owner"
  on public.conversation_hidden
  for delete
  to authenticated
  using (auth.uid() = user_id);
