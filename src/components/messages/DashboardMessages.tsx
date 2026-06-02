"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ImageIcon, ChevronLeft } from "lucide-react";
import { PaperPlaneTilt, DotsThreeVertical, LockSimple } from "phosphor-react";
import { MessageCircle, Trash2 } from "@/components/ui/Icon";
import { formatListingLocation, formatRelativeTime } from "@/components/listings/formatters";
import { getListingHref } from "@/lib/listings/getListingHref";
import { useAuth } from "@/components/auth/AuthProvider";
import VuxsyVerifiedBadge from "@/components/ui/VuxsyVerifiedBadge";
import { cn } from "@/lib/utils";
import ConversationRow from "@/components/messages/ConversationRow";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveDisplayNameValue } from "@/lib/display-name";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ActionIconButton from "@/components/ui/ActionIconButton";
import {
  getConversationMessages,
  getUserConversations,
  markConversationRead,
  restoreConversationVisibilityForCurrentUser,
  sendMessage,
  getConversationStatus,
  blockConversation,
  unblockConversation,
  deleteConversationForCurrentUser,
} from "@/lib/messages/actions";
import type { ConversationSummary, MessageItem } from "@/lib/messages/types";
import ReportListingModal from "@/components/listings/ReportListingModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/ToastProvider";
import DateSeparator from "@/components/messages/DateSeparator";
import TypingIndicator from "@/components/messages/TypingIndicator";

const MESSAGES_UNREAD_UPDATED_EVENT = "messages:unread-updated";

// Diagnostic counters — survive HMR but reset per dev server restart.
// All logs are gated on DIAG so they compile out in production.
const DIAG = process.env.NODE_ENV === "development";
let _diagMountSeq = 0;
let _diagLoadConvSeq = 0;
let _diagLoadMsgSeq = 0;

const sortConversations = (items: ConversationSummary[]) =>
  [...items].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt ?? "";
    const bTime = b.lastMessageAt ?? b.createdAt ?? "";
    return aTime < bTime ? 1 : -1;
  });

type DashboardMessagesProps = {
  conversationId?: string | null;
};

type ActiveThreadStatus = "idle" | "loading" | "ready" | "not_found" | "error" | "message_error";

export default function DashboardMessages({ conversationId }: DashboardMessagesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const hasRouteConversationId = Boolean(conversationId);
  const showThread = hasRouteConversationId;
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(
    conversationId ?? null
  );
  const [messages, setMessages] = React.useState<MessageItem[]>([]);
  const [draft, setDraft] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [loadingConversations, setLoadingConversations] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [hasMoreMessages, setHasMoreMessages] = React.useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [blockModalOpen, setBlockModalOpen] = React.useState(false);
  const [unblockModalOpen, setUnblockModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<
    "block" | "unblock" | "delete" | null
  >(null);
  const [conversationBlocked, setConversationBlocked] = React.useState(false);
  const [blockedByMe, setBlockedByMe] = React.useState(false);
  const [selectedConversations, setSelectedConversations] = React.useState<
    Set<string>
  >(new Set());
  const [activeThreadStatus, setActiveThreadStatus] =
    React.useState<ActiveThreadStatus>(hasRouteConversationId ? "loading" : "idle");
  // True while the on-screen keyboard is open on mobile (visual viewport is
  // significantly shorter than the layout viewport). Used to drop the composer's
  // safe-area bottom inset when the keyboard is up — there is no home indicator
  // to clear then, and the extra gap would otherwise push the input upward.
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = React.useRef<number | null>(null);
  const threadSectionRef = React.useRef<HTMLElement | null>(null);
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);
  const routerRef = React.useRef(router);
  const bootstrapKeyRef = React.useRef<string | null>(null);
  const latestThreadRequestRef = React.useRef(0);
  const activeIdRef = React.useRef(activeId);
  const messagesRef = React.useRef<MessageItem[]>([]);
  const conversationsRef = React.useRef<ConversationSummary[]>([]);
  // Tracks which user's conversations are currently in state so switches can skip reloading.
  const conversationsLoadedUserRef = React.useRef<string | null>(null);
  // In-flight deduplication: concurrent callers share the same promise.
  const loadConversationsInFlightRef = React.useRef<Promise<ConversationSummary[]> | null>(null);
  // Debug: per-instance identifiers (only used when DIAG = true).
  const diagMountIdRef = React.useRef(0);
  const diagBootstrapCountRef = React.useRef(0);
  const diagLoadConvCountRef = React.useRef(0);
  const diagLoadMsgCountRef = React.useRef(0);

  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  React.useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  React.useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Mount / unmount tracking — logged to console in dev only.
  React.useEffect(() => {
    if (!DIAG) return;
    diagMountIdRef.current = ++_diagMountSeq;
    const mountId = diagMountIdRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    console.log(`[DIAG:mount] DashboardMessages #${mountId}`, {
      conversationId: conversationId ?? null,
      pathname,
      authLoading,
      userId: user?.id ?? null,
    });
    return () => {
      // Capture current values at cleanup time to avoid stale-ref warning.
      const bCount = diagBootstrapCountRef.current;
      const lcCount = diagLoadConvCountRef.current;
      const lmCount = diagLoadMsgCountRef.current;
      console.log(`[DIAG:unmount] DashboardMessages #${mountId}`, {
        bootstrapRuns: bCount,
        loadConvCalls: lcCount,
        loadMsgCalls: lmCount,
      });
    };
  // Only fires on actual mount/unmount — intentionally omits all deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedConversation = React.useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const messageGroups = React.useMemo(() => {
    const groups: { label: string; items: typeof messages }[] = [];
    const labelFor = (iso: string) => {
      try {
        const d = new Date(iso);
        const now = new Date();
        const diffDays = Math.floor(
          (now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) /
            (24 * 60 * 60 * 1000)
        );
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        return d.toLocaleDateString();
      } catch {
        return "";
      }
    };
    let currentLabel = "";
    messages.forEach((message) => {
      const label = labelFor(message.createdAt);
      if (label !== currentLabel) {
        groups.push({ label, items: [message] as typeof messages });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(message);
      }
    });
    return groups;
  }, [messages]);

  const notifyUnreadCounterUpdated = React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(MESSAGES_UNREAD_UPDATED_EVENT));
  }, []);

  const scrollToBottom = React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const loadConversations = React.useCallback(async (): Promise<ConversationSummary[]> => {
    // Return the in-flight promise if a fetch is already running — prevents
    // duplicate getUserConversations calls when multiple code paths trigger
    // a refresh simultaneously (e.g. bootstrap + realtime event on mount).
    if (loadConversationsInFlightRef.current) {
      if (DIAG) console.log(`[DIAG:loadConversations] reusing in-flight`, { mount: diagMountIdRef.current });
      return loadConversationsInFlightRef.current;
    }

    if (DIAG) console.log(`[DIAG:loadConversations] call #${++diagLoadConvCountRef.current}`, {
      mount: diagMountIdRef.current,
      bootstrapRun: diagBootstrapCountRef.current,
      stack: new Error().stack?.split("\n").slice(1, 4).join(" | "),
    });

    setLoadingConversations(true);
    setError(null);

    const promise = (async (): Promise<ConversationSummary[]> => {
      try {
        const data = await getUserConversations();
        const sorted = sortConversations(data);
        // If the refreshed list omits the currently open conversation (e.g. a
        // transient DB race after revalidatePath), keep it from the previous
        // state so the open thread never disappears mid-session.
        const currentActiveId = activeIdRef.current;
        setConversations((prev) => {
          if (currentActiveId && !sorted.some((c) => c.id === currentActiveId)) {
            const activePrev = prev.find((c) => c.id === currentActiveId);
            if (activePrev) return sortConversations([activePrev, ...sorted]);
          }
          return sorted;
        });
        return sorted;
      } catch (err) {
        console.error("[chat:loadConversations] error", err);
        setError("We couldn’t load your conversations.");
        return [];
      } finally {
        setLoadingConversations(false);
        loadConversationsInFlightRef.current = null;
      }
    })();

    loadConversationsInFlightRef.current = promise;
    return promise;
  }, []);

  const loadMessages = React.useCallback(async (conversation: string) => {
    if (DIAG) console.log(`[DIAG:loadMessages] call #${++diagLoadMsgCountRef.current} (global #${++_diagLoadMsgSeq})`, {
      conversation,
      mount: diagMountIdRef.current,
      bootstrapRun: diagBootstrapCountRef.current,
    });

    const requestId = latestThreadRequestRef.current + 1;
    latestThreadRequestRef.current = requestId;

    setLoadingMessages(true);
    setError(null);
    try {
      const result = await getConversationMessages(conversation);
      if (latestThreadRequestRef.current !== requestId) {
        return;
      }

      setMessages(result.items);
      setHasMoreMessages(result.hasMore);
      return true;
    } catch (err) {
      console.error("[chat:loadMessages] error", { conversation, err });
      setError("We couldn’t load this conversation.");
      return false;
    } finally {
      if (latestThreadRequestRef.current === requestId) {
        setLoadingMessages(false);
      }
    }
  }, []);

  const loadOlderMessages = React.useCallback(async () => {
    const conversationId = activeIdRef.current;
    const oldest = messagesRef.current[0]?.createdAt;
    if (!conversationId || !oldest || loadingOlderMessages) return;

    const container = scrollRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    setLoadingOlderMessages(true);
    try {
      const result = await getConversationMessages(conversationId, oldest);
      setMessages((cur) => [...result.items, ...cur]);
      setHasMoreMessages(result.hasMore);
      // Restore scroll position so the viewport stays on the same message.
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        });
      }
    } catch {
      // silently ignore — user can retry by pressing the button again
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [loadingOlderMessages]);

  const syncConversationReadState = React.useCallback(
    async (conversationId: string) => {
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversationId && item.unreadCount !== 0
            ? { ...item, unreadCount: 0 }
            : item
        )
      );

      try {
        await markConversationRead(conversationId);
        notifyUnreadCounterUpdated();
      } catch (err) {
        console.error("Failed to mark conversation as read", err);
      }
    },
    [notifyUnreadCounterUpdated]
  );

  React.useEffect(() => {
    if (!user) {
      if (DIAG) console.log(`[DIAG:bootstrap] skipped — no user`, { mount: diagMountIdRef.current, conversationId: conversationId ?? null, pathname, authLoading });
      return;
    }

    const routeConversationId = conversationId ?? null;
    const key = `${user.id}:${routeConversationId ?? "none"}`;

    if (DIAG) console.log(`[DIAG:bootstrap] effect triggered`, {
      mount: diagMountIdRef.current,
      key,
      prevKey: bootstrapKeyRef.current,
      willRun: bootstrapKeyRef.current !== key,
      conversationId: routeConversationId,
      activeId,
      activeThreadStatus,
      pathname,
      userId: user.id,
      authLoading,
    });

    if (bootstrapKeyRef.current === key) return;
    bootstrapKeyRef.current = key;

    const runIndex = ++diagBootstrapCountRef.current;
    const globalRunIndex = ++_diagLoadConvSeq; // reused as a global bootstrap seq
    if (DIAG) console.log(`[DIAG:bootstrap] running #${runIndex} (global #${globalRunIndex})`, { key, mount: diagMountIdRef.current });

    void (async () => {
      // Conversations are loaded once per user. On subsequent conversation
      // switches the cached list is reused — no extra getUserConversations call.
      const conversationsAlreadyLoaded = conversationsLoadedUserRef.current === user.id;

      if (!routeConversationId) {
        setActiveThreadStatus("idle");
        setActiveId(null);
        setMessages([]);
        setConversationBlocked(false);
        setBlockedByMe(false);
        if (!conversationsAlreadyLoaded) {
          await loadConversations();
          conversationsLoadedUserRef.current = user.id;
        }
        return;
      }

      setActiveThreadStatus((prev) => (prev === "ready" ? "ready" : "loading"));

      let conversationRows: ConversationSummary[];
      if (conversationsAlreadyLoaded) {
        conversationRows = conversationsRef.current;
      } else {
        conversationRows = await loadConversations();
        conversationsLoadedUserRef.current = user.id;
      }

      let resolvedConversation = conversationRows.find(
        (conversation) => conversation.id === routeConversationId
      );

      // Conversation not found — retry once to cover auth/DB race conditions
      // on mobile (first load can complete before Supabase session is ready).
      if (!resolvedConversation) {
        conversationRows = await loadConversations();
        conversationsLoadedUserRef.current = user.id;
        resolvedConversation = conversationRows.find(
          (conversation) => conversation.id === routeConversationId
        );
      }

      if (!resolvedConversation) {
        setActiveId(null);
        setMessages([]);
        setConversationBlocked(false);
        setBlockedByMe(false);
        setActiveThreadStatus("not_found");
        // Do NOT auto-redirect — let the user see "Conversation not found" and
        // navigate back manually via the Back button or the link in the error state.
        return;
      }

      setActiveId(routeConversationId);
      void syncConversationReadState(routeConversationId); // fire-and-forget inside bootstrap
      const loaded = await loadMessages(routeConversationId);
      // loadMessages returns true on success, false on error, and undefined when
      // a newer request superseded this one (latestThreadRequestRef mismatch).
      // undefined must NOT trigger a redirect — the superseding call will finish.
      // false (load error) must NOT redirect — the conversation exists, it was a
      // transient fetch failure; show an error in the UI instead so the user can retry.
      if (loaded === false) {
        if (DIAG) console.log(`[DIAG:bootstrap] message_error`, { mount: diagMountIdRef.current, runIndex });
        setActiveThreadStatus("message_error");
        return;
      }

      if (DIAG) console.log(`[DIAG:bootstrap] ready`, { mount: diagMountIdRef.current, runIndex, routeConversationId });
      setActiveThreadStatus("ready");
    })();
  }, [conversationId, loadConversations, loadMessages, syncConversationReadState, user]); // eslint-disable-line react-hooks/exhaustive-deps -- activeId/activeThreadStatus/pathname used only for diagnostic logging

  React.useEffect(() => {
    if (!showThread || !activeId || activeThreadStatus !== "ready") return;

    queueMicrotask(async () => {
      try {
        const status = await getConversationStatus(activeId);
        setConversationBlocked(status.isBlocked);
        setBlockedByMe(status.blockedByMe);
      } catch {
        setConversationBlocked(false);
        setBlockedByMe(false);
      }
    });
  }, [activeId, activeThreadStatus, showThread]);

  const handleIncomingMessage = React.useCallback(
    async (message: MessageItem) => {
      const currentActiveId = activeIdRef.current;
      setMessages((prev) => {
        if (message.conversationId !== currentActiveId) return prev;
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });

      let conversationFound = false;
      const shouldIncrementUnread = message.conversationId !== currentActiveId;
      setConversations((prev) => {
        const next = prev.map((item) => {
          if (item.id !== message.conversationId) return item;
          conversationFound = true;
          const updated = {
            ...item,
            lastMessage: message.body,
            lastMessageAt: message.createdAt,
            unreadCount: shouldIncrementUnread
              ? item.unreadCount + 1
              : item.unreadCount,
          };
          return updated;
        });

        return sortConversations(next);
      });

      if (!conversationFound) {
        setConversations((prev) => {
          if (prev.some((item) => item.id === message.conversationId)) {
            return prev;
          }

          const optimisticConversation: ConversationSummary = {
            id: message.conversationId,
            listingId: "",
            buyerId: "",
            sellerId: "",
            lastMessage: message.body,
            lastMessageAt: message.createdAt,
            createdAt: message.createdAt,
            updatedAt: message.createdAt,
            listing: null,
            otherParticipant: {
              id: message.senderId,
              displayName: "User",
              email: null,
              avatarUrl: null,
              googlePhotoUrl: null,
            },
            unreadCount: shouldIncrementUnread ? 1 : 0,
            isBlocked: false,
            blockedByMe: false,
          };

          return sortConversations([optimisticConversation, ...prev]);
        });

        await restoreConversationVisibilityForCurrentUser(message.conversationId);
        await loadConversations();
      }

      if (shouldIncrementUnread) {
        notifyUnreadCounterUpdated();
      }

      if (message.conversationId === currentActiveId) {
        syncConversationReadState(message.conversationId);
      }
    },
    [loadConversations, notifyUnreadCounterUpdated, syncConversationReadState]
  );

  React.useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as MessageItem & {
            conversation_id?: string;
            sender_id?: string;
            recipient_id?: string;
            read_at?: string | null;
            content?: string | null;
            created_at?: string;
          };

          if (!row?.id || !row.conversation_id || !row.created_at) return;

          void handleIncomingMessage({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id ?? "",
            recipientId: row.recipient_id ?? "",
            body: row.content ?? "",
            readAt: row.read_at ?? null,
            createdAt: row.created_at,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [handleIncomingMessage, supabase, user?.id]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  React.useEffect(() => {
    if (!showThread) return;
    if (typeof window === "undefined") return;

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;

    // iOS Safari ignores overflow:hidden on body. The only reliable cross-browser
    // technique is position:fixed + capturing the current scrollY so we can
    // restore it on unmount (without this the page jumps to top when chat closes).
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    // Lock the body at top:0 (NOT -scrollY). The chat UI fully covers the
    // viewport, so no background scroll position needs visual preservation;
    // scrollY is kept only to restore the page scroll when the chat closes.
    body.style.top = "0px";
    body.style.width = "100%";
    html.style.overflow = "hidden";

    // Pin the global site header to the viewport for the duration of the mobile
    // chat thread. The header is normally `position: relative`, so its on-screen
    // position depends on the body offset — and that offset is not reliable
    // across every entry path (a NEW conversation opened from a listing's seller
    // card arrives via a cross-layout router.push, after a Radix modal scroll
    // lock, while the listing page is scrolled down; the body can settle in a
    // state where the relative header ends up shifted out of the 0..header-height
    // strip, leaving a blank gap above the Back row). Adding this class makes the
    // header `position: fixed; top: 0` (see globals.css `.mobile-chat-open
    // .site-header`), so it is always visible at the top of the viewport,
    // exactly where the fixed chat panel (top: var(--site-header-height))
    // expects it — identically for existing and newly created conversations.
    html.classList.add("mobile-chat-open");
    body.classList.add("mobile-chat-open");

    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      html.style.overflow = prev.htmlOverflow;
      html.classList.remove("mobile-chat-open");
      body.classList.remove("mobile-chat-open");
      window.scrollTo(0, scrollY);
    };
  }, [showThread]);

  // TEMP DIAGNOSTIC — header visibility on mobile chat. Dev-only (compiles out
  // in production via DIAG). Remove once the header fix is confirmed. Logs
  // whether `.site-header` is mounted, its geometry, key computed styles, and
  // what element is actually painted at the header's centre point.
  React.useEffect(() => {
    if (!DIAG) return;
    if (!showThread) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const sample = (label: string) => {
      const header = document.querySelector<HTMLElement>(".site-header");
      if (!header) {
        console.log(`[DIAG:header] (${label}) .site-header NOT in DOM`);
        return;
      }
      const rect = header.getBoundingClientRect();
      const cs = getComputedStyle(header);
      const cx = Math.round(rect.left + rect.width / 2);
      const cy = Math.round(rect.top + rect.height / 2);
      const hit = document.elementFromPoint(cx, Math.max(1, cy));
      console.log(`[DIAG:header] (${label})`, {
        mounted: true,
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        styles: {
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          position: cs.position,
          zIndex: cs.zIndex,
          transform: cs.transform,
          top: cs.top,
        },
        cssVarHeaderHeight: getComputedStyle(document.documentElement)
          .getPropertyValue("--site-header-height")
          .trim(),
        bodyStyle: {
          position: document.body.style.position,
          top: document.body.style.top,
          overflow: document.body.style.overflow,
        },
        elementFromHeaderCenter: hit
          ? `${hit.tagName.toLowerCase()}.${(hit.className || "").toString().split(" ").slice(0, 2).join(".")}`
          : null,
        elementIsHeaderOrChild: hit ? header.contains(hit) : false,
      });
    };

    sample("mount");
    const r = requestAnimationFrame(() => sample("raf"));
    const t = window.setTimeout(() => sample("+300ms"), 300);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, [showThread, activeThreadStatus]);

  React.useEffect(() => {
    if (!showThread || !activeId) return;
    scrollToBottom();
  }, [activeId, showThread, scrollToBottom]);

  const resizeComposerTextarea = React.useCallback(
    (target?: HTMLTextAreaElement | null) => {
      const textarea = target ?? textareaRef.current;
      if (!textarea) return;

      const minHeight = 40;
      const maxHeight = 96;

      textarea.style.height = `${minHeight}px`;
      const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${Math.max(minHeight, nextHeight)}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    },
    []
  );

  const handleDraftChange = React.useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = event.target.value;
    setDraft(val);
    resizeComposerTextarea(event.currentTarget);

    setIsTyping(true);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    // hide typing indicator after 1200ms of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      typingTimeoutRef.current = null;
    }, 1200);
  }, [resizeComposerTextarea]);

  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Drive the mobile chat panel height directly from the visual viewport so
  // it always fits exactly between the site header and the top of the keyboard
  // (or Safari chrome). Adjusting only `bottom` is unreliable on iOS Safari
  // because the fixed element's flex children do not always recompute when
  // `bottom` changes; setting `height` explicitly forces a clean relayout.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const headerHeight =
      parseInt(getComputedStyle(document.documentElement).getPropertyValue("--site-header-height")) || 64;

    const update = () => {
      const el = threadSectionRef.current;
      if (!el || window.innerWidth >= 1024) return;
      // The body is locked (`position: fixed; overflow: hidden`) while a mobile
      // chat is open, so the page cannot scroll and `vv.offsetTop` stays ~0 even
      // when the keyboard opens — only `vv.height` shrinks. The global header is
      // pinned at layout `top: 0` (globals.css `.mobile-chat-open .site-header`),
      // so the panel must start at exactly `headerHeight` to sit flush beneath it
      // (adding offsetTop here would make the panel drift away from the header).
      // Sizing `height` to `vv.height - headerHeight` makes the panel bottom land
      // exactly on the top of the keyboard / Safari toolbar — composer above it.
      const panelHeight = Math.max(0, vv.height - headerHeight);
      el.style.top = `${headerHeight}px`;
      el.style.height = `${panelHeight}px`;
      // Keyboard heuristic: the layout viewport (window.innerHeight) does not
      // shrink for the keyboard, but the visual viewport does. A large gap means
      // the keyboard (or another large overlay) is open.
      setKeyboardOpen(window.innerHeight - vv.height > 120);
      scrollToBottom();
    };

    // Apply immediately on mount (before any keyboard event fires).
    update();

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [scrollToBottom]);

  // TEMP DIAGNOSTIC — mobile chat horizontal overflow. Dev-only (compiles out in
  // production via DIAG). Logs viewport vs. document widths, the composer and
  // last outgoing bubble rects, and scans the thread panel for any element whose
  // right edge exceeds window.innerWidth (the exact element causing overflow).
  // Remove once the layout is confirmed on iPhone Safari with the keyboard open.
  React.useEffect(() => {
    if (!DIAG) return;
    if (!showThread) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const rect = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };

    const sample = (label: string) => {
      const iw = window.innerWidth;
      const vvNow = window.visualViewport;
      const composer = document.querySelector<HTMLElement>('[data-mobile-composer]');
      const sendBtn = document.querySelector<HTMLElement>('[data-msg-send]');
      const messagesArea = scrollRef.current;
      const bubbles = document.querySelectorAll<HTMLElement>('[data-msg-bubble="mine"]');
      const lastBubble = bubbles[bubbles.length - 1] ?? null;
      const panel = threadSectionRef.current;

      const offenders: Array<{ el: string; right: number; width: number }> = [];
      if (panel) {
        panel.querySelectorAll<HTMLElement>("*").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > iw + 0.5) {
            offenders.push({
              el: `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 3).join(".")}`,
              right: Math.round(r.right),
              width: Math.round(r.width),
            });
          }
        });
      }

      // Verification flags the brief explicitly asks for: composer must stay
      // inside the visual viewport bottom, and the send button + last outgoing
      // bubble right edges must be <= innerWidth - 12px.
      const visualBottom = vvNow ? Math.round(vvNow.offsetTop + vvNow.height) : null;
      const composerRect = rect(composer);
      const sendRect = rect(sendBtn);
      const bubbleRect = rect(lastBubble);
      const limit = iw - 12;

      console.log(`[DIAG:overflow] (${label})`, {
        innerWidth: iw,
        windowInnerHeight: window.innerHeight,
        visualViewportHeight: vvNow ? Math.round(vvNow.height) : null,
        visualViewportOffsetTop: vvNow ? Math.round(vvNow.offsetTop) : null,
        visualViewportBottom: visualBottom,
        docScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        panelRect: rect(panel),
        messagesRect: rect(messagesArea),
        composerRect,
        sendButtonRect: sendRect,
        lastOutgoingBubbleRect: bubbleRect,
        FLAG_composerBelowVisualViewport:
          composerRect && visualBottom !== null ? composerRect.bottom > visualBottom + 1 : null,
        FLAG_sendButtonRightOverflow: sendRect ? sendRect.right > limit : null,
        FLAG_bubbleRightOverflow: bubbleRect ? bubbleRect.right > limit : null,
        offendersBeyondViewport: offenders.slice(0, 12),
      });
    };

    sample("mount");
    const r = requestAnimationFrame(() => sample("raf"));
    const t = window.setTimeout(() => sample("+500ms"), 500);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(t);
    };
  }, [showThread, activeThreadStatus, messages.length]);

  const handleSelectConversation = (conversation: ConversationSummary) => {
    // Fire-and-forget: don't block navigation on the server round-trip.
    void syncConversationReadState(conversation.id);
    if (showThread) {
      setActiveId(conversation.id);
    }
    if (DIAG) console.log(`[DIAG:router.push] /dashboard/messages/${conversation.id}`, { reason: "handleSelectConversation", mount: diagMountIdRef.current, showThread, activeId, pathname });
    router.push(`/dashboard/messages/${conversation.id}`);
  };

  const handleSend = async () => {
    if (!activeId || sending || conversationBlocked) return;
    const next = draft.trim();
    if (!next) return;

    // --- Optimistic update: show the message immediately ---
    const tempId = `temp-${Date.now()}`;
    const tempMessage: MessageItem = {
      id: tempId,
      conversationId: activeId,
      senderId: user?.id ?? "",
      recipientId: selectedConversation?.otherParticipant?.id ?? "",
      body: next,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    // Clear the composer immediately so the UI feels instant.
    setDraft("");
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "40px";
      textarea.style.overflowY = "hidden";
      textarea.scrollTop = 0;
    });

    setSending(true);
    setError(null);
    try {
      const inserted = await sendMessage(activeId, next);
      // Replace the temp message with the confirmed server message.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? inserted : m))
      );
      setConversations((prev) =>
        sortConversations(
          prev.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  lastMessage: inserted.body,
                  lastMessageAt: inserted.createdAt,
                  unreadCount: 0,
                }
              : item
          )
        )
      );
      await syncConversationReadState(activeId);
    } catch (err) {
      console.error("Failed to send message", err);
      // Remove the optimistic message and surface the error.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const hasSelected = selectedConversations.size > 0;

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = false;
    }
  }, [hasSelected]);

  const toggleConversationSelection = React.useCallback((conversationId: string) => {
    setSelectedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    setSelectedConversations((prev) => {
      if (prev.size > 0) {
        return new Set();
      }
      return new Set(conversations.map((conversation) => conversation.id));
    });
  };

  const handleRemoveSelected = async () => {
    if (selectedConversations.size === 0) return;

    const selectedIds = Array.from(selectedConversations);
    const failedIds = new Set<string>();

    for (const conversationId of selectedIds) {
      const result = await deleteConversationForCurrentUser(conversationId);
      if (!result?.success) {
        failedIds.add(conversationId);
        console.error("Failed to remove selected conversation", {
          conversationId,
          error: result?.error ?? "Unknown error",
          code: result?.code ?? null,
          details: result?.details ?? null,
        });
      }
    }

    const successfulIds = selectedIds.filter((conversationId) => !failedIds.has(conversationId));

    if (successfulIds.length > 0) {
      const successfulSet = new Set(successfulIds);
      setConversations((prev) =>
        prev.filter((conversation) => !successfulSet.has(conversation.id))
      );
    }

    if (activeId && successfulIds.includes(activeId)) {
      setActiveId(null);
      if (DIAG) console.log(`[DIAG:router.push] /dashboard/messages`, { reason: "handleRemoveSelected:deleted-active", mount: diagMountIdRef.current });
      router.push("/dashboard/messages");
      setMessages([]);
    }

    setSelectedConversations(failedIds);
    notifyUnreadCounterUpdated();

    if (failedIds.size > 0) {
      addToast({
        title: "Some conversations were not removed",
        message: "A few selected conversations could not be removed. Please try again.",
        type: "error",
      });
    }
  };

  const isLoadingConversations = loadingConversations;
  const emptyDetail = !selectedConversation;
  const showEmptyInboxState = !isLoadingConversations && conversations.length === 0;
  const isThreadReady = activeThreadStatus === "ready" && Boolean(selectedConversation);
  const isThreadLoading = activeThreadStatus === "loading";
  const isThreadUnavailable = activeThreadStatus === "not_found" || activeThreadStatus === "error";
  const isMessageLoadError = activeThreadStatus === "message_error";
  const composerDisabled = emptyDetail || conversationBlocked;
  const composerPlaceholder = conversationBlocked
    ? "Conversation blocked"
    : "Write a message…";
  const composerBlock = (
    // shrink-0 keeps the composer in the flex column so the scroll area
    // always stops exactly above it — no fixed positioning or magic padding needed.
    <div
      data-mobile-composer
      className={cn(
        "shrink-0 w-full min-w-0 max-w-full box-border border-t border-slate-200 bg-white px-3 py-1.5 lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0",
        // No home indicator to clear while the keyboard is up, so drop the
        // safe-area inset — otherwise it adds a gap that pushes the input upward.
        keyboardOpen ? "pb-2" : "pb-[calc(env(safe-area-inset-bottom)+8px)]"
      )}
    >
      <div className="mx-auto w-full min-w-0 max-w-107.5 box-border lg:max-w-none lg:px-4 lg:py-3">
        {!emptyDetail && conversationBlocked ? (
          <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50/65 px-3 py-2 sm:mb-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-rose-700">
                <LockSimple
                  size={16}
                  weight="fill"
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {blockedByMe
                    ? "You blocked this conversation"
                    : "This conversation is blocked"}
                </span>
              </span>
              {blockedByMe ? (
                <button
                  type="button"
                  className="rounded-lg bg-rose-100/70 px-3 py-2 text-[13px] font-medium text-rose-700 transition-colors hover:bg-rose-200/60"
                  onClick={() => setUnblockModalOpen(true)}
                >
                  Unblock
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "flex w-full min-w-0 max-w-full box-border items-end gap-2 rounded-2xl border px-2 py-1 lg:px-4 lg:py-3",
            composerDisabled
              ? "border-slate-200 bg-slate-50/80 lg:max-w-190"
              : "border-slate-300 bg-white"
          )}
          aria-disabled={composerDisabled}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleDraftChange}
            onInput={(event) => resizeComposerTextarea(event.currentTarget)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={composerPlaceholder}
            className={cn(
              "min-h-0 min-w-0 flex-1 resize-none overflow-y-hidden whitespace-pre-wrap wrap-break-word px-0 pt-0 pb-2 text-base lg:text-[15px] leading-4 placeholder:text-base lg:placeholder:text-[15px] border-0! outline-none! ring-0! shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none",
              composerDisabled
                ? "cursor-not-allowed bg-transparent text-slate-400 placeholder:text-slate-400 disabled:focus:outline-none disabled:focus:ring-0"
                : "bg-transparent"
            )}
            style={{
              height: "40px",
              minHeight: "40px",
              maxHeight: "96px",
              lineHeight: "20px",
              paddingTop: "7px",
              paddingBottom: "0px",
              overflowY: "hidden",
              resize: "none",
            }}
            disabled={sending || composerDisabled}
            aria-disabled={composerDisabled}
          />
          <button
            type="button"
            data-msg-send
            onClick={handleSend}
            disabled={sending || !draft.trim() || composerDisabled}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
              composerDisabled
                ? "pointer-events-none cursor-not-allowed bg-slate-300 opacity-30"
                : "bg-[#34579B] hover:bg-[#284985] disabled:bg-slate-300"
            )}
            aria-label="Send message"
            aria-disabled={composerDisabled}
            tabIndex={composerDisabled ? -1 : 0}
          >
            <PaperPlaneTilt size={20} weight="fill" />
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </div>
    </div>
  );

  const listingImage =
    selectedConversation?.listing?.coverImage ||
    selectedConversation?.listing?.images?.[0] ||
    null;
  const listingPreviewImage =
    selectedConversation?.listing?.images1600?.[0] || listingImage || null;
  const listingHref = selectedConversation?.listing?.id
    ? getListingHref({
        id: selectedConversation.listing.id,
        type: (selectedConversation.listing.listing_type as
          | "service"
          | "request"
          | "marketplace"
          | undefined) ?? undefined,
        category: (selectedConversation.listing as { category_id?: string | null })
          .category_id ?? undefined,
      })
    : null;
  const listingLocation = selectedConversation?.listing
    ? formatListingLocation([
        selectedConversation.listing.county ?? null,
        selectedConversation.listing.area ?? null,
        selectedConversation.listing.city ?? null,
      ])
    : "";
  const listingPrice = selectedConversation?.listing?.price
    ? `${new Intl.NumberFormat("en-IE", {
        maximumFractionDigits: 0,
      }).format(selectedConversation.listing.price)} €`
    : "Price on request";
  const otherDisplayName = resolveDisplayNameValue(
    selectedConversation?.otherParticipant?.displayName
  ) ?? "User";
  const otherParticipantId = selectedConversation?.otherParticipant?.id ?? null;
  const selectedListingId = selectedConversation?.listing?.id ?? null;

  const handleViewAllAds = React.useCallback(() => {
    if (!otherParticipantId) return;
    setActionsMenuOpen(false);
    queueMicrotask(() => {
      router.push(`/users/${otherParticipantId}/ads`);
    });
  }, [otherParticipantId, router]);

  const handleBlockConversation = React.useCallback(async () => {
    if (!activeId || actionLoading) return;
    const targetConversationId = activeId;
    setActionLoading("block");
    setError(null);
    try {
      const result = await blockConversation(targetConversationId);
      if (!result?.success) {
        const errorMessage = result?.error || "Could not block conversation. Please try again.";
        setError(errorMessage);
        addToast({
          title: "Block failed",
          message: errorMessage,
          type: "error",
        });
        return;
      }

      setConversationBlocked(true);
      setBlockedByMe(true);
      setConversations((prev) =>
        prev.map((item) =>
          item.id === targetConversationId
            ? { ...item, isBlocked: true, blockedByMe: true }
            : item
        )
      );
      setDraft("");
      setBlockModalOpen(false);
      addToast({
        title: "Conversation blocked",
        message: "Messaging has been disabled for this chat.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to block conversation", err);
      setError("Could not block conversation. Please try again.");
      addToast({
        title: "Block failed",
        message: "Could not block conversation. Please try again.",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  }, [activeId, actionLoading, addToast]);

  const handleDeleteConversation = React.useCallback(async () => {
    if (!activeId || actionLoading) return;
    const targetConversationId = activeId;
    setActionLoading("delete");
    setError(null);
    try {
      const result = await deleteConversationForCurrentUser(targetConversationId);
      if (!result?.success) {
        const errorMessage = result?.error || "Could not delete conversation. Please try again.";
        setError(errorMessage);
        addToast({
          title: "Delete failed",
          message: errorMessage,
          type: "error",
        });
        return;
      }

      setConversations((prev) => prev.filter((item) => item.id !== targetConversationId));
      setDeleteModalOpen(false);
      setActiveId(null);
      setMessages([]);
      if (DIAG) console.log(`[DIAG:router.push] /dashboard/messages`, { reason: "handleDeleteConversation", mount: diagMountIdRef.current });
      router.push("/dashboard/messages");
      notifyUnreadCounterUpdated();
      addToast({
        title: "Conversation removed",
        message: "The conversation was removed from your inbox.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to delete conversation", err);
      setError("Could not delete conversation. Please try again.");
      addToast({
        title: "Delete failed",
        message: "Could not delete conversation. Please try again.",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  }, [activeId, actionLoading, addToast, notifyUnreadCounterUpdated, router]);

  const handleUnblockConversation = React.useCallback(async () => {
    if (!activeId || actionLoading) return;
    const targetConversationId = activeId;
    setActionLoading("unblock");
    setError(null);
    try {
      const result = await unblockConversation(targetConversationId);
      if (!result?.success) {
        const errorMessage = result?.error || "Could not unblock conversation. Please try again.";
        setError(errorMessage);
        addToast({
          title: "Unblock failed",
          message: errorMessage,
          type: "error",
        });
        return;
      }

      setConversationBlocked(false);
      setBlockedByMe(false);
      setConversations((prev) =>
        prev.map((item) =>
          item.id === targetConversationId
            ? { ...item, isBlocked: false, blockedByMe: false }
            : item
        )
      );
      setUnblockModalOpen(false);
      addToast({
        title: "Conversation unblocked",
        message: "You can send messages again in this chat.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to unblock conversation", err);
      setError("Could not unblock conversation. Please try again.");
      addToast({
        title: "Unblock failed",
        message: "Could not unblock conversation. Please try again.",
        type: "error",
      });
    } finally {
      setActionLoading(null);
    }
  }, [activeId, actionLoading, addToast]);

  return (
    <main className="w-full overflow-x-hidden text-[#111827]">
      <div className="flex w-full flex-col gap-1.5 py-0 sm:gap-2">
        <h1 className={cn("text-2xl font-semibold text-slate-900", showThread && "hidden lg:block")}>Messages</h1>
        <div
          className={cn(
            "flex w-full flex-col gap-1.5 sm:gap-2",
            showThread ? "lg:flex-row lg:gap-4" : ""
          )}
        >
          {!showThread ? (
            <section className="w-full lg:flex-1 lg:max-w-275">
              {isLoadingConversations ? null : showEmptyInboxState ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <MessageCircle className="h-5 w-5" weight="regular" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold text-slate-600">No messages yet</p>
                  <p className="max-w-xs text-xs text-slate-400">
                    Contact a seller from a listing to start a conversation.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-full">
                    <div className="flex items-center px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <label className="flex items-center">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={hasSelected}
                            onChange={toggleSelectAll}
                            className="messages-checkbox"
                            aria-label="Select all conversations"
                          />
                        </label>
                        <span className="text-xs leading-none font-medium text-(--text-secondary)">
                          {selectedConversations.size > 0
                            ? `${selectedConversations.size} selected`
                            : "Select all"}
                        </span>
                        <ActionIconButton
                          onClick={handleRemoveSelected}
                          disabled={selectedConversations.size === 0}
                          tone="neutral"
                          className="ml-0.5 text-(--text-secondary) hover:bg-red-500/10 hover:text-red-500 active:bg-red-500/15 active:text-red-600 focus-visible:ring-red-200/70"
                          aria-label="Remove selected conversations"
                          title="Remove selected"
                        >
                          <Trash2 weight="bold" className="h-5 w-5 sm:h-5 sm:w-5" />
                        </ActionIconButton>
                      </div>
                    </div>
                    <div className="mt-2">
                      {isLoadingConversations ? (
                        <div className="space-y-2 px-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="mb-2 flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg bg-slate-100 animate-pulse" />
                              <div className="flex-1">
                                <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse mb-2" />
                                <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        conversations.map((conversation) => {
                        const isActive = showThread && conversation.id === activeId;
                        const isSelected = selectedConversations.has(conversation.id);

                        return (
                          <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            isActive={isActive}
                            isSelected={isSelected}
                            onSelect={handleSelectConversation}
                            onToggleSelected={toggleConversationSelection}
                            showThread={showThread}
                            activeId={activeId}
                          />
                        );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {showThread ? (
            // Mobile: fixed panel that sits BELOW the site header (top = header
            // height). z-50 keeps it above subheader (z-45) and page content but
            // below the site header (z-1000 in globals.css). Desktop (lg+): static.
            <section
              ref={threadSectionRef}
              style={{ top: "var(--site-header-height, 64px)" }}
              className="fixed inset-x-0 z-50 box-border h-[calc(100dvh-var(--site-header-height))] overflow-hidden bg-[#F5F7FA] lg:static lg:inset-auto lg:top-auto lg:z-auto lg:h-[calc(100vh-180px)] lg:w-auto lg:overflow-hidden lg:bg-transparent"
            >
              <div className="flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden box-border lg:flex-row lg:gap-4">
                {/* Back button — always visible on mobile when in a conversation, even during loading */}
                {pathname?.includes("/dashboard/messages/") ? (
                  <div className="shrink-0 flex items-center border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
                    <Link
                      href="/dashboard/messages"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      Back
                    </Link>
                  </div>
                ) : null}

          {isThreadReady || isMessageLoadError ? (
                  <>
                    <div className="flex min-h-0 min-w-0 w-full max-w-full box-border flex-1 lg:flex-3 flex-col overflow-hidden">
                      <div className="shrink-0 mb-0 flex items-center border-b border-slate-200 px-4 py-3 lg:flex-wrap lg:items-center lg:gap-1.5 lg:px-4 lg:pt-1 lg:pb-1.5">
                        <div className="flex w-full min-w-0 items-center gap-3 md:gap-2.5">
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                            {listingImage ? (
                              <Image
                                src={listingImage}
                                alt={selectedConversation?.listing?.title ?? "Listing"}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {selectedConversation?.listing?.title ?? "Listing"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {otherDisplayName === "VUXSY" ? (
                                <span className="inline-flex items-center gap-1">
                                  VUXSY
                                  <VuxsyVerifiedBadge
                                    displayName={otherDisplayName}
                                    size={16}
                                  />
                                </span>
                              ) : (
                                otherDisplayName
                              )}
                              <span className="px-1 text-slate-300">•</span>
                              <span className="font-semibold text-slate-700">{listingPrice}</span>
                              {listingLocation ? (
                                <>
                                  <span className="px-1 text-slate-300">•</span>
                                  <span>{listingLocation}</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                          <DropdownMenu open={actionsMenuOpen} onOpenChange={setActionsMenuOpen}>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:h-9 md:w-9"
                                aria-label="Conversation actions"
                              >
                                <DotsThreeVertical className="h-6 w-6 md:h-7 md:w-7" weight="bold" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side="bottom"
                              sideOffset={6}
                              collisionPadding={12}
                              className="z-100 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg outline-none ring-0 focus:outline-none focus-visible:outline-none"
                            >
                              <DropdownMenuItem
                                className="flex items-center rounded-lg px-3 py-2 text-sm font-normal text-gray-700 transition-colors duration-150 ease-in-out hover:bg-[rgba(0,102,255,0.06)] active:bg-[rgba(0,102,255,0.1)]"
                                onSelect={() => {
                                  setActionsMenuOpen(false);
                                  handleViewAllAds();
                                }}
                              >
                                View all ads
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center rounded-lg px-3 py-2 text-sm font-normal text-gray-700 transition-colors duration-150 ease-in-out hover:bg-[rgba(0,102,255,0.06)] active:bg-[rgba(0,102,255,0.1)]"
                                onSelect={() => {
                                  setActionsMenuOpen(false);
                                  if (!selectedListingId) return;
                                  queueMicrotask(() => {
                                    setReportModalOpen(true);
                                  });
                                }}
                              >
                                Report user
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center rounded-lg px-3 py-2 text-sm font-normal text-gray-700 transition-colors duration-150 ease-in-out hover:bg-[rgba(0,102,255,0.06)] active:bg-[rgba(0,102,255,0.1)]"
                                onSelect={() => {
                                  setActionsMenuOpen(false);
                                  queueMicrotask(() => {
                                    setBlockModalOpen(true);
                                  });
                                }}
                              >
                                Block conversation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center rounded-lg px-3 py-2 text-sm font-normal text-[#dc2626] transition-colors duration-150 ease-in-out hover:bg-[rgba(0,102,255,0.06)] active:bg-[rgba(0,102,255,0.1)]"
                                onSelect={() => {
                                  setActionsMenuOpen(false);
                                  queueMicrotask(() => {
                                    setDeleteModalOpen(true);
                                  });
                                }}
                              >
                                Delete conversation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div
                        ref={scrollRef}
                        className="min-h-0 w-full max-w-full min-w-0 box-border flex-1 overflow-y-auto overflow-x-hidden overscroll-contain space-y-2 px-3 pt-2 pb-2"
                      >
                        {hasMoreMessages && !loadingMessages ? (
                          <div className="flex justify-center py-2">
                            <button
                              type="button"
                              onClick={loadOlderMessages}
                              disabled={loadingOlderMessages}
                              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                            >
                              {loadingOlderMessages ? "Loading…" : "Load earlier messages"}
                            </button>
                          </div>
                        ) : null}
                        {loadingMessages ? (
                          <div className="space-y-3 p-2">
                            <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
                            <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
                          </div>
                        ) : isMessageLoadError ? (
                          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500">
                            <p>Couldn&apos;t load messages.</p>
                            <button
                              type="button"
                              className="text-xs text-[#34579B] hover:underline"
                              onClick={() => {
                                if (activeId) {
                                  void loadMessages(activeId).then((ok) => {
                                    if (ok === true) setActiveThreadStatus("ready");
                                    else if (ok === false) setActiveThreadStatus("message_error");
                                  });
                                }
                              }}
                            >
                              Try again
                            </button>
                          </div>
                        ) : messages.length === 0 && !isLoadingConversations ? (
                          <div className="text-sm text-slate-500">No messages yet. Say hello!</div>
                        ) : (
                          messageGroups.map((group) => (
                            <React.Fragment key={`${group.label}-${group.items[0]?.id ?? group.label}`}>
                              <DateSeparator label={group.label} />
                              {group.items.map((message) => {
                                const isMine = message.senderId === user?.id;
                                return (
                                  <div key={message.id} className={cn("flex w-full min-w-0 max-w-full box-border overflow-x-hidden", isMine ? "justify-end" : "justify-start")}>
                                    <div
                                      data-msg-bubble={isMine ? "mine" : "theirs"}
                                      className={cn(
                                        "min-w-0 max-w-[78%] box-border overflow-hidden px-3.5 py-2.5 text-sm leading-relaxed wrap-anywhere [word-break:break-word]",
                                        isMine
                                          ? "rounded-[18px_18px_4px_18px] bg-[#34579B] text-white shadow-sm"
                                          : "rounded-[18px_18px_18px_4px] border border-[#E5E7EB] bg-white text-slate-900"
                                      )}
                                    >
                                      <p className="whitespace-pre-wrap wrap-anywhere [word-break:break-word]">{message.body}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          ))
                        )}
                        <div
                          ref={messagesEndRef}
                          className="h-px w-full"
                          aria-hidden="true"
                        />
                        {isTyping ? (
                          <div className="px-3 py-2">
                            <TypingIndicator />
                          </div>
                        ) : null}
                      </div>

                      {composerBlock}
                    </div>

                    <aside className="hidden w-64 shrink-0 lg:block">
                      {listingHref ? (
                        <Link
                          href={listingHref}
                          className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="relative w-full aspect-square overflow-hidden bg-slate-100">
                            {listingPreviewImage ? (
                              <Image
                                src={listingPreviewImage}
                                alt={selectedConversation?.listing?.title ?? "Listing"}
                                fill
                                className="object-cover"
                                sizes="320px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon className="h-6 w-6" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 p-4">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {selectedConversation?.listing?.title ?? "Listing"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{listingPrice}</p>
                            {listingLocation ? (
                              <p className="mt-1 truncate text-xs text-slate-500">{listingLocation}</p>
                            ) : null}
                            {selectedConversation?.createdAt ? (
                              <p className="mt-2 text-[11px] text-slate-400">
                                {formatRelativeTime(selectedConversation?.createdAt) ?? ""}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="relative w-full aspect-square overflow-hidden bg-slate-100">
                            {listingPreviewImage ? (
                              <Image
                                src={listingPreviewImage}
                                alt={selectedConversation?.listing?.title ?? "Listing"}
                                fill
                                className="object-cover"
                                sizes="320px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <ImageIcon className="h-6 w-6" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 p-4">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {selectedConversation?.listing?.title ?? "Listing"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{listingPrice}</p>
                            {listingLocation ? (
                              <p className="mt-1 truncate text-xs text-slate-500">{listingLocation}</p>
                            ) : null}
                            {selectedConversation?.createdAt ? (
                              <p className="mt-2 text-[11px] text-slate-400">
                                {formatRelativeTime(selectedConversation?.createdAt) ?? ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </aside>
                  </>
                ) : isThreadLoading ? null : isThreadUnavailable ? (
                  <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500">
                    <p>Conversation not found.</p>
                    <p className="text-xs text-slate-400">
                      This conversation may have been removed or is no longer available.
                    </p>
                    <Link
                      href="/dashboard/messages"
                      className="mt-2 text-xs text-[#34579B] hover:underline"
                    >
                      Go to messages
                    </Link>
                  </div>
                ) : showEmptyInboxState ? (
                  <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500">
                    <p>No messages yet.</p>
                    <p className="text-xs text-slate-400">
                      Contact a seller from a listing to start a conversation.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      {selectedListingId ? (
        <ReportListingModal
          listingId={selectedListingId}
          sellerId={otherParticipantId}
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
        />
      ) : null}

      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent
          className="max-w-115"
          overlayClassName="bg-white/40 backdrop-blur-sm"
        >
          <DialogHeader className="border-b-0">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Block conversation?
            </DialogTitle>
            <DialogDescription className="pr-6">
              You won’t be able to send new messages in this chat.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-white">
            <button
              type="button"
              className="btn btn-outline border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              onClick={() => setBlockModalOpen(false)}
              disabled={actionLoading === "block"}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleBlockConversation()}
              disabled={actionLoading === "block"}
            >
              {actionLoading === "block" ? "Blocking..." : "Block conversation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent
          className="max-w-115"
          overlayClassName="bg-white/40 backdrop-blur-sm"
        >
          <DialogHeader className="border-b-0">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Delete conversation?
            </DialogTitle>
            <DialogDescription className="pr-6">
              This will remove the conversation from your inbox.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-white">
            <button
              type="button"
              className="btn btn-outline border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              onClick={() => setDeleteModalOpen(false)}
              disabled={actionLoading === "delete"}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              onClick={() => void handleDeleteConversation()}
              disabled={actionLoading === "delete"}
            >
              {actionLoading === "delete" ? "Deleting..." : "Delete conversation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unblockModalOpen} onOpenChange={setUnblockModalOpen}>
        <DialogContent
          className="max-w-115"
          overlayClassName="bg-white/40 backdrop-blur-sm"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Unblock conversation?
            </DialogTitle>
            <DialogDescription className="pr-6">
              You’ll be able to send and receive new messages in this chat again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="btn btn-outline border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              onClick={() => setUnblockModalOpen(false)}
              disabled={actionLoading === "unblock"}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleUnblockConversation()}
              disabled={actionLoading === "unblock"}
            >
              {actionLoading === "unblock" ? "Unblocking..." : "Unblock conversation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
