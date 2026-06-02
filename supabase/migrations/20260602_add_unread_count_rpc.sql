-- RPC: get_unread_conversation_count
--
-- PROBLEM
-- getVisibleUnreadMessageCountForCurrentUser() makes 2 round-trips:
--   1. SELECT conversation_id FROM conversation_hidden WHERE user_id = $1
--   2. SELECT conversation_id FROM messages WHERE recipient_id = $1
--        AND read_at IS NULL AND conversation_id NOT IN (hidden list)
-- It then deduplicates conversation_ids in JavaScript.
--
-- FIX
-- A single SQL function that returns COUNT(DISTINCT conversation_id).
-- The NOT EXISTS join replaces the client-side hidden-list exclusion.
-- The partial index messages_unread_by_recipient_idx (from 20260602_add_messages_unread_idx.sql)
-- makes the outer scan O(unread messages) rather than O(total received messages).
--
-- SECURITY
-- SECURITY DEFINER allows the function to bypass RLS for the inner join
-- but the hard-coded guard `p_recipient_id = auth.uid()` ensures a caller
-- can never query another user's unread count.
-- SET search_path = public prevents search-path injection attacks.

CREATE OR REPLACE FUNCTION public.get_unread_conversation_count(
  p_recipient_id          uuid,
  p_active_conversation_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT m.conversation_id)::integer
  FROM   public.messages m
  WHERE  m.recipient_id = p_recipient_id
    -- Hard security guard: callers may not inspect other users' counts.
    AND    p_recipient_id = auth.uid()
    AND    m.read_at IS NULL
    -- Exclude the currently-open conversation (already visible, badge should not count it).
    AND    (p_active_conversation_id IS NULL OR m.conversation_id <> p_active_conversation_id)
    -- Exclude conversations the user has "deleted" (hidden).
    AND    NOT EXISTS (
             SELECT 1
             FROM   public.conversation_hidden ch
             WHERE  ch.conversation_id = m.conversation_id
               AND  ch.user_id         = p_recipient_id
           )
$$;

-- Allow authenticated users to call this function.
GRANT EXECUTE ON FUNCTION public.get_unread_conversation_count(uuid, uuid) TO authenticated;
