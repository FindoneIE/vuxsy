"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatListingLocation, formatRelativeTime } from "@/components/listings/formatters";
import { useAuth } from "@/components/auth/AuthProvider";
import VuxsyVerifiedBadge from "@/components/ui/VuxsyVerifiedBadge";
import { cn } from "@/lib/utils";
import {
  getConversationMessages,
  getUserConversations,
  markConversationRead,
  sendMessage,
} from "@/lib/messages/actions";
import type { ConversationSummary, MessageItem } from "@/lib/messages/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const sortConversations = (items: ConversationSummary[]) =>
  [...items].sort((a, b) => {
    const aTime = a.lastMessageAt ?? a.createdAt ?? "";
    const bTime = b.lastMessageAt ?? b.createdAt ?? "";
    return aTime < bTime ? 1 : -1;
  });

type DashboardMessagesProps = {
  conversationId?: string | null;
};

export default function DashboardMessages({ conversationId }: DashboardMessagesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
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
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [isListingOpen, setIsListingOpen] = React.useState(false);

  const selectedConversation = React.useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId]
  );

  const loadConversations = React.useCallback(async () => {
    setLoadingConversations(true);
    setError(null);
    try {
      const data = await getUserConversations();
      setConversations(sortConversations(data));
    } catch (err) {
      console.error("Failed to load conversations", err);
      setError("We couldn’t load your conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const loadMessages = React.useCallback(async (conversation: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await getConversationMessages(conversation);
      setMessages(data);
      await markConversationRead(conversation);
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversation ? { ...item, unreadCount: 0 } : item
        )
      );
    } catch (err) {
      console.error("Failed to load messages", err);
      setError("We couldn’t load this conversation.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => {
      loadConversations();
    });
  }, [loadConversations]);

  React.useEffect(() => {
    if (!conversationId || conversationId === activeId) return;
    queueMicrotask(() => setActiveId(conversationId));
  }, [activeId, conversationId]);

  React.useEffect(() => {
    if (!activeId) {
      queueMicrotask(() => setMessages([]));
      return;
    }
    queueMicrotask(() => {
      loadMessages(activeId);
    });
  }, [activeId, loadMessages]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSelectConversation = (conversation: ConversationSummary) => {
    setActiveId(conversation.id);
    router.push(`/dashboard/messages/${conversation.id}`);
  };

  const handleSend = async () => {
    if (!activeId || sending) return;
    const next = draft.trim();
    if (!next) return;

    setSending(true);
    setError(null);
    try {
      const inserted = await sendMessage(activeId, next);
      setMessages((prev) => [...prev, inserted]);
      setDraft("");
      setConversations((prev) =>
        sortConversations(
          prev.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  lastMessage: inserted.body,
                  lastMessageAt: inserted.createdAt,
                }
              : item
          )
        )
      );
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

  const emptyDetail = !selectedConversation;
  const listingImage =
    selectedConversation?.listing?.coverImage ||
    selectedConversation?.listing?.images?.[0] ||
    null;
  const listingLocation = selectedConversation?.listing
    ? formatListingLocation([
        selectedConversation.listing.county ?? null,
        selectedConversation.listing.area ?? null,
        selectedConversation.listing.city ?? null,
      ])
    : "";
  const listingPrice = selectedConversation?.listing?.price
    ? new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: selectedConversation.listing.currency || "EUR",
        maximumFractionDigits: 0,
      }).format(selectedConversation.listing.price)
    : "Price on request";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <section className="w-full lg:w-[320px]">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
          {loadingConversations ? (
            <span className="text-xs text-slate-400">Loading…</span>
          ) : null}
        </div>

        <div className="space-y-2">
          {loadingConversations ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading conversations…
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              No conversations yet. Contact a seller to start chatting.
            </div>
          ) : (
            conversations.map((conversation) => {
              const isActive = conversation.id === activeId;
              const timeLabel =
                formatRelativeTime(
                  conversation.lastMessageAt ?? conversation.createdAt ?? null
                ) ?? "";
              const listingTitle = conversation.listing?.title ?? "Listing";

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelectConversation(conversation)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition",
                    isActive
                      ? "border-primary/20 bg-primary/5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    aria-label="Select conversation"
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
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
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {conversation.otherParticipant.displayName === "VUXSY" ? (
                          <span className="inline-flex items-center">
                            VUXSY
                            <VuxsyVerifiedBadge
                              displayName={conversation.otherParticipant.displayName}
                              size={18}
                            />
                          </span>
                        ) : (
                          conversation.otherParticipant.displayName
                        )}
                      </p>
                      <span className="text-[11px] text-slate-400">{timeLabel}</span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{listingTitle}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {conversation.lastMessage || "No messages yet"}
                    </p>
                  </div>

                  {conversation.unreadCount > 0 ? (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-2 text-[11px] font-semibold text-white">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </section>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <section className="flex min-h-105 flex-1 flex-col rounded-2xl border border-slate-200 bg-white">
          {emptyDetail ? (
            <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500">
              <p>Select a conversation to view messages.</p>
              <p className="text-xs text-slate-400">
                {pathname?.includes("/dashboard/messages")
                  ? "Start by choosing a chat from the list."
                  : null}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  {pathname?.includes("/dashboard/messages/") ? (
                    <Link
                      href="/dashboard/messages"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      ← Back to messages
                    </Link>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 lg:hidden"
                  onClick={() => setIsListingOpen(true)}
                >
                  View listing
                </button>
              </div>

              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                  {listingImage ? (
                    <Image
                      src={listingImage}
                      alt={selectedConversation.listing?.title ?? "Listing"}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedConversation.otherParticipant.displayName === "VUXSY" ? (
                      <span className="inline-flex items-center">
                        VUXSY
                        <VuxsyVerifiedBadge
                          displayName={selectedConversation.otherParticipant.displayName}
                          size={18}
                        />
                      </span>
                    ) : (
                      selectedConversation.otherParticipant.displayName
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedConversation.listing?.title ?? "Listing"}
                  </p>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              >
                {loadingMessages ? (
                  <div className="text-sm text-slate-500">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.senderId === user?.id;
                    const timestamp =
                      formatRelativeTime(message.createdAt) ?? "Just now";

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          isMine ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                            isMine
                              ? "bg-primary text-white"
                              : "bg-slate-100 text-slate-700"
                          )}
                        >
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {message.body}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-[10px]",
                              isMine ? "text-slate-200" : "text-slate-400"
                            )}
                          >
                            {timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder="Write a message…"
                    className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    disabled={sending}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
                {error ? (
                  <p className="mt-2 text-xs text-rose-600">{error}</p>
                ) : null}
              </div>
            </>
          )}
        </section>

        {selectedConversation ? (
          <aside className="hidden w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Listing
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="relative h-32 w-full bg-slate-100">
                {listingImage ? (
                  <Image
                    src={listingImage}
                    alt={selectedConversation.listing?.title ?? "Listing"}
                    fill
                    className="object-cover"
                    sizes="256px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    No photo
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedConversation.listing?.title ?? "Listing"}
                </p>
                <p className="text-sm text-slate-700">{listingPrice}</p>
                {listingLocation ? (
                  <p className="text-xs text-slate-500">{listingLocation}</p>
                ) : null}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <Dialog open={isListingOpen} onOpenChange={setIsListingOpen}>
        <DialogContent className="top-0 left-0 h-full w-full max-w-none translate-x-0 translate-y-0 rounded-none sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Listing details</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="relative h-40 w-full bg-slate-100">
              {listingImage ? (
                <Image
                  src={listingImage}
                  alt={selectedConversation?.listing?.title ?? "Listing"}
                  fill
                  className="object-cover"
                  sizes="320px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  No photo
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <p className="text-sm font-semibold text-slate-900">
                {selectedConversation?.listing?.title ?? "Listing"}
              </p>
              <p className="text-sm text-slate-700">{listingPrice}</p>
              {listingLocation ? (
                <p className="text-xs text-slate-500">{listingLocation}</p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
