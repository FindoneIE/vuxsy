// Shared presence flag so the global Header can avoid duplicating the realtime
// work that DashboardMessages already performs.
//
// Both <Header> (always mounted) and <DashboardMessages> (only on the messages
// page) subscribe a Supabase realtime channel to the SAME `messages` INSERT
// (filter `recipient_id=eq.${userId}`). When the messages page is open, an
// incoming message therefore triggers `markConversationRead` / visibility
// restore + an unread refetch in BOTH handlers (~2x DB writes, ~2-3x reads).
//
// DashboardMessages owns the richer handling (append to thread, update list,
// mark read / restore visibility) and dispatches `messages:unread-updated`,
// which the Header listens to and uses to refresh its unread badge. So while
// DashboardMessages is mounted, the Header's own INSERT handler is redundant
// and can early-return — the badge still updates via that event.
//
// Ref-counted (not a plain boolean) so it stays correct if two DashboardMessages
// instances briefly overlap (e.g. React 18 dev StrictMode double-mount, or a
// route transition that mounts the next page before unmounting the previous).

let mountedCount = 0;

/** Call on DashboardMessages mount. Returns a cleanup to call on unmount. */
export function registerMessagesPageRealtime(): () => void {
  mountedCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    mountedCount = Math.max(0, mountedCount - 1);
  };
}

/** True when a DashboardMessages instance is handling realtime INSERTs. */
export function isMessagesPageRealtimeActive(): boolean {
  return mountedCount > 0;
}
