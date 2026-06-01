# Findone / Vuxsy — Next Steps & Action Plan

> Synthesised from PROJECT_AUDIT.md  
> Date: 2026-06-01  
> Goal: reach Facebook Marketplace quality

---

## Production Readiness Score: 54 / 100

### Score Breakdown

| Area | Score | Max | Verdict |
|---|---|---|---|
| Architecture & code quality | 14 | 20 | Solid foundation, App Router well-used |
| Security | 7 | 20 | Critical gaps: CAPTCHA stub, unprotected admin, broken blocking |
| Performance & queries | 8 | 20 | Fatal unbounded query, missing indexes, 3+ round-trips per page |
| Chat system | 8 | 15 | Real-time works but has data bugs and no real typing presence |
| Mobile UX | 9 | 15 | Functional but fragile; no bottom nav, keyboard conflicts |
| Testing & observability | 0 | 10 | No tests, no structured logs, no monitoring |
| **Total** | **46** | **100** | |
| Scaling bonus (good DB schema, RLS, Supabase Realtime) | +8 | — | |
| **Final** | **54** | **100** | |

### What's Working Well
- SSR-first auth eliminates the blank-page flash (a genuinely hard problem, solved correctly)
- Cookie-based sessions + PKCE OAuth — correct and secure
- RLS on every table — solid security floor
- WebP image pipeline with two size variants — production-quality
- `conversation_hidden` soft-delete model is clean
- Email notification debounce table is well-designed
- Database schema is coherent and well-normalised for the current feature set

### What's Holding the Score Back
- CAPTCHA endpoint returns plain text — bots can create unlimited listings right now
- Blocking feature may be entirely broken (table name mismatch)
- Admin dashboard has zero server-side access control
- Inbox load queries all messages ever sent — will time out as the platform grows
- Zero automated tests, zero structured logging, zero error monitoring
- Gmail SMTP hits its daily limit at ~500 users sending messages

---

## 1. Top 20 Critical Issues

Ranked by severity × likelihood of user impact.

| # | Issue | Severity | Impact if unfixed |
|---|---|---|---|
| 1 | **CAPTCHA stub** — `POST /api/turnstile/verify` returns `'turnstile verify'` and does nothing | CRITICAL | Bots flood platform with spam listings within days of launch |
| 2 | **Inbox fatal query** — `getUserConversations` fetches ALL messages with no LIMIT | CRITICAL | Inbox load times out for any active user; platform becomes unusable |
| 3 | **Blocking table mismatch** — code queries `blocked_conversations`, migration creates `conversation_blocks` | CRITICAL | Block/unblock feature is broken on production; users cannot protect themselves |
| 4 | **Admin route unprotected** — `/dashboard/admin` has no server-side auth gate | HIGH | Any logged-in user can access moderation tools by navigating directly |
| 5 | **`promoteListing` runs from browser** — no server-side validation of payload | HIGH | Any user can set `promotion_weight=9999`, `promotion_source='paid'` via direct API call |
| 6 | **PII leaking to production logs** — `console.info("TEMP LOG: fetched profile row", data)` | HIGH | Email, phone, VAT numbers logged in plain text; GDPR violation |
| 7 | **Diagnostics endpoints are public** — `/api/diagnostics/runtime-logs` and `test-message-email` have no auth | HIGH | Internal logs and email sending exposed to anyone |
| 8 | **No rate limiting** — upload route can be abused for image-processing DoS | HIGH | Attacker sends 100 concurrent large image uploads; Vercel function budget exhausted |
| 9 | **Gmail SMTP** — rate-limited to ~500 emails/day | HIGH | Notification emails silently fail beyond ~500 active users |
| 10 | **`markConversationRead` makes 3 DB queries** — before/after diagnostic fetches remain in production | MEDIUM | 3 round-trips per conversation open; 2 are pure debug overhead |
| 11 | **Double `auth.getUser()` in `markConversationRead`** | MEDIUM | Redundant auth round-trip on every message read |
| 12 | **`select("*")` on all listing queries** — ships `description`, promotion internals, JSONB seller to every list view | MEDIUM | Unnecessary network + DB memory on every feed page |
| 13 | **Category slug lookup on every request, uncached** | MEDIUM | Extra DB round-trip on every category page load |
| 14 | **`SavedListingsProvider` fetches all saved IDs with `cache: 'no-store'`** | MEDIUM | Uncached API hit on every client navigation |
| 15 | **Typing indicator is purely local** — other party never sees it | MEDIUM | Feature looks broken; users think it shows recipient typing when it shows their own |
| 16 | **Optimistic conversation insert uses empty `buyerId`/`sellerId`** | MEDIUM | Corrupted conversation row appears in list when a new message arrives to a conversation not yet loaded |
| 17 | **Personal developer email hardcoded in migration** — `emartinsbox@gmail.com` | MEDIUM | Email is permanently in migration history; visible to anyone with DB access |
| 18 | **Inbox conversation list has no pagination** — all conversations rendered at once | MEDIUM | Performance degrades linearly with conversation count |
| 19 | **Image MIME type validated from `file.type`** — client-controlled, not sniffed | MEDIUM | Attacker uploads a `.php` file disguised as `.jpg` |
| 20 | **No CSP headers** — no Content-Security-Policy configured | MEDIUM | XSS attack surface is fully open if any dependency is compromised |

---

## 2. Performance Bottlenecks

### Tier 1 — Will cause production outages

**B1 — Unbounded inbox query** (`actions.ts:474–488`)
- Current: fetches every message ever sent across all conversations ordered by date
- At 50 conversations × 200 messages = 10,000 rows per inbox load
- At 50 conversations × 2,000 messages = 100,000 rows; query will time out
- Fix: `DISTINCT ON` Postgres RPC (SQL provided in audit) or `.limit(1)` per conversation

**B2 — Missing composite indexes on `listings`**
- Main feed query uses `status`, `listing_type`, `created_at` but there is no composite index
- Postgres performs a sequential scan on the full `listings` table for every page load
- Fix: 4 indexes (see Section 5 below) — 10–50× query speedup

### Tier 2 — Causes slow pages today

**B3 — Three sequential DB queries per listing page load**
- Query 1: fetch listings (`select *`)
- Query 2: fetch saved listing IDs for current user
- Query 3: fetch images for all listing IDs
- These should be parallelised (Promise.all) and Query 1 should use column projection

**B4 — Category slug → UUID lookup on every request**
- An extra DB round-trip on every `/services/cleaning`, `/marketplace/electronics` etc. page load
- `categorySlugMap.ts` already exists — wire it up in-process instead of querying the DB

**B5 — `markConversationRead` — 2 unnecessary queries**
- Lines 1022–1037: `beforeRows` select
- Lines 1063–1079: `afterRows` select
- These exist purely for `console.log` diagnostics — delete them

**B6 — `SavedListingsProvider` bypasses cache**
- `fetch("/api/saved", { cache: "no-store" })` runs on every page navigation
- Should use `staleWhileRevalidate` or short-lived session cache

**B7 — Unread badge query: 2 unindexed scans**
- `getVisibleUnreadMessageCountForCurrentUser` runs on every header render
- Fetches all hidden conversation IDs, then separately fetches all unread messages
- Should be a single SQL query; needs `messages_unread_recipient_idx` index

**B8 — Sharp transforms block the serverless thread**
- Large image upload → sync 1800px WebP + 600px WebP → blocks thread
- On Vercel, this competes with other concurrent requests for the same function instance
- Fix: accept the upload, store raw, process asynchronously

### Tier 3 — Bundle / frontend

- Two Phosphor icon packages installed (`phosphor-react` v1 + `@phosphor-icons/react` v2): consolidate to v2
- `radix-ui` top-level package alongside shadcn individual imports: potential duplicate tree-shaking failure
- Gallery carousel has no lazy-loading for off-screen images

---

## 3. Chat System Weaknesses

### Broken / Wrong Behaviour

| # | Issue | Root cause |
|---|---|---|
| C1 | **Block/unblock does nothing** (likely) | Code queries `blocked_conversations`; migration created `conversation_blocks` |
| C2 | **Typing indicator shows sender's own typing, not recipient's** | `isTyping` state is purely local; no broadcast mechanism |
| C3 | **New conversation from Realtime has empty buyer/seller IDs** | Optimistic fallback row hard-codes `buyerId: ""`, `sellerId: ""` |
| C4 | **Email sent every message even when user is active** | `MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS=0` in env disables read-window check |

### Missing Features (vs Facebook Marketplace)

| Feature | Status |
|---|---|
| Typing presence ("X is typing...") | Not implemented — indicator is local-only |
| Online/offline presence indicator | `OnlineDot.tsx` exists but has no live data source |
| Message delivery receipts (sent / delivered / read) | `read_at` exists in DB but not surfaced in UI as ticks/checkmarks |
| Push notifications (mobile) | Not implemented; only email notifications |
| Image/file sending in chat | Not implemented; text-only |
| Emoji reactions | Not implemented |
| Message search | Not implemented |
| Conversation pagination | All messages loaded at once on thread open |
| Multi-select bulk delete actually parallelised | Sequential `for` loop — slow for many conversations |

### Architecture Concerns

- Email notification fires in a `void` async block with no timeout, retry, or failure tracking. Silent failures are invisible.
- The Supabase Realtime subscription fires `loadConversations()` (full re-fetch) when a message arrives for an unknown conversation — should fetch only the new conversation row.
- `REPLICA IDENTITY FULL` on `messages` and `conversations` increases Postgres WAL write amplification — monitor replication lag under load.

---

## 4. Security Issues

### Critical (fix before any marketing / public launch)

**S1 — CAPTCHA is a stub**
```ts
// api/turnstile/verify/route.ts — current code
export async function POST() {
  return new Response('turnstile verify')  // does nothing
}
```
Fix: implement actual Cloudflare Turnstile verification using `TURNSTILE_SECRET_KEY` env var.

**S2 — Admin route has no server-side protection**
```ts
// middleware.ts only protects /dashboard, /messages, /publish
// /dashboard/admin is guarded only by a client-side profile.role check
```
Fix: add `/dashboard/admin` to `PROTECTED_PREFIXES` in middleware AND add a server-side RSC role check.

**S3 — Blocking may be entirely non-functional**
- Migration: `CREATE TABLE public.conversation_blocks`
- Code: `supabase.from("blocked_conversations")`
- Verify on live DB: `SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%block%'`
- Fix: add a migration renaming the table OR update all code references

**S4 — `promoteListing` runs from the browser client**
```ts
// promoteListing.ts — called from browser
const { error } = await supabase.from("listings").update(payload).eq("id", id)
// payload includes promotion_weight, promotion_tier, promotion_source
// a user can set these to anything via direct Supabase API call
```
Fix: move `promoteListing` to a Server Action; validate and sanitise all promotion fields server-side.

### High (fix within first week of launch)

**S5 — PII leak in production logs**
```ts
// AuthProvider.tsx:195 — remove this line
console.info("TEMP LOG: fetched profile row", data);
```

**S6 — Diagnostics endpoints are public**
Add `requireAdmin()` guard to both `/api/diagnostics/*` routes.

**S7 — No rate limiting**
Add Upstash Redis or Vercel's built-in rate limiting middleware to:
- `POST /api/uploads/listing` — max 10 per minute per user
- `POST /api/uploads/avatar` — max 5 per minute per user
- `POST /api/report-listing` — max 5 per hour per user
- All auth endpoints

**S8 — Image MIME type from browser**
```ts
// imageValidation.ts — currently trusts file.type
// Add: use 'file-type' package to sniff magic bytes from buffer
import { fileTypeFromBuffer } from 'file-type';
const detected = await fileTypeFromBuffer(buffer);
if (!['image/jpeg','image/png','image/webp'].includes(detected?.mime ?? '')) {
  return { valid: false, error: 'Invalid file type' };
}
```

### Medium

**S9 — CSP headers** — add `Content-Security-Policy` via `next.config.ts` headers()

**S10 — Admin email in client JS** — move `ADMIN_EMAIL` to an env var read server-side only

**S11 — Replace Gmail SMTP** — Gmail rate-limits at 500/day; switch to Resend or Postmark (free tiers cover early growth, automatic SPF/DKIM, bounce handling)

---

## 5. Database Issues

### Missing Indexes (add immediately — zero risk, zero downtime with CONCURRENTLY)

```sql
-- 1. Main listing feed (every /services, /marketplace, /requests page)
CREATE INDEX CONCURRENTLY listings_feed_idx
  ON public.listings (listing_type, status, created_at DESC)
  WHERE status = 'active';

-- 2. Category pages (most common page type)
CREATE INDEX CONCURRENTLY listings_category_type_idx
  ON public.listings (category_id, listing_type, status, created_at DESC)
  WHERE status = 'active';

-- 3. Promoted carousel (homepage + every category page)
CREATE INDEX CONCURRENTLY listings_promoted_idx
  ON public.listings (status, promoted_until DESC, promotion_weight DESC)
  WHERE status = 'active';

-- 4. Dashboard — owner's own listings
CREATE INDEX CONCURRENTLY listings_owner_idx
  ON public.listings (user_id, status, created_at DESC);

-- 5. Unread badge (runs on every header render)
CREATE INDEX CONCURRENTLY messages_unread_recipient_idx
  ON public.messages (recipient_id, read_at)
  WHERE read_at IS NULL;

-- 6. Latest message per conversation (inbox preview)
CREATE INDEX CONCURRENTLY messages_conversation_latest_idx
  ON public.messages (conversation_id, created_at DESC);
```

### Schema Issues

**D1 — `select("*")` throughout listing queries**
Every `getListings` / `getPromotedListings` call fetches `description` (free-text, can be 2000+ chars), `seller` JSONB, and all promotion internals for every listing in the list view. Replace with explicit column projections.

**D2 — `last_message` / `last_message_at` updated by application code**
The conversation cache fields are written inside `sendMessage`. Under concurrent sends, the second write can overwrite the first because there is no lock. Move to a Postgres trigger:
```sql
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = NEW.content,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_after_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
```

**D3 — `conversation_blocks` vs `blocked_conversations` divergence**
Confirm which table exists on live DB. Add a migration to reconcile.

**D4 — `listing_images` has overlapping column definitions**
The migration creates `storage_path`, `storage_path_600`, and `storage_path_1800` — but the backfill migration consolidates to `storage_path`. Code still queries `storage_path_600` and `storage_path_1800`. Consolidate to a single canonical path column with the variant suffix baked into the filename convention.

**D5 — `profiles` has three name columns** (`display_name`, `full_name`, `name`)
A `resolveDisplayNameValue()` function cascades through all three. This is fragile. Consolidate to one `display_name` column and one `avatar_url` migration.

**D6 — No full-text search**
The platform has no search beyond equality filters (category, county). Add at minimum a `pg_trgm` GIN index on `listings.title`:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY listings_title_trgm_idx
  ON public.listings USING gin (title gin_trgm_ops)
  WHERE status = 'active';
```
This enables `ILIKE '%query%'` queries to use the index and powers a basic search bar.

---

## 6. Scalability Limits

### Current Hard Limits

| Limit | Threshold | What breaks |
|---|---|---|
| Inbox query (unbounded messages) | ~500 messages across conversations | Query timeout; inbox won't load |
| Gmail SMTP | ~500 emails/day | Notification emails silently dropped |
| Supabase free tier Realtime | 200 concurrent connections | Real-time chat stops working |
| Sharp sync image processing | ~10 concurrent large uploads | Vercel function timeout / OOM |
| No DB connection pooling | ~20 concurrent requests | `too many connections` Postgres error |
| Conversations list (no pagination) | ~100+ conversations | UI renders all at once; browser lag |

### Growth Curve

```
Current → 10k users:    Fix indexes + unbounded query + CAPTCHA → can support
10k  → 100k users:     + Redis cache + async image queue + transactional email + pooling
100k → 1M users:       + Read replicas + Elasticsearch + Realtime swap to Ably/Pusher
1M   → 10M users:      Microservices split (Listings, Messaging, Media, Notifications)
```

### Supabase-Specific Limits
- **Realtime**: Supabase Realtime uses Postgres WAL; not designed for >10,000 concurrent subscribers per project. At 100k active users with chat open, this becomes a bottleneck.
- **Storage RLS**: every image URL is a signed URL generated per-request. At scale, bulk image loading generates N signing calls. Use public bucket with CDN prefix instead.
- **Connection pooling**: Supabase provides PgBouncer (transaction mode) — ensure it is enabled in project settings. Without it, each Vercel serverless function invocation holds a Postgres connection.

---

## 7. Facebook Marketplace Quality — Exact Action Plan

Facebook Marketplace quality means: fast feeds, real messaging, spam-free listings, trustworthy users, works perfectly on mobile.

Organised into sprints. Each sprint is independently shippable.

---

### Sprint 1 — Stop the Bleeding (3–5 days)
*Fix the issues that actively harm users or expose the platform to abuse.*

**1.1 — Fix blocking (1 hour)**
```sql
-- Run on live DB, check which table exists:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%block%';

-- If 'conversation_blocks' exists, rename to match app code:
ALTER TABLE public.conversation_blocks RENAME TO blocked_conversations;

-- Or add a migration creating the correct table if neither exists.
```

**1.2 — Remove PII log leak (15 minutes)**
In [AuthProvider.tsx:195](src/components/auth/AuthProvider.tsx#L195):
```ts
// DELETE this line:
console.info("TEMP LOG: fetched profile row", data);
```

**1.3 — Remove diagnostic queries from `markConversationRead` (30 minutes)**
In [actions.ts](src/lib/messages/actions.ts), delete the `beforeRows` fetch (lines 1022–1037), the `afterRows` fetch (lines 1063–1079), and all associated `console.log` calls. Simplify the function to: check user, update `read_at`, return affected count via `data.length`.

**1.4 — Add the 6 missing database indexes (15 minutes)**
Create migration file `supabase/migrations/20260601_add_missing_indexes.sql` with the 6 SQL statements from Section 5. Run on prod: `supabase db push`.

**1.5 — Gate `/dashboard/admin` server-side (1 hour)**
Add to [middleware.ts](middleware.ts):
```ts
const ADMIN_PREFIXES = ['/dashboard/admin'];
const isAdminRoute = ADMIN_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
if (isAdminRoute) {
  // Re-use the already-fetched user, then fetch profile.role
  // If role !== 'admin', redirect to /dashboard
}
```
Or add a server-side check at the top of the `/dashboard/admin` page component.

**1.6 — Gate diagnostics endpoints (30 minutes)**
Add `requireAdmin()` to both `/api/diagnostics/*` routes. These should return 401 for any non-admin request.

**1.7 — Fix inbox query: add DISTINCT ON RPC (2–3 hours)**
Create Supabase RPC:
```sql
CREATE OR REPLACE FUNCTION get_latest_messages_for_conversations(
  conversation_ids uuid[]
) RETURNS TABLE (conversation_id uuid, content text, created_at timestamptz)
SECURITY DEFINER
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id, m.content, m.created_at
  FROM public.messages m
  WHERE m.conversation_id = ANY(conversation_ids)
  ORDER BY m.conversation_id, m.created_at DESC;
$$;
```
Replace the unbounded query in `getUserConversations` (`actions.ts:474`) with `supabase.rpc('get_latest_messages_for_conversations', { conversation_ids: conversationIds })`.

---

### Sprint 2 — Security & Stability (3–5 days)
*Protect users and prevent abuse.*

**2.1 — Implement Turnstile CAPTCHA**
- Add `TURNSTILE_SECRET_KEY` to environment
- Replace the stub in `api/turnstile/verify/route.ts` with actual verification:
```ts
const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
  method: 'POST',
  body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token }),
});
const data = await response.json();
return NextResponse.json({ success: data.success });
```
- Wire the listing creation and signup forms to call this endpoint before submit

**2.2 — Move `promoteListing` to a Server Action**
- Create `src/lib/listings/promoteListingAction.ts` as a `"use server"` function
- Validate that `user.id === listing.user_id` server-side
- Hard-code `promotion_source: 'free'`, `promotion_tier: 'standard'`, `promotion_weight: 1`
- Move cooldown enforcement server-side (it currently runs client-side only)

**2.3 — Replace Gmail SMTP with Resend**
- Sign up at resend.com (free tier: 3,000 emails/month)
- Add `RESEND_API_KEY` to environment
- Replace `nodemailer` in `sendMessageNotificationEmail.ts` with Resend SDK
- Configure SPF/DKIM for `@vuxsy.ie` domain

**2.4 — Add rate limiting to upload and report endpoints**
Use Vercel's built-in `@vercel/kv` or Upstash Redis:
```ts
// In the upload route handler
const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
const key = `upload:${userId}:${new Date().toISOString().slice(0, 13)}`; // hourly bucket
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 3600);
if (count > 10) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
```

**2.5 — Add MIME type buffer sniffing**
```ts
import { fileTypeFromBuffer } from 'file-type'; // add package
const detected = await fileTypeFromBuffer(buffer.slice(0, 4100));
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
if (!detected || !allowed.includes(detected.mime)) {
  return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
}
```

**2.6 — Add CSP headers**
In `next.config.ts`:
```ts
headers: async () => [{
  source: '/(.*)',
  headers: [{
    key: 'Content-Security-Policy',
    value: "default-src 'self'; img-src 'self' https://*.supabase.co data:; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
  }]
}]
```

---

### Sprint 3 — Performance (3–5 days)
*Make every page feel instant.*

**3.1 — Column projection on all listing queries**
Replace `select("*")` in `getListings.ts` and `getPromotedListings.ts`:
```ts
const CARD_COLUMNS = "id, title, price, city, county, area, category_id, listing_type, status, created_at, seller, allow_messages, promoted_until, promotion_status, sellerType";
let query = supabase.from("listings").select(CARD_COLUMNS);
```

**3.2 — Cache category slug lookups**
```ts
// In getListings.ts and getPromotedListings.ts
import { unstable_cache } from 'next/cache';

const getCategoryIdBySlug = unstable_cache(
  async (slug: string) => {
    const { data } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    return data?.id ?? null;
  },
  ['category-slug'],
  { revalidate: 3600 }
);
```

**3.3 — Parallelise listing query and image/saved queries**
In `getListings.ts`, fetch listings, images, and saved IDs concurrently:
```ts
const [{ data }, { data: imageRows }, { data: savedRows }] = await Promise.all([
  listingsQuery,
  imagesQuery,
  savedQuery,
]);
```

**3.4 — Cache `SavedListingsProvider` with stale-while-revalidate**
Replace `cache: 'no-store'` with short-lived session storage read on mount, background refresh:
```ts
const response = await fetch("/api/saved", {
  next: { revalidate: 30 }, // or use SWR pattern
});
```

**3.5 — Batch unread count into a single query**
Replace two-query pattern in `getVisibleUnreadMessageCountForCurrentUser` with:
```sql
CREATE OR REPLACE FUNCTION get_visible_unread_count(
  p_user_id uuid,
  p_exclude_conversation_id uuid DEFAULT NULL
) RETURNS int LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(DISTINCT m.conversation_id)::int
  FROM public.messages m
  WHERE m.recipient_id = p_user_id
    AND m.read_at IS NULL
    AND m.sender_id <> p_user_id
    AND (p_exclude_conversation_id IS NULL OR m.conversation_id <> p_exclude_conversation_id)
    AND m.conversation_id NOT IN (
      SELECT ch.conversation_id FROM public.conversation_hidden ch WHERE ch.user_id = p_user_id
    );
$$;
```

**3.6 — Move image processing to async**
On upload: store the raw file immediately, return a temporary URL. Process WebP variants via a Supabase Edge Function triggered by the Storage `INSERT` event. Update `listing_images.storage_path_600` and `storage_path_1800` once processing completes. Show a "processing" placeholder in the UI until paths are populated.

---

### Sprint 4 — Chat Quality (5–7 days)
*Make messaging feel like WhatsApp, not email.*

**4.1 — Fix typing presence (real broadcast)**
Use a Supabase Realtime Presence channel:
```ts
const presenceChannel = supabase.channel(`typing-${conversationId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    const others = Object.values(state).flat().filter(p => p.userId !== user.id);
    setOtherTyping(others.some(p => p.isTyping));
  });

// When user types:
await presenceChannel.track({ userId: user.id, isTyping: true });
// When user stops:
await presenceChannel.track({ userId: user.id, isTyping: false });
```

**4.2 — Show message delivery state (sent / read)**
- After `sendMessage` succeeds: show single checkmark (sent)
- When the recipient opens the conversation (Realtime UPDATE on `messages.read_at`): show double checkmark (read)
- Style: single grey tick → double blue tick (WhatsApp pattern)

**4.3 — Fix optimistic conversation row**
In `handleIncomingMessage`, when conversation is not in local list:
```ts
// Don't push a stub row — call loadConversations() directly
await restoreConversationVisibilityForCurrentUser(message.conversationId);
const fresh = await getUserConversations();
setConversations(sortConversations(fresh));
```

**4.4 — Paginate conversation messages**
Load the last 50 messages on open. Load older messages when user scrolls to top:
```ts
// Initial load
.select("id, conversation_id, sender_id, recipient_id, content, read_at, created_at")
.eq("conversation_id", conversationId)
.order("created_at", { ascending: false })
.limit(50)
// Then reverse for display
```

**4.5 — Fix `MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS`**
Change `.env.local` to `MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS=90` (the default in code). The current value of `0` sends an email check on every single message regardless of whether the user is actively in the conversation.

**4.6 — Add `last_message` trigger (replace application-level cache update)**
Create the Postgres trigger from Section 5 (D2). Remove the `await supabase.from("conversations").update(...)` call from `sendMessage` — the trigger handles it atomically and race-condition-free.

**4.7 — Parallelise bulk conversation delete**
```ts
// Replace sequential for loop in handleRemoveSelected:
const results = await Promise.allSettled(
  selectedIds.map(id => deleteConversationForCurrentUser(id))
);
```

**4.8 — Wire up `OnlineDot`**
Use Supabase Realtime Presence to track online status:
```ts
const globalPresence = supabase.channel('online-users')
  .on('presence', { event: 'sync' }, () => {
    const online = new Set(Object.keys(globalPresence.presenceState()));
    setOnlineUsers(online);
  });
await globalPresence.track({ userId: user.id });
```

---

### Sprint 5 — Mobile UX (3–5 days)
*Make it feel native on iPhone.*

**5.1 — Fix iOS keyboard / composer conflict**
Replace `fixed bottom-0` composer with CSS `env(keyboard-inset-height)` using the [Visual Viewport API](https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API):
```ts
useEffect(() => {
  const onResize = () => {
    const vp = window.visualViewport;
    if (!vp) return;
    const offset = window.innerHeight - vp.height - vp.offsetTop;
    setKeyboardOffset(offset);
  };
  window.visualViewport?.addEventListener('resize', onResize);
  return () => window.visualViewport?.removeEventListener('resize', onResize);
}, []);
```

**5.2 — Add bottom tab navigation for mobile**
Facebook Marketplace uses a persistent bottom tab bar. Implement:
```
[Home] [Services] [Marketplace] [Messages] [Profile]
```
Keeps primary navigation reachable with one thumb. Currently users must scroll to the top header to navigate between sections.

**5.3 — Increase touch targets in messages**
- Conversation action menu trigger: `h-8 w-8` → `h-11 w-11` (44px min)
- Checkbox inputs: add `w-5 h-5 cursor-pointer` and a surrounding `label` with padding
- Send button: already `h-10 w-10` — increase to `h-11 w-11`

**5.4 — Fix `overflow: hidden` body leak**
Replace manual `document.body.style.overflow = "hidden"` with a CSS class that uses `overscroll-behavior: none` and `touch-action: none` scoped to the thread container, not the body.

**5.5 — Add pull-to-refresh on listing feeds**
Use the `overscroll-behavior` and `touchstart`/`touchmove` pattern or a library like `react-pull-to-refresh`. Trigger `router.refresh()` on release.

**5.6 — Lazy-load gallery images**
In `ImageGalleryCarousel`, add `loading="lazy"` to all non-first images and use `next/image` with `priority={index === 0}`.

---

### Sprint 6 — Search & Discovery (5–7 days)
*Facebook Marketplace's most-used feature is search. Vuxsy has none.*

**6.1 — Add keyword search bar**
- Add `?q=` query param to all listing pages
- Add `pg_trgm` GIN index on `title` (from Section 5 D6)
- In `getListings`, if `q` param exists: `.ilike('title', '%${q}%')`
- Render search bar in the hero and in the category page header

**6.2 — Add price range filter UI**
The backend already supports `minPrice` / `maxPrice` params. Wire up a price range slider in `ListingFiltersSidebar`.

**6.3 — Add location detection**
On mobile, offer "Use my location" to auto-select county/area via browser Geolocation API. Map lat/lng to the nearest county using a lookup table.

**6.4 — Add full-text search with ranking (phase 2)**
Once basic search is wired up, evaluate Typesense (self-hosted or cloud) or Supabase's built-in full-text search (`to_tsvector`/`to_tsquery`) for ranked results.

---

### Sprint 7 — Trust & Safety (3–4 days)
*Users won't buy/sell if they don't trust each other.*

**7.1 — Seller verification badges**
`VuxsyVerifiedBadge` and `OfficialVuxsyBadge` components exist. Wire up an actual verification flow:
- Email verification (Supabase Auth already handles this)
- Phone number verification (add `phone_verified_at` to `profiles`)
- Business seller: VAT number lookup against Irish Revenue API

**7.2 — User rating system**
After a transaction closes, allow both parties to rate (1–5 stars). Store in a `reviews` table. Surface average rating on seller cards and profiles.

**7.3 — Listing quality score**
Reject or flag listings that:
- Have titles under 5 characters
- Have no images
- Contain phone numbers or email addresses in the title (spam pattern)
- Use profanity (basic word list)

**7.4 — Improve report flow**
Currently reports go to `listing_reports` table and require admin manual action. Add:
- Auto-hide a listing after 3+ open reports (pending review)
- Email admin when a listing receives its first report
- Auto-ban user after 5 confirmed violations (currently this must be done manually in the admin panel)

---

### Sprint 8 — Observability (2–3 days)
*You can't fix what you can't measure.*

**8.1 — Structured logging**
Replace all `console.log` / `console.info` with a structured logger:
```ts
import { log } from '@/lib/logger'; // create this
log.info('message_sent', { conversationId, messageId, senderId, recipientId });
```
Ship logs to Vercel Log Drains → Datadog / Grafana Loki / Axiom.

**8.2 — Error monitoring**
Add Sentry:
```bash
npx @sentry/wizard@latest -i nextjs
```
Captures unhandled exceptions in Server Actions, API routes, and client components with full stack traces.

**8.3 — Real-user monitoring**
Add Vercel Analytics (already supported by Next.js) for Core Web Vitals. Set LCP < 2.5s as the baseline target.

**8.4 — Database query monitoring**
Enable Supabase's built-in query performance insights (Dashboard → Database → Performance). Set alerts for queries taking > 500ms.

**8.5 — Write E2E tests**
Playwright is already installed. Write at minimum:
- `listing.spec.ts`: create a listing, verify it appears in feed
- `messages.spec.ts`: open a conversation, send a message, verify it appears
- `auth.spec.ts`: login, access protected route, logout

---

## Summary: Priority Matrix

| Sprint | Effort | Impact | Do first? |
|---|---|---|---|
| 1 — Stop the Bleeding | 2 days | Critical | YES — day 1 |
| 2 — Security | 4 days | High | YES — week 1 |
| 3 — Performance | 4 days | High | YES — week 2 |
| 4 — Chat Quality | 6 days | High | YES — week 3 |
| 5 — Mobile UX | 4 days | High | Week 4 |
| 6 — Search | 6 days | Very High | Week 5–6 |
| 7 — Trust & Safety | 4 days | Medium | Week 6–7 |
| 8 — Observability | 3 days | Medium | Week 4 (parallel) |

**Total to reach Facebook Marketplace quality baseline: ~5–6 weeks of focused development.**

The biggest gap vs Facebook Marketplace is not the UI — it's search (Facebook's core discovery), trust signals (ratings, verified sellers), and mobile navigation (bottom tabs). Sprint 1–4 make the platform safe and fast. Sprint 5–6 close the product gap.

---

*No code was modified to produce this document.*
