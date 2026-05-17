-- Enable Supabase Realtime (postgres_changes) for the messages and
-- conversations tables. Without this, INSERT/UPDATE events are not
-- broadcast to subscribed clients, which breaks:
--   * Header unread badge live updates
--   * Conversation list unread badge live updates
--   * Realtime chat thread updates
--
-- Idempotent: only adds each table if it is not already in the
-- supabase_realtime publication.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    execute 'alter publication supabase_realtime add table public.conversations';
  end if;
end;
$$;

-- Ensure UPDATE events include the previous row state so the client can
-- compute transitions (e.g. read_at: null -> timestamp). Default is
-- DEFAULT which already includes new row; REPLICA IDENTITY FULL ensures
-- complete payloads for filters that depend on previous values.
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
