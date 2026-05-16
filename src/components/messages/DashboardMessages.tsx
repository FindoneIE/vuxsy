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

const MESSAGES_UNREAD_UPDATED_EVENT = "messages:unread-updated";

const sortConversations = (items: ConversationSummary[]) =>
  [...items].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt ?? "";
    const bTime = b.lastMessageAt ?? b.createdAt ?? "";
    return aTime < bTime ? 1 : -1;
  });

type DashboardMessagesProps = {
  conversationId?: string | null;
};

type ActiveThreadStatus = "idle" | "loading" | "ready" | "not_found" | "error";

export default function DashboardMessages({ conversationId }: DashboardMessagesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
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
  const [loadingConversations, setLoadingConversations] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
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
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);
  const routerRef = React.useRef(router);
  const bootstrapKeyRef = React.useRef<string | null>(null);
  const latestThreadRequestRef = React.useRef(0);

  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const selectedConversation = React.useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId]
  );

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

  const loadConversations = React.useCallback(async () => {
    setLoadingConversations(true);
    setError(null);
    try {
      const data = await getUserConversations();
      const sorted = sortConversations(data);
      setConversations(sorted);
      return sorted;
    } catch (err) {
      console.error("Failed to load conversations", err);
      setError("We couldn’t load your conversations.");
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadMessages = React.useCallback(async (conversation: string) => {
    const requestId = latestThreadRequestRef.current + 1;
    latestThreadRequestRef.current = requestId;

    setLoadingMessages(true);
    setError(null);
    try {
      const data = await getConversationMessages(conversation);
      if (latestThreadRequestRef.current !== requestId) return;

      setMessages(data);
      return true;
    } catch (err) {
      console.error("Failed to load messages", err);
      setError("We couldn’t load this conversation.");
      return false;
    } finally {
      if (latestThreadRequestRef.current === requestId) {
        setLoadingMessages(false);
      }
    }
  }, []);

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
    if (!user) return;

    const routeConversationId = conversationId ?? null;
    const key = `${user.id}:${routeConversationId ?? "none"}`;
    if (bootstrapKeyRef.current === key) return;
    bootstrapKeyRef.current = key;

    void (async () => {
      if (!routeConversationId) {
        setActiveThreadStatus("idle");
        setActiveId(null);
        setMessages([]);
        setConversationBlocked(false);
        setBlockedByMe(false);
        await loadConversations();
        return;
      }

      setActiveThreadStatus((prev) => (prev === "ready" ? "ready" : "loading"));

      const conversationRows = await loadConversations();
      const resolvedConversation = conversationRows.find(
        (conversation) => conversation.id === routeConversationId
      );

      if (!resolvedConversation) {
        setActiveId(null);
        setMessages([]);
        setConversationBlocked(false);
        setBlockedByMe(false);
        setActiveThreadStatus("idle");
        routerRef.current.replace("/dashboard/messages");
        return;
      }

      setActiveId(routeConversationId);
      await syncConversationReadState(routeConversationId);
      const loaded = await loadMessages(routeConversationId);
      if (!loaded) {
        setActiveId(null);
        setMessages([]);
        setConversationBlocked(false);
        setBlockedByMe(false);
        setActiveThreadStatus("idle");
        routerRef.current.replace("/dashboard/messages");
        return;
      }

      setActiveThreadStatus("ready");
    })();
  }, [conversationId, loadConversations, loadMessages, syncConversationReadState, user]);

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
      setMessages((prev) => {
        if (message.conversationId !== activeId) return prev;
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });

      let conversationFound = false;
      const shouldIncrementUnread = message.conversationId !== activeId;
      setConversations((prev) => {
        const next = prev.map((item) => {
          if (item.id !== message.conversationId) return item;
          conversationFound = true;
          return {
            ...item,
            lastMessage: message.body,
            lastMessageAt: message.createdAt,
            unreadCount: shouldIncrementUnread
              ? item.unreadCount + 1
              : item.unreadCount,
          };
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

      if (message.conversationId === activeId) {
        syncConversationReadState(message.conversationId);
      }
    },
    [activeId, loadConversations, notifyUnreadCounterUpdated, syncConversationReadState]
  );

  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
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
  }, [handleIncomingMessage, supabase, user]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  React.useEffect(() => {
    if (!showThread) return;
    if (typeof window === "undefined") return;

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobile) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showThread]);

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

  const handleSelectConversation = async (conversation: ConversationSummary) => {
    await syncConversationReadState(conversation.id);
    if (showThread) {
      setActiveId(conversation.id);
    }
    router.push(`/dashboard/messages/${conversation.id}`);
  };

  const handleSend = async () => {
    if (!activeId || sending || conversationBlocked) return;
    const next = draft.trim();
    if (!next) return;

    setSending(true);
    setError(null);
    try {
      const inserted = await sendMessage(activeId, next);
      setMessages((prev) => [...prev, inserted]);
      setDraft("");
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (!textarea) return;
          textarea.style.height = "40px";
          textarea.style.overflowY = "hidden";
          textarea.scrollTop = 0;
        });
      }
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

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  };

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
  const isThreadUnavailable =
    activeThreadStatus === "not_found" || activeThreadStatus === "error";
  const composerDisabled = emptyDetail || conversationBlocked;
  const composerPlaceholder = conversationBlocked
    ? "Conversation blocked"
    : "Write a message…";
  const mobileMessageBottomSpacingClass = !emptyDetail && conversationBlocked
    ? "pb-[calc(288px+env(safe-area-inset-bottom))] scroll-pb-[calc(288px+env(safe-area-inset-bottom))]"
    : "pb-[calc(228px+env(safe-area-inset-bottom))] scroll-pb-[calc(228px+env(safe-area-inset-bottom))]";
  const mobileMessageEndAnchorSpacingClass = !emptyDetail && conversationBlocked
    ? "scroll-mb-[calc(288px+env(safe-area-inset-bottom))]"
    : "scroll-mb-[calc(228px+env(safe-area-inset-bottom))]";
  const composerBlock = (
    <div className="fixed bottom-0 left-0 right-0 z-50 shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] sm:static sm:border-0 sm:bg-transparent sm:p-0">
      <div className="mx-auto w-full max-w-107.5 sm:max-w-none sm:px-4 sm:py-3">
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
            "flex min-w-0 items-end gap-2 rounded-2xl border px-2 py-1 sm:px-4 sm:py-3",
            composerDisabled
              ? "border-slate-200 bg-slate-50/80 lg:max-w-190"
              : "border-slate-300 bg-white"
          )}
          aria-disabled={composerDisabled}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              resizeComposerTextarea(event.currentTarget);
            }}
            onInput={(event) => resizeComposerTextarea(event.currentTarget)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={composerPlaceholder}
            className={cn(
              "min-h-0 min-w-0 flex-1 resize-none overflow-y-hidden whitespace-pre-wrap wrap-break-word px-0 pt-0 pb-2 text-[15px] leading-4 placeholder:text-[15px] border-0! outline-none! ring-0! shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none",
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
      router.refresh();
      queueMicrotask(() => {
        void loadConversations();
      });
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
  }, [activeId, actionLoading, addToast, loadConversations, router]);

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
      router.push("/dashboard/messages");
      notifyUnreadCounterUpdated();
      router.refresh();
      queueMicrotask(() => {
        void loadConversations();
      });
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
  }, [activeId, actionLoading, addToast, loadConversations, notifyUnreadCounterUpdated, router]);

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
      router.refresh();
      queueMicrotask(() => {
        void loadConversations();
      });
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
  }, [activeId, actionLoading, addToast, loadConversations, router]);

  return (
    <main className="w-full text-[#111827]">
      <div className="flex w-full flex-col gap-1.5 py-0 sm:gap-2">
  <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
        <div
          className={cn(
            "flex w-full flex-col gap-1.5 sm:gap-2",
            showThread ? "lg:flex-row lg:gap-8" : ""
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
                      {conversations.map((conversation) => {
                        const isActive = showThread && conversation.id === activeId;
                        const timeLabel =
                          formatRelativeTime(
                            conversation.lastMessageAt ?? conversation.createdAt ?? null
                          ) ?? "";
                        const listingTitle = conversation.listing?.title ?? "Listing";
                        const conversationDisplayName =
                          resolveDisplayNameValue(conversation.otherParticipant.displayName) ??
                          "User";
                        const isSelected = selectedConversations.has(conversation.id);
                        const isBlockedConversation = Boolean(conversation.isBlocked);

                        return (
                          <button
                            key={conversation.id}
                            type="button"
                            onClick={() => handleSelectConversation(conversation)}
                            className={cn(
                              "mb-1.5 md:mb-2 flex h-24 w-full min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition last:mb-0 md:overflow-visible",
                              isActive
                                ? "border-l-4 border-l-[#34579B] bg-[#eff6ff] pl-2"
                                : isBlockedConversation
                                ? "border-slate-200 bg-slate-50/40 hover:bg-slate-50/70"
                                : "hover:bg-slate-50"
                            )}
                          >
                            <div className="mr-2.5 flex shrink-0 items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleConversationSelection(conversation.id)}
                                onClick={(event) => event.stopPropagation()}
                                className="messages-checkbox"
                                aria-label="Select conversation"
                              />
                            </div>
                            <div className="relative mr-3 h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {conversation.listing?.coverImage || conversation.listing?.images?.length ? (
                                <Image
                                  src={
                                    conversation.listing?.coverImage ||
                                    conversation.listing?.images?.[0] ||
                                    ""
                                  }
                                  alt={listingTitle}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="flex min-w-0 items-center justify-between gap-2.5">
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "truncate text-sm leading-5 font-semibold",
                                      isBlockedConversation ? "text-slate-800" : "text-slate-900"
                                    )}
                                  >
                                    {listingTitle}
                                  </p>
                                  <p
                                    className={cn(
                                      "truncate text-[11px] leading-4",
                                      isBlockedConversation ? "text-slate-400" : "text-slate-500"
                                    )}
                                  >
                                    {conversationDisplayName === "VUXSY" ? (
                                      <span className="inline-flex items-center gap-1">
                                        VUXSY
                                        <VuxsyVerifiedBadge
                                          displayName={conversationDisplayName}
                                          size={16}
                                        />
                                      </span>
                                    ) : (
                                      conversationDisplayName
                                    )}
                                  </p>
                                </div>
                                <div className="flex w-20 shrink-0 flex-col items-end justify-center gap-0.5 text-right md:w-auto">
                                  <span
                                    className={cn(
                                      "text-[11px]",
                                      isBlockedConversation ? "text-slate-400" : "text-slate-400"
                                    )}
                                  >
                                    {timeLabel}
                                  </span>
                                  {conversation.unreadCount > 0 ? (
                                    <span
                                      className={cn(
                                        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-[11px] font-semibold",
                                        isBlockedConversation
                                          ? "bg-slate-300 text-slate-700"
                                          : "bg-[#34579B] text-white"
                                      )}
                                    >
                                      {conversation.unreadCount}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <p
                                className={cn(
                                  "mt-0.5 truncate text-[11px] leading-4",
                                  isBlockedConversation ? "text-slate-400" : "text-slate-500"
                                )}
                              >
                                {conversation.lastMessage?.trim()
                                  ? conversation.lastMessage
                                  : "Conversation started"}
                              </p>
                              {isBlockedConversation ? (
                                <span
                                  className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md bg-rose-50/60 px-2 py-0.5 text-[11px] font-medium text-rose-700/80"
                                  aria-label="Blocked conversation"
                                >
                                  <LockSimple
                                    size={12}
                                    weight="fill"
                                    className="shrink-0"
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">Blocked</span>
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {showThread ? (
            <section className="w-full min-h-dvh overflow-hidden lg:min-h-0">
              <div className="flex h-dvh min-h-dvh flex-col overflow-hidden lg:h-[calc(100vh-180px)] lg:min-h-0 lg:flex-row lg:gap-8">
                {isThreadReady ? (
                  <>
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                      <div className="shrink-0 mb-2 flex flex-wrap items-start gap-1 border-b border-slate-200 px-2 pt-0.5 pb-2 md:items-center md:gap-1.5 md:px-4 md:pt-1 md:pb-1.5">
                        {pathname?.includes("/dashboard/messages/") ? (
                          <Link
                            href="/dashboard/messages"
                            className="inline-flex w-full items-center gap-1 text-sm font-semibold text-[#0b4ea2] hover:text-[#09438c] lg:hidden -mt-1"
                          >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            Back
                          </Link>
                        ) : null}
                        <div className="flex w-full min-w-0 items-center gap-2 md:gap-2.5">
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
                        className={cn(
                          "min-h-0 flex-1 overflow-y-auto space-y-2 px-2 pt-0 sm:space-y-2 sm:pb-2.5 sm:scroll-pb-2.5 md:px-4 md:pt-0 md:pb-3 md:scroll-pb-3",
                          mobileMessageBottomSpacingClass
                        )}
                      >
                        {messages.length === 0 && !loadingMessages && !isLoadingConversations ? (
                          <div className="text-sm text-slate-500">No messages yet. Say hello!</div>
                        ) : (
                          messages.map((message) => {
                            const isMine = message.senderId === user?.id;
                            const timestamp = formatRelativeTime(message.createdAt) ?? "Just now";

                            return (
                              <div
                                key={message.id}
                                className={cn("flex", isMine ? "justify-end" : "justify-start")}
                              >
                                <div
                                  className={cn(
                                    "max-w-[68%] px-3.5 py-3 text-sm leading-relaxed",
                                    isMine
                                      ? "rounded-[18px_18px_4px_18px] bg-[#34579B] text-white"
                                      : "rounded-[18px_18px_18px_4px] border border-[#E5E7EB] bg-white text-slate-900"
                                  )}
                                >
                                  <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
                                  <p
                                    className={cn(
                                      "mt-1.5 text-[11px]",
                                      isMine ? "text-white/75" : "text-slate-500"
                                    )}
                                  >
                                    {timestamp}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div
                          ref={messagesEndRef}
                          className={cn(
                            "h-px w-full sm:scroll-mb-0",
                            mobileMessageEndAnchorSpacingClass
                          )}
                          aria-hidden="true"
                        />
                      </div>

                      {composerBlock}
                    </div>

                    <aside className="hidden w-80 shrink-0 lg:block">
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
                    <p>Conversation unavailable.</p>
                    <p className="text-xs text-slate-400">
                      This conversation could not be found.
                    </p>
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
