do $$
begin
  alter table public.messages
    add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
    add column if not exists read_at timestamptz null;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'messages_recipient_id_idx'
  ) then
    create index messages_recipient_id_idx on public.messages (recipient_id);
  end if;
end $$;
