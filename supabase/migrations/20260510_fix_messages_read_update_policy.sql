alter table public.messages enable row level security;

-- Normalize message update policies so recipient read updates are consistently allowed.
drop policy if exists "Messages can be marked read by recipient" on public.messages;
drop policy if exists "Messages can be updated by recipients" on public.messages;
drop policy if exists "Messages read_at can be updated by recipient" on public.messages;

create policy "Messages read_at can be updated by recipient"
  on public.messages
  for update
  to authenticated
  using (
    auth.uid() = recipient_id
  )
  with check (
    auth.uid() = recipient_id
  );

-- Ensure authenticated users can update read_at column when RLS policy permits.
grant update (read_at) on table public.messages to authenticated;
