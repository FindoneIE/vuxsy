# Findone / Vuxsy — Project Audit

> Audit date: 2026-06-01  
> Auditor: Claude Sonnet 4.6 (static analysis, no code modified)  
> Codebase: `/findone-clean` — Next.js 16 + Supabase + Tailwind CSS 4

---

## 1. Architecture Overview

### Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16.1.6 (App Router, RSC) |
| Runtime | Node.js (Vercel-targeted) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix-based) |
| Icons | Phosphor Icons + Lucide React (dual icon libraries) |
| Backend / DB | Supabase (Postgres + Auth + Storage + Realtime) |
| Auth | Supabase Auth (email/password + OAuth via Google callback) |
| File storage | Supabase Storage (bucket: `uploads`) |
| Image processing | `sharp` (resize → WebP, two variants: 600px and 1800px) |
| Email notifications | Nodemailer → Gmail SMTP (`smtp.gmail.com:587`) |
| Drag & drop ordering | @dnd-kit |
| Form validation | Zod 4 |
| Deployment target | Vercel (inferred from config patterns) |
| Edge functions | None active (functions/src/index.ts is empty) |

### Application Model

Vuxsy (formerly Findone) is a Irish classifieds marketplace platform with three symmetrical listing sections — **Services**, **Requests**, and **Marketplace** — all driven by a single shared listing engine. A user can be a buyer, seller, or both. The platform is localised for Ireland (county/area geography, EUR pricing, `en-IE` formatting).

### Route Architecture

```
Public
  /                        → Landing (hero + promoted carousel)
  /services[/category[/listingId]]
  /requests[/category[/listingId]]
  /marketplace[/category[/listingId]]
  /services|requests|marketplace/new  → publish flow (protected)
  /login  /signup
  /users/[sellerId]/ads    → public seller profile
  /contact  /safety  /privacy-policy  /cookie-policy  /terms-and-conditions

Auth
  /auth/callback           → PKCE code exchange → session cookie

Protected (middleware-gated)
  /dashboard               → summary
  /dashboard/listings      → user's own listings
  /dashboard/listings/[listingId]/edit
  /dashboard/messages      → inbox
  /dashboard/messages/[conversationId]
  /dashboard/saved         → bookmarked listings
  /dashboard/settings      → profile settings
  /dashboard/marketplace   → separate marketplace view
  /dashboard/requests      → requests view
  /dashboard/services      → services view
  /dashboard/admin         → admin-only moderation panel
  /messages                → top-level redirect alias to /dashboard/messages
  /publish  /publish/[type]
  /report-listing

API Routes
  GET  /api/marketplace|services|requests  → listing search with filters
  GET  /api/promoted-listings              → active promoted listings
  GET  /api/category-counts               → listing counts per category
  GET  /api/listing-count                 → total active listing count
  GET  /api/saved  POST /api/saved/toggle  GET /api/saved/count
  POST /api/uploads/listing  POST /api/uploads/avatar
  POST /api/turnstile/verify              → STUB (returns plain text)
  POST /api/report-listing               → report a listing
  GET  /api/admin/report-count           → admin report summary
  GET  /api/dashboard/listing-status-counts
  GET  /api/requests  POST               → requests listing API
  GET  /api/diagnostics/runtime-logs     → dev diagnostics endpoint
  POST /api/diagnostics/test-message-email → email test
```

### Key Architectural Patterns

- **Server Components + Server Actions**: data-fetching happens in RSC/Server Actions; heavy mutation logic lives in `src/lib/messages/actions.ts` (`"use server"`).
- **Singleton browser client**: `createSupabaseBrowserClient()` memoises a module-level instance — intentional for deduplication but prevents teardown between test environments.
- **SSR-first auth**: root `layout.tsx` resolves the user server-side and passes it as `initialUser` to `<AuthProvider>`, eliminating the blank-page flash on protected routes.
- **Middleware protection**: `middleware.ts` redirects unauthenticated users away from `/dashboard`, `/messages`, `/publish` before any React rendering.
- **Image pipeline**: all uploaded images are processed through `sharp` to two WebP variants (600 and 1800 px wide) before being stored in Supabase Storage.

---

## 2. Database Structure

### Tables (inferred from migrations)

#### `profiles`
Extension of `auth.users`. Stores user-facing data.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | FK → auth.users |
| email | text | |
| display_name | text | |
| full_name | text | |
| name | text | |
| role | text | `'user'` \| `'admin'` (constraint) |
| phone | text | |
| city, county, area | text | Location fields |
| is_banned | boolean | Default false |
| banned_at | timestamptz | |
| is_business_seller | boolean | |
| company_name, business_address, vat_number, website, company_registration_number | text | Business fields |
| avatar_url | text | Supabase Storage path |
| google_photo_url | text | OAuth photo fallback |
| language | text | Default `'en'` |
| email_notifications, marketplace_alerts, message_notifications | boolean | Notification prefs |
| created_at, updated_at | timestamptz | |

#### `listings`
Core entity. Shared across all three listing types.

| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| title, description | text | |
| category_id | uuid | FK → categories |
| listing_type | text | `'service'` \| `'request'` \| `'marketplace'` |
| status | text | `active` \| `paused` \| `archived` \| `draft` \| `pending` \| `rejected` |
| user_id | uuid | FK → auth.users (owner) |
| city, county, area | text | Location |
| price | numeric | |
| sellerType | text | `'business'` \| `'private'` |
| contact_email, contact_phone | text | |
| allow_messages | boolean | Opt-out flag |
| promoted_until | timestamptz | |
| promotion_status | text | `'active'` \| null |
| promotion_tier | text | |
| promotion_weight | int | Higher = higher sort priority |
| promotion_source | text | e.g. `'free'` |
| last_promoted_at | timestamptz | Cooldown tracking |
| seller | jsonb | **Seller snapshot** (denormalised) |
| created_at, updated_at | timestamptz | |

#### `listing_images`
Separate table for multi-image support per listing.

| Column | Notes |
|---|---|
| id, listing_id | FK → listings |
| image_url | Legacy direct URL |
| storage_path | Primary path (WebP) |
| storage_path_600 | 600px variant |
| storage_path_1800 | 1800px variant |
| sort_order | Display order |
| is_primary | Cover image flag |

#### `categories`
Slug-based category lookup table.

#### `conversations`
| Column | Notes |
|---|---|
| id | uuid PK |
| listing_id | FK → listings (cascade delete) |
| buyer_id, seller_id | FK → auth.users (cascade delete) |
| last_message, last_message_at | Denormalised preview cache |
| unique (listing_id, buyer_id, seller_id) | One thread per listing pair |

#### `messages`
| Column | Notes |
|---|---|
| id | uuid PK |
| conversation_id | FK → conversations |
| sender_id, recipient_id | FK → auth.users |
| content (was `body`) | Message text |
| read_at | Null = unread |

#### `conversation_hidden`
Soft-delete per user per conversation (`unique (conversation_id, user_id)`).

#### `conversation_blocks` / `blocked_conversations`
Two tables exist for blocking: `conversation_blocks` (migration-defined) and `blocked_conversations` (referenced in application code). **Schema divergence — see Security section.**

#### `message_email_notifications`
Debounce table: composite PK `(conversation_id, recipient_id)`. Prevents email spam by tracking `last_notified_at` with a configurable debounce window (default 300s).

#### `listing_reports`
| Column | Notes |
|---|---|
| reason, status | `'open'` \| `'pending'` \| `'resolved'` \| `'ignored'` |
| Indexed | listing_id, user_id, status |

#### `user_warnings`
Admin-issued warnings. FK to auth.users, created_by nullable.

#### `admin_audit_logs`
Action trail for moderation events. JSONB `details` and `metadata` columns.

#### `saved_listings`
Junction table `(user_id, listing_id)` with unique constraint and cascade deletes.

### Index Summary

Good coverage exists for:
- Conversations: `buyer_id`, `seller_id`, `listing_id`
- Messages: `conversation_id`, `recipient_id`, composite `(conversation_id, created_at)`
- Listing reports: `listing_id`, `user_id`, `status`
- Saved listings: `user_id`, `listing_id`
- Admin audit logs: `actor_id`, `action`, `created_at`

**Missing indexes** (see Section 6 for details):
- `listings(status, listing_type, created_at)` — composite for the main feed query
- `listings(status, promoted_until, promotion_weight)` — promoted listings query
- `listings(user_id, status)` — dashboard owner view

---

## 3. Authentication Flow

### Flow Diagram

```
User → /login → LoginForm (email+password)
             ↓
       supabase.auth.signInWithPassword()
             ↓
       Supabase Auth (GoTrue) → JWT + refresh token
             ↓
       Cookie set (httpOnly via @supabase/ssr)
             ↓
       middleware.ts reads cookie → supabase.auth.getUser() → validates JWT
             ↓
       root layout resolves user server-side → AuthProvider.initialUser

OAuth (Google):
  /login → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
         → Google → /auth/callback?code=...
         → exchangeCodeForSession(code) → session cookie set on response
         → redirect to /dashboard/listings (or ?redirect param)
```

### Security Properties

- **Cookie-based sessions** via `@supabase/ssr` — not localStorage. Correct approach for SSR.
- **PKCE flow** for OAuth — `exchangeCodeForSession` called server-side in the callback route.
- **Middleware validates every non-static request** using `supabase.auth.getUser()` (not `getSession()`, which only reads the local JWT without server verification).
- **`server-only`** import guard on all server-side Supabase clients prevents accidental client-side import.
- **Admin role** is a `role` column in `profiles` checked application-side. No Supabase custom claims / JWT role — admin check is always an extra DB round trip.

### Weaknesses

1. **Admin email hardcoded** in `Header.tsx`: `const ADMIN_EMAIL = 'info@vuxsy.com'`. Admin identity should not be in client-side code.
2. **Admin email hardcoded** in migration `20260427_add_profile_role.sql`: `where lower(email) = 'emartinsbox@gmail.com'`. This bakes a personal email into the migration history permanently.
3. **`server.ts` cookie `set`/`remove` are no-ops** — intentional for Server Components but means session refresh tokens cannot be persisted from RSC context. This is the standard Supabase SSR pattern but is a subtle footgun.
4. **Turnstile CAPTCHA endpoint is a stub** (`return new Response('turnstile verify')`). Bot protection on listing creation/signup is not actually enforced.
5. **No rate limiting** on auth endpoints or API routes. All traffic passes directly to Supabase or SMTP.

---

## 4. Messaging System Analysis

### Architecture

The messaging system is a **hybrid real-time + server-action** design:

- **Initial load**: Server Actions (`getConversationMessages`, `getUserConversations`) fetch data on mount.
- **Real-time updates**: Supabase Realtime (PostgreSQL `INSERT` events on `messages` table, filtered by `recipient_id=eq.<userId>`) push incoming messages to the active client.
- **Sending**: `sendMessage` Server Action writes the message, updates the conversation's `last_message` cache, and fires a debounced email notification in a detached `void` async block.
- **Read receipts**: `markConversationRead` bulk-updates `read_at` on all unread messages for a conversation.
- **Inbox management**: Soft-deletes via `conversation_hidden` table; hard blocks via `blocked_conversations`.

### Realtime Configuration

- `messages` and `conversations` tables are in the `supabase_realtime` publication.
- `REPLICA IDENTITY FULL` set on both tables — ensures full row payloads in change events (needed for update event filtering).
- Client subscribes per-user: `channel('messages-{userId}')` with server-side filter `recipient_id=eq.{userId}`.

### Identified Issues

#### Performance
1. **`getUserConversations` makes 6 serial/parallel queries** but the final `latestMessageMap` fetch pulls **ALL messages** for all conversations without pagination:
   ```ts
   .from("messages")
   .select("conversation_id, content, created_at")
   .in("conversation_id", conversationIds)
   .order("created_at", { ascending: false })
   // no LIMIT
   ```
   With a user who has 50 conversations and 1,000 messages each, this query returns 50,000 rows. **Critical scalability issue.**

2. **N+1 pattern in bulk delete**: `handleRemoveSelected` iterates and awaits each `deleteConversationForCurrentUser` call sequentially in a `for` loop instead of running them in parallel.

3. **`markConversationRead` fetches before and after the update** for diagnostics (3 round trips per read action). The `beforeRows`/`afterRows` diagnostic queries should be removed from production.

4. **Double `supabase.auth.getUser()` in `markConversationRead`**: lines 1000–1005 call `getUser()` twice redundantly.

#### Correctness
5. **Typing indicator is local-only**: `isTyping` state tracks the *sender's* own typing in the local UI only. No actual typing presence is broadcast to the recipient — the indicator is decorative.

6. **`conversation_blocks` vs `blocked_conversations`** table name mismatch: the migration `20260509_add_conversation_blocks_and_hidden.sql` creates `conversation_blocks` but application code (`actions.ts`) queries `blocked_conversations`. This suggests a rename migration was applied on the live database but not reflected in source. The audit tables must be verified.

7. **Optimistic conversation insert** on incoming Realtime message uses empty `buyerId`/`sellerId` strings, which will cause display issues if the conversation isn't already in the list when the message arrives.

8. **Email notification uses `void` fire-and-forget** inside a Server Action. If the SMTP server is slow or unavailable, there is no timeout, retry, or dead-letter mechanism.

9. **`MESSAGE_EMAIL_ACTIVE_READ_WINDOW_SECONDS=0`** in `.env.local` — this disables the read-window check that prevents email notifications when the recipient is actively reading. Every message triggers a notification check against the debounce table regardless of user activity.

---

## 5. Performance Bottlenecks

### Critical

| # | Issue | Location | Impact |
|---|---|---|---|
| P1 | `getUserConversations` unbounded latest-message fetch | `actions.ts:474-488` | O(all messages) per inbox load |
| P2 | `select("*")` on listings — fetches all columns including large `description` and `seller` JSONB for list views | `getListings.ts:129` | Unnecessary data transfer on every feed page |
| P3 | `getListings` performs a **second query** for saved listings + a **third query** for images after the main fetch, sequentially for authenticated users | `getListings.ts:213-258` | 3 round-trips minimum per feed load |
| P4 | `getPromotedListings` duplicates the same 3-query pattern | `getPromotedListings.ts` | 3 additional round-trips on every homepage/category page |

### Significant

| # | Issue | Location | Impact |
|---|---|---|---|
| P5 | Category slug → UUID lookup on every listing request (not cached) | `getListings.ts:100-126` | Extra round-trip on every category page |
| P6 | `markConversationRead` makes 3 DB calls for diagnostic logging | `actions.ts:997-1097` | 2 unnecessary queries per conversation open |
| P7 | `SavedListingsProvider` fetches all saved listing IDs on every page load via `GET /api/saved` with `cache: 'no-store'` | `SavedListingsProvider.tsx:74` | Uncached API hit on every navigation |
| P8 | `getVisibleUnreadMessageCountForCurrentUser` fetches all hidden conversation IDs then all unread messages without join | `actions.ts:547-606` | Two unindexed scans on header render |
| P9 | Image upload processes two `sharp` transformations synchronously in the API route — no queue or worker | `uploads/listing/route.ts` | Blocks the serverless function thread for large images |
| P10 | `promoteListing` called from the **browser client** directly (not a Server Action), bypassing server-side auth verification | `promoteListing.ts:65` | RLS is the only guard; no server-side cooldown enforcement |

### Minor

- `AuthProvider` logs `console.info("TEMP LOG: fetched profile row", data)` on every profile fetch — left-in debug log, pollutes production logs.
- `browserClient` singleton never resets — in a hot-reload dev environment this can serve stale auth state.
- Dual icon libraries (`phosphor-react` + `@phosphor-icons/react` + `lucide-react`) increase bundle size unnecessarily.
- `next/font/google` correctly self-hosts Inter, but the legacy `@import` was only recently removed — may persist in user caches.

---

## 6. Supabase Query Optimization Opportunities

### Missing Composite Indexes

```sql
-- Main listings feed (status + type + sort)
CREATE INDEX CONCURRENTLY listings_feed_idx
  ON public.listings (listing_type, status, created_at DESC)
  WHERE status = 'active';

-- Promoted listings query
CREATE INDEX CONCURRENTLY listings_promoted_idx
  ON public.listings (status, promoted_until DESC, promotion_weight DESC)
  WHERE status = 'active';

-- Owner dashboard
CREATE INDEX CONCURRENTLY listings_owner_idx
  ON public.listings (user_id, status, created_at DESC);

-- Category + type combo (most category page queries)
CREATE INDEX CONCURRENTLY listings_category_type_idx
  ON public.listings (category_id, listing_type, status, created_at DESC)
  WHERE status = 'active';

-- Unread message count (used by header badge on every page)
CREATE INDEX CONCURRENTLY messages_unread_recipient_idx
  ON public.messages (recipient_id, read_at)
  WHERE read_at IS NULL;

-- Latest message per conversation (inbox preview)
CREATE INDEX CONCURRENTLY messages_conversation_latest_idx
  ON public.messages (conversation_id, created_at DESC);
```

### Query Refactoring Opportunities

#### Replace unbounded latest-message fetch with a lateral join or window function

Current (fetches all messages for all conversations):
```ts
supabase.from("messages")
  .select("conversation_id, content, created_at")
  .in("conversation_id", conversationIds)
  .order("created_at", { ascending: false });
```

Recommended: use a custom RPC function (PostgreSQL `LATERAL` join) to fetch only one row per conversation:
```sql
CREATE OR REPLACE FUNCTION get_latest_messages_for_conversations(
  conversation_ids uuid[]
) RETURNS TABLE (conversation_id uuid, content text, created_at timestamptz)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id, m.content, m.created_at
  FROM public.messages m
  WHERE m.conversation_id = ANY(conversation_ids)
  ORDER BY m.conversation_id, m.created_at DESC;
$$;
```

#### Merge saved-listings check into listings query

Use a left join in a custom RPC instead of a separate `SELECT FROM saved_listings WHERE user_id = ... AND listing_id IN (...)` query after the fact.

#### Cache category slug lookups

A static slug map (`categorySlugMap.ts` already exists in the project structure) should be used client-side to avoid the extra DB round-trip. Server-side, a 60-second in-memory cache (Next.js `unstable_cache`) would eliminate the repeated lookup across concurrent requests.

#### Use `select()` column projection

Replace `select("*")` with explicit column lists in list views to avoid shipping `description` (potentially large), internal promotion fields, and `seller` JSONB to clients that only need card data:

```ts
.select("id, title, price, city, county, area, category_id, listing_type, status, created_at, seller, coverImage, promoted_until")
```

#### Batch the unread-count query

`getVisibleUnreadMessageCountForCurrentUser` could be rewritten as a single SQL query with a subquery exclusion rather than two separate fetches.

---

## 7. Mobile UX Issues

### Layout & Navigation
1. **Thread view uses `h-dvh` / `min-h-dvh`** — correct for iOS Safari viewport units, but the bottom composer is `fixed bottom-0` which conflicts with the iOS soft keyboard. When the keyboard opens, the fixed composer overlaps message content. The `pb-[calc(228px+env(safe-area-inset-bottom))]` spacing is a workaround that requires manual tuning every time the composer height changes.

2. **Back navigation in messages** relies on a `ChevronLeft` link that's only visible when `pathname?.includes("/dashboard/messages/")`. If the user navigates directly to a conversation URL, the back button may not appear correctly.

3. **Mobile search sheet** (`MobileQuickSearchSheet`) exists but there is no indication of its discoverability — no bottom tab bar or persistent navigation for the three listing types on mobile.

4. **`document.body.style.overflow = "hidden"`** is set manually when a thread is open on mobile. This is fragile: if the user navigates away without the cleanup function running (e.g. back button in iOS PWA), the page becomes unscrollable.

5. **Landscape orientation**: scripts directory contains multiple `diagnose-*` scripts suggesting active investigation of layout issues in landscape mobile. No landscape-specific CSS media queries are visible in the component code reviewed.

6. **No pull-to-refresh** on the conversations list or listings feed. Mobile users expect this pattern for real-time feeds.

7. **Textarea composer auto-resize** is implemented with JS and direct `style.height` mutation. The `minHeight: 40px` / `maxHeight: 96px` constraint is hardcoded and may clip messages on small devices.

### Touch Targets
8. The conversation actions dropdown trigger (`h-8 w-8` = 32px) is below the Apple HIG and Material Design minimum of 44px for touch targets.

9. Checkbox inputs in the conversation list (`messages-checkbox` class) have no visible touch area expansion — they likely fail WCAG 2.5.5 (Target Size).

### Performance
10. Listing gallery (`ImageGalleryCarousel`) — no lazy loading strategy was visible for off-screen images in the carousel, which can cause high initial memory on mobile for listings with many photos.

---

## 8. Desktop UX Issues

### Layout

1. **Messages panel has a hardcoded `lg:flex-3` flex ratio** with a fixed 64px sidebar for the listing preview card. There is no minimum content width guard — at laptop widths (1024–1280px) the message list can become very narrow.

2. **Dashboard sidebar / conversation list max-width** is `lg:max-w-275` (275 × 4px = 1100px). At ultra-wide monitors (2560px+) the layout will stretch awkwardly as only the list section has a max-width constraint.

3. **Thread view sidebar** (listing preview card) is `hidden` on mobile and `w-64` on desktop — the card does not adapt its aspect ratio for very tall listing images.

4. **No pagination or infinite scroll** on the conversations list. With hundreds of conversations, the inbox renders all rows at once.

5. **Select-all checkbox state** is managed via `ref.current.indeterminate = false` directly. This works but bypasses React's rendering model and could cause subtle state desync.

### Typography & Information Hierarchy

6. **Listing price shown as "Price on request"** when price is 0 or falsy — this should distinguish between "no price set" and "price is 0". Free items would incorrectly show "Price on request".

7. **`formatRelativeTime`** used for conversation timestamps in the listing preview sidebar — not visible for conversations with no `createdAt`. Silent empty string renders confusingly.

### Admin Dashboard

8. **Admin panel is accessible at `/dashboard/admin`** via client-side role check only. The route is not protected at the middleware level — a non-admin user who navigates to `/dashboard/admin` will see the page render before the client checks `profile.role`. A server-side redirect or RSC auth check should gate this route.

9. **Admin `cleanupConversationHiddenRows`** deletes rows one-by-one in a `for` loop. For large datasets this is extremely slow.

---

## 9. Security Concerns

### Critical

| Severity | Issue | Location |
|---|---|---|
| HIGH | **Turnstile CAPTCHA is a non-functional stub** | `api/turnstile/verify/route.ts` |
| HIGH | **Admin route not middleware-protected** — only checked client-side | `dashboard/admin` |
| HIGH | **`promoteListing` called directly from browser client** — relies solely on Postgres RLS. A user who crafts a direct Supabase API call can set arbitrary `promotion_weight`, `promotion_tier`, and `promotion_source` values | `promoteListing.ts` |
| HIGH | **`blocked_conversations` vs `conversation_blocks` table divergence** — application code and migrations reference different table names. If the live DB has `blocked_conversations`, RLS on `conversation_blocks` (migration) offers no protection. If the tables diverged, blocking may be entirely non-functional | Database |

### Medium

| Severity | Issue | Location |
|---|---|---|
| MEDIUM | **Admin email hardcoded in client-side JS** (`ADMIN_EMAIL = 'info@vuxsy.com'`) — exposes admin contact info and allows social engineering | `Header.tsx:33` |
| MEDIUM | **Personal developer email baked into migration history** | `20260427_add_profile_role.sql` |
| MEDIUM | **Diagnostics endpoints are not auth-gated** | `api/diagnostics/runtime-logs`, `api/diagnostics/test-message-email` |
| MEDIUM | **No rate limiting on API routes** — `/api/uploads/listing` can be abused for image processing DoS (each call spins up two `sharp` transformations) | Upload routes |
| MEDIUM | **`SUPABASE_SERVICE_ROLE_KEY` used in email notification path** — the admin client is instantiated to look up recipient email when profile email is missing. If the admin client is used more broadly in future, a code audit is needed | `actions.ts:877` |
| MEDIUM | **`console.info("TEMP LOG: fetched profile row", data)`** leaks full profile row (including email, phone, VAT number) to server logs in production | `AuthProvider.tsx:195` |

### Low

| Severity | Issue | Location |
|---|---|---|
| LOW | **`redirect` parameter in auth callback** is validated (`startsWith("/")`) but does not prevent open redirects to other origins if the base URL is wrong | `auth/callback/route.ts:7-10` |
| LOW | **`serializePostgrestInFilter` manual escaping** — hand-rolled escaping of values for PostgREST `not ... in` filter. Should use parameterised filtering if PostgREST supports it | `actions.ts:74-78` |
| LOW | **No CSP headers** visible in middleware or next.config | Global |
| LOW | **SMTP password in env** (`SMTP_PASS`) — correct practice, but Gmail SMTP with app password has no automatic rotation. A transactional email provider (Resend, Postmark) would be more appropriate at scale | `.env.local` |
| LOW | **Image upload validates MIME type from the request** (`file.type`) — this is the browser-reported type and can be spoofed. MIME sniffing of the buffer content should be added | `imageValidation.ts` |

---

## 10. Scalability Roadmap

### 10k Users (current architecture can handle)

At this scale, the existing architecture is largely sufficient with targeted fixes:

**Immediate wins (no infrastructure change needed):**
- Add the 6 missing composite indexes (Section 6) — 10× query improvement on feeds
- Fix the unbounded `latest-message` query (P1) — prevents slow inbox load as message volume grows
- Remove diagnostic `beforeRows`/`afterRows` queries from `markConversationRead`
- Remove the `TEMP LOG` profile data leak from `AuthProvider`
- Activate Turnstile CAPTCHA to prevent bot-created listings
- Gate `/dashboard/admin` at the middleware level

**Infrastructure (light):**
- Upgrade SMTP to a transactional email provider (Resend / Postmark) — Gmail SMTP rate-limits at 500/day
- Enable Supabase connection pooling (PgBouncer) if not already active

---

### 100k Users

At this scale, the architecture requires targeted hardening:

**Database**
- Partition `messages` by `created_at` (monthly) — prevents table bloat as message volume compounds
- Materialised view or dedicated `conversation_unread_counts` table to avoid per-request `COUNT` scans on `messages`
- Move `last_message` / `last_message_at` cache to a trigger rather than application-level update to prevent race conditions under concurrent sends
- Replace `select("*")` throughout with column projections to reduce Postgres memory and network transfer

**Application**
- Introduce Next.js `unstable_cache` (or Redis) for category slug lookups, category counts, and promoted listings (these change infrequently but are queried on every page load)
- Move image processing (`sharp`) to a background queue (e.g. Supabase Edge Function triggered by Storage event, or a dedicated worker) — decouples upload latency from image transformation time
- Replace `void` fire-and-forget email with a durable queue (Supabase pg_cron + `message_email_notifications` table already exists as a debounce mechanism — extend it to queue delivery)
- Add server-side rate limiting on write endpoints (`/api/uploads`, `/api/report-listing`, auth routes) using an edge middleware counter (Upstash Redis)

**Auth**
- Move admin role to a Supabase custom claim (JWT) to eliminate the extra DB round-trip on every admin check
- Add multi-factor authentication option for admin accounts

**Realtime**
- The current per-user Realtime channel subscription model works at 100k but Supabase Realtime has soft limits per project. Monitor concurrent channel count.

---

### 1M Users

At this scale, significant architectural evolution is required:

**Database**
- Shard the `messages` table by `conversation_id` hash (or migrate to a dedicated messaging store — e.g. Cassandra, or a Supabase project dedicated to messaging)
- Read replicas for all listing feed queries — write traffic (new listings, updates) goes to primary; all SELECT queries go to replica
- Full-text search on listings (`pg_trgm` GIN index on `title || description`) or Elasticsearch / Typesense to replace the current equality-filter approach
- Separate databases for high-frequency tables (`messages`, `message_email_notifications`) from low-frequency core data (`profiles`, `listings`)

**Application**
- CDN edge caching for listing category pages (Next.js ISR with 60s revalidation) — currently all listing pages appear to be dynamically rendered
- Image CDN with transformation API (Cloudflare Images or imgix) to replace the current Sharp-in-Lambda approach
- Move to a dedicated email infrastructure with suppression lists, bounce handling, and unsubscribe management

**Realtime**
- Replace Supabase Realtime for messaging with a dedicated pub/sub layer (e.g. Ably, Pusher, or a self-hosted Socket.IO cluster) — Supabase Realtime is PostgreSQL WAL-based and is not designed for 1M concurrent subscribers
- Implement optimistic UI with conflict resolution instead of reloading full conversation list on every incoming message

**Auth & Security**
- Move from Supabase Auth to a dedicated identity provider (Auth0, Clerk) if multi-tenant or enterprise features are needed
- Per-tenant isolation if Vuxsy expands to other markets/countries

---

### 10M Users

At this scale, the platform requires a microservices split:

**Core Services (separate deployments)**
- **Listings Service**: Postgres primary + N read replicas, Elasticsearch for search
- **Messaging Service**: dedicated database (Postgres or Cassandra), WebSocket gateway, async email via dedicated worker fleet
- **Notifications Service**: isolated queue (SQS / RabbitMQ), email/push/SMS with provider failover
- **Media Service**: upload → queue → dedicated image processing fleet → CDN
- **Auth Service**: external IdP (Auth0 / Clerk) with JWT refresh on edge

**Infrastructure**
- Global CDN with edge compute (Vercel Edge / Cloudflare Workers) for listing feed rendering
- Kafka or equivalent for event streaming (listing created → index update, email queue, recommendation engine)
- Separate read model (CQRS) for listing search — write to Postgres, project to Elasticsearch asynchronously

**Observability (required before 10M)**
- Structured logging to a log aggregation platform (Datadog / Grafana Loki) — currently logs are `console.log` scattered across Server Actions
- Distributed tracing (OpenTelemetry) across all services
- Real-user monitoring (Core Web Vitals) — the `scripts/diagnose-*` approach does not scale beyond manual testing

**Data governance**
- GDPR-compliant data deletion pipeline (conversations, messages, profiles, audit logs)
- Data residency controls (EU data stays in EU Supabase region — already the case with `supabase.co`)
- Automated PII redaction in logs (phone numbers, email addresses currently leak into console logs)

---

## Appendix: Dependency Notes

| Package | Note |
|---|---|
| `phosphor-react` v1.4.1 | Legacy package; `@phosphor-icons/react` v2 is the maintained successor. Both are installed — consolidate. |
| `radix-ui` v1.4.3 | Top-level Radix umbrella package alongside shadcn component imports — may cause duplicate bundle |
| `next` v16.1.6 | Latest channel. No issues. |
| `sharp` | Native addon — requires Node.js runtime (`export const runtime = "nodejs"` set correctly on upload route). Will not work on Edge runtime. |
| `nodemailer` | Suitable for current scale. Replace with transactional provider at 100k+. |
| `playwright` | Installed as devDependency — confirms E2E test infrastructure exists but no test files were found in `/tests` |
| `@dnd-kit/*` | Used for photo drag-to-reorder in listing forms. No issues. |

---

*End of audit. No code was modified during this analysis.*
