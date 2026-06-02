-- Partial composite index for the unread count query.
--
-- getVisibleUnreadMessageCountForCurrentUser and getUserConversations both run:
--   SELECT conversation_id FROM messages
--   WHERE recipient_id = $1 AND read_at IS NULL AND conversation_id IN (...)
--
-- Without this index Postgres must scan every row for a given recipient and then
-- filter by read_at IS NULL.  The partial index covers only unread rows so the
-- scan is proportional to unread messages, not total messages received.
--
-- CREATE INDEX ... IF NOT EXISTS is idempotent; safe to re-run.
-- CONCURRENTLY is not allowed inside a transaction block (Supabase migrations
-- run in a transaction), so we use the standard form.

CREATE INDEX IF NOT EXISTS messages_unread_by_recipient_idx
  ON public.messages (recipient_id, conversation_id)
  WHERE read_at IS NULL;
