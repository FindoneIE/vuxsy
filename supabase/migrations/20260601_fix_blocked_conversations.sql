-- Fix: ensure blocked_conversations exists with the correct schema and RLS policies.
--
-- History: migration 20260509_add_conversation_blocks_and_hidden.sql created a
-- table named conversation_blocks with column blocker_id. The live database and
-- all application code use blocked_conversations with blocker_user_id. The
-- original table never existed on the live database; the rename was applied
-- directly without a recorded migration.
--
-- A separate migration (20260509_add_blocked_conversations_delete_policy.sql)
-- added a DELETE policy for blocked_conversations, but the SELECT and INSERT
-- policies were never created for this table (they were written for the now-
-- absent conversation_blocks table). Without SELECT and INSERT policies,
-- blockConversation() silently fails and block detection in sendMessage()
-- always returns false.
--
-- This migration is idempotent: CREATE TABLE IF NOT EXISTS and DROP POLICY IF
-- EXISTS / CREATE POLICY are safe to run on both fresh and existing databases.

create table if not exists public.blocked_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, blocker_user_id)
);

create index if not exists blocked_conversations_conversation_id_idx
  on public.blocked_conversations (conversation_id);

create index if not exists blocked_conversations_blocker_user_id_idx
  on public.blocked_conversations (blocker_user_id);

alter table public.blocked_conversations enable row level security;

-- SELECT: conversation participants can see blocks on their conversations.
drop policy if exists "Conversation blocks are readable by participants" on public.blocked_conversations;
create policy "Conversation blocks are readable by participants"
  on public.blocked_conversations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- INSERT: a participant may block the other participant in their conversation.
drop policy if exists "Conversation blocks can be inserted by participant" on public.blocked_conversations;
create policy "Conversation blocks can be inserted by participant"
  on public.blocked_conversations
  for insert
  to authenticated
  with check (
    auth.uid() = blocker_user_id
    and blocker_user_id <> blocked_user_id
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
        and (blocked_user_id = c.buyer_id or blocked_user_id = c.seller_id)
    )
  );

-- DELETE: a user may remove only their own blocks.
-- Re-applied here for completeness; originally in
-- 20260509_add_blocked_conversations_delete_policy.sql.
drop policy if exists "Users can delete their own blocks" on public.blocked_conversations;
create policy "Users can delete their own blocks"
  on public.blocked_conversations
  for delete
  to authenticated
  using (
    blocker_user_id = auth.uid()
  );
