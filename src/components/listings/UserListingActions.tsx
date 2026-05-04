import * as React from "react";
import {
  ArchiveBox,
  ArrowCounterClockwise,
  ArrowUpRight,
  Pause,
  Pencil,
  Play,
} from "phosphor-react";
import type { ListingStatus } from "@/components/listings/ListingStatusBadge";
import {
  canPromoteListing,
  getPromoteCooldownLabel,
} from "@/lib/listings/promoteCooldown";

export type UserListingActionsProps = {
  id: string;
  status: ListingStatus;
  createdAt?: string | number | Date | null;
  lastPromotedAt?: string | number | Date | null;
  onEdit?: (id: string) => void;
  onToggleStatus?: (id: string, nextStatus: ListingStatus) => void;
  onBump?: (id: string) => void;
  pendingAction?:
    | "pause"
    | "resume"
    | "archive"
    | "restore"
    | "edit"
    | "continue"
    | "publish"
    | "promote"
    | null;
};

export default function UserListingActions({
  id,
  status,
  createdAt,
  lastPromotedAt,
  onEdit,
  onToggleStatus,
  onBump,
  pendingAction,
}: UserListingActionsProps) {
  const isActive = status === "active";
  const isPaused = status === "paused";
  const isArchived = status === "archived";
  const isDraft = status === "draft";
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const isActionPending = Boolean(pendingAction);
  const canPromote = isActive && canPromoteListing({ createdAt, lastPromotedAt });
  const cooldownLabel = getPromoteCooldownLabel({ createdAt, lastPromotedAt });
  const cooldownTime = cooldownLabel?.replace(/^Next in\s+/i, "");
  const promoteLabel = canPromote
    ? "Promote"
    : cooldownTime
      ? `Boost available in ${cooldownTime}`
      : "Boost available soon";

  const actionClass =
    "inline-flex items-center gap-2 text-sm font-medium text-slate-600 rounded-md px-2 py-1 transition-all duration-150 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-60 disabled:pointer-events-none";
  const promoteClass = canPromote
    ? "inline-flex items-center gap-2 text-sm font-medium text-slate-700 rounded-md px-2 py-1 transition-all duration-150 hover:text-slate-950 hover:bg-slate-100"
    : "inline-flex items-center gap-2 text-sm font-medium text-slate-500";

  return (
    <div className="contents">
      {isActive ? (
        <button
          type="button"
          onClick={() => onToggleStatus?.(id, "paused")}
          className={actionClass}
          disabled={isActionPending}
        >
          <Pause size={18} weight="regular" />
          {pendingAction === "pause" ? "Pausing..." : "Pause"}
        </button>
      ) : null}
      {isPaused ? (
        <button
          type="button"
          onClick={() => onToggleStatus?.(id, "active")}
          className={actionClass}
          disabled={isActionPending}
        >
          <Play size={18} weight="regular" />
          {pendingAction === "resume" ? "Resuming..." : "Resume"}
        </button>
      ) : null}
      {(isActive || isPaused) ? (
        <button
          type="button"
          onClick={() => onToggleStatus?.(id, "archived")}
          className={actionClass}
          disabled={isActionPending}
        >
          <ArchiveBox size={18} weight="regular" />
          {pendingAction === "archive" ? "Archiving..." : "Archive"}
        </button>
      ) : null}
      {isArchived ? (
        <button
          type="button"
          onClick={() => onToggleStatus?.(id, "active")}
          className={actionClass}
          disabled={isActionPending}
        >
          <ArrowCounterClockwise size={18} weight="regular" />
          {pendingAction === "restore" ? "Restoring..." : "Restore"}
        </button>
      ) : null}
      {isDraft ? (
        <button
          type="button"
          onClick={() => onToggleStatus?.(id, "active")}
          className={actionClass}
          disabled={isActionPending}
        >
          <Play size={18} weight="regular" />
          {pendingAction === "publish" ? "Publishing..." : "Publish"}
        </button>
      ) : null}
      {(isActive || isPaused) ? (
        <button
          type="button"
          onClick={() => onEdit?.(id)}
          className={actionClass}
          disabled={isActionPending}
        >
          <Pencil size={18} weight="regular" />
          Edit
        </button>
      ) : null}
      {(isDraft || isPending || isRejected) ? (
        <button
          type="button"
          onClick={() => onEdit?.(id)}
          className={actionClass}
          disabled={isActionPending}
        >
          <Pencil size={18} weight="regular" />
          {pendingAction === "continue" ? "Opening..." : "Continue editing"}
        </button>
      ) : null}
      {canPromote ? (
        <button
          type="button"
          onClick={() => onBump?.(id)}
          disabled={!canPromote || isActionPending}
          className={promoteClass}
        >
          <ArrowUpRight size={18} weight="regular" />
          {promoteLabel}
        </button>
      ) : null}
    </div>
  );
}
