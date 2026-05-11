alter table if exists public.blocked_conversations enable row level security;

drop policy if exists "Users can delete their own blocks" on public.blocked_conversations;

create policy "Users can delete their own blocks"
  on public.blocked_conversations
  for delete
  to authenticated
  using (
    blocker_user_id = auth.uid()
  );
