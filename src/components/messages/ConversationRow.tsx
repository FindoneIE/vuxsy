"use client";

import * as React from "react";
import Image from "next/image";
import { ImageIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/components/listings/formatters";
import { resolveDisplayNameValue } from "@/lib/display-name";
import type { ConversationSummary } from "@/lib/messages/types";

type Props = {
  conversation: ConversationSummary;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (conversation: ConversationSummary) => void;
  onToggleSelected: (conversationId: string) => void;
  showThread: boolean;
  activeId: string | null;
};

function ConversationRowInner({
  conversation,
  isActive,
  isSelected,
  onSelect,
  onToggleSelected,
}: Props) {
  const timeLabel =
    formatRelativeTime(
      conversation.lastMessageAt ?? conversation.createdAt ?? null
    ) ?? "";

  const listingTitle = conversation.listing?.title ?? "Listing";

  const participantName =
    resolveDisplayNameValue(conversation.otherParticipant.displayName) ?? "User";

  const coverImage =
    conversation.listing?.coverImage ??
    conversation.listing?.images?.[0] ??
    null;

  const isBlocked = Boolean(conversation.isBlocked);

  // archived = item was sold / listing no longer active
  const isSold = conversation.listing?.status === "archived";

  const hasUnread = conversation.unreadCount > 0;

  const rawPreview = conversation.lastMessage?.trim() ?? null;

  // "You: " prefix requires conversations.last_message_sender_id (DB column,
  // does not exist yet). Without it there is no reliable way to know who sent
  // the last message, so the preview is shown as-is until that column is added.
  const previewLabel = rawPreview ?? null;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
        isActive
          ? "border-[#34579B]/25 bg-blue-50"
          : isSelected
            ? "border-blue-200 bg-blue-50/40"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
      )}
    >
      {/* Per-row checkbox */}
      <div className="shrink-0 self-center" onClick={handleCheckboxClick}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelected(conversation.id)}
          className="messages-checkbox cursor-pointer"
          aria-label={`Select conversation about ${listingTitle}`}
        />
      </div>

      {/* Main tap / click area */}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onSelect(conversation)}
      >
        {/* Listing thumbnail — 64px mobile / 80px desktop */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 lg:h-20 lg:w-20">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={listingTitle}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 64px, 80px"
              unoptimized={
                coverImage.startsWith("https://") &&
                !coverImage.includes("supabase")
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <ImageIcon className="h-6 w-6" aria-hidden="true" />
            </div>
          )}

          {/* Sold overlay badge */}
          {isSold ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/55 py-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
                Sold
              </span>
            </div>
          ) : null}
        </div>

        {/* Text block */}
        <div className="min-w-0 flex-1 self-center">
          {/* Row 1: listing title + timestamp */}
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <p
              className={cn(
                "min-w-0 truncate text-[14px] font-semibold leading-snug",
                isActive ? "text-[#1d3f7a]" : "text-slate-900"
              )}
            >
              {listingTitle}
            </p>
            <span className="shrink-0 text-[11px] text-slate-400">
              {timeLabel}
            </span>
          </div>

          {/* Row 2: participant name */}
          <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
            {participantName}
          </p>

          {/* Row 3: last message preview + unread badge */}
          <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {isBlocked ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-200">
                  <Lock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  Blocked
                </span>
              ) : (
                <p
                  className={cn(
                    "min-w-0 truncate text-[12px]",
                    hasUnread
                      ? "font-semibold text-slate-800"
                      : "font-normal text-slate-600"
                  )}
                >
                  {previewLabel ?? ""}
                </p>
              )}
            </div>

            {hasUnread && !isBlocked ? (
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#34579B] px-1.5 text-[10px] font-bold leading-none text-white">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}

export default React.memo(ConversationRowInner);
