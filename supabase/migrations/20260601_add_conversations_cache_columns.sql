-- Add last_message, last_message_at, and updated_at to conversations.
--
-- These columns are defined in the original conversations CREATE TABLE
-- (20260424_add_conversations_messages.sql) but were never present on the
-- live database. Their absence causes:
--
--   1. getUserConversations() to fail with "column does not exist" after Fix 4,
--      returning an empty array and making the inbox show "No messages yet".
--   2. sendMessage() to silently fail its UPDATE (the UPDATE body referenced
--      columns that did not exist, so PostgREST rejected it).
--
-- This migration:
--   a) Adds the three missing columns as nullable (safe for existing rows).
--   b) Backfills updated_at = created_at for existing conversations.
--   c) Marks updated_at NOT NULL with a default so future inserts work.
--   d) Backfills last_message and last_message_at from the latest message per
--      conversation using DISTINCT ON — a single efficient pass over messages.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS is safe to re-run.

-- Step 1 — add columns (nullable so existing rows are not rejected).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message     text         null,
  ADD COLUMN IF NOT EXISTS last_message_at  timestamptz  null,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz  null;

-- Step 2 — backfill updated_at from created_at for all existing rows.
UPDATE public.conversations
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Step 3 — now that every row has a value, make updated_at NOT NULL
--           and give it a default for future inserts.
ALTER TABLE public.conversations
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- Step 4 — backfill last_message / last_message_at from the latest message per
--           conversation. DISTINCT ON (conversation_id) ordered by
--           (conversation_id, created_at DESC) yields exactly one row per
--           conversation — the most recent message — in a single scan.
--           Only updates rows whose cache is still null (safe to re-run).
WITH latest_per_conversation AS (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    content,
    created_at
  FROM   public.messages
  ORDER  BY conversation_id, created_at DESC
)
UPDATE public.conversations c
SET
  last_message    = l.content,
  last_message_at = l.created_at
FROM   latest_per_conversation l
WHERE  c.id            = l.conversation_id
  AND  c.last_message IS NULL;
