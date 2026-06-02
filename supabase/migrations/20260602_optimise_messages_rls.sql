-- Optimise messages RLS policies.
--
-- PROBLEM
-- The current SELECT policy uses a correlated EXISTS subquery against the
-- conversations table for every row scanned:
--
--   EXISTS (SELECT 1 FROM conversations c
--           WHERE c.id = conversation_id
--             AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()))
--
-- This subquery runs once per message row, turning a 200-message thread into
-- 200 implicit joins.  It also prevents the query planner from using the
-- partial index added in 20260602_add_messages_unread_idx.sql.
--
-- FIX
-- The messages table already carries both participants directly:
--   sender_id    — the message author       (validated by INSERT policy)
--   recipient_id — the other participant    (needs validation — see below)
--
-- A simpler, index-friendly SELECT policy:
--   auth.uid() = sender_id OR auth.uid() = recipient_id
--
-- SECURITY PREREQUISITE
-- The original INSERT policy does NOT verify that recipient_id equals the
-- actual other participant in the conversation.  A malicious client could
-- bypass the server action and INSERT a message with an arbitrary recipient_id,
-- letting that third party read the message via the new SELECT policy.
--
-- To close this gap we tighten the INSERT policy to require:
--   The conversation has exactly two participants (buyer and seller).
--   recipient_id must be whichever of the two is NOT the sender.
--
-- This makes recipient_id a DB-enforced invariant, so the simplified SELECT
-- is provably equivalent to the original conversation-join check.
--
-- Only messages in this database are affected; no existing data changes.

-- ── 1. Replace the SELECT policy ────────────────────────────────────────────

DROP POLICY IF EXISTS "Messages are readable by conversation members" ON public.messages;

CREATE POLICY "Messages are readable by participant"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ── 2. Replace the INSERT policy (strengthen recipient_id validation) ────────

DROP POLICY IF EXISTS "Messages can be inserted by sender" ON public.messages;

CREATE POLICY "Messages can be inserted by sender"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          -- Sender is buyer → recipient must be seller
          (c.buyer_id  = auth.uid() AND c.seller_id = recipient_id)
          OR
          -- Sender is seller → recipient must be buyer
          (c.seller_id = auth.uid() AND c.buyer_id  = recipient_id)
        )
    )
  );
