import * as React from "react";
import { Eye } from "phosphor-react";
import type { ListingStatus } from "@/components/listings/ListingStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  canPromoteListing,
  getPromoteCooldownLabel,
} from "@/lib/listings/promoteCooldown";

export type UserListingMobileActionsProps = {
  id: string;
  status: ListingStatus;
  createdAt?: string | number | Date | null;
  lastPromotedAt?: string | number | Date | null;
  onView?: () => void;
  onToggleStatus?: (id: string, nextStatus: ListingStatus) => void;
  onEdit?: (id: string) => void;
  onBump?: (id: string) => void;
  onDelete?: (id: string) => void;
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
  isDeleting?: boolean;
};

export default function UserListingMobileActions({
  id,
  status,
  createdAt,
  lastPromotedAt,
  onView,
  onToggleStatus,
  onEdit,
  onBump,
  onDelete,
  pendingAction,
  isDeleting = false,
}: UserListingMobileActionsProps) {
  const isActive = status === "active";
  const isPaused = status === "paused";
  const isArchived = status === "archived";
  const isDraft = status === "draft";
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const isActionPending = Boolean(pendingAction) || isDeleting;
  const canView = status === "active";
  const canDelete =
    status === "archived" || status === "draft" || status === "pending" || status === "rejected";
  const canPromote = isActive && canPromoteListing({ createdAt, lastPromotedAt });
  const cooldownLabel = getPromoteCooldownLabel({ createdAt, lastPromotedAt });
  const cooldownTime = cooldownLabel?.replace(/^Next in\s+/i, "");
  const promoteLabel = canPromote
    ? "Promote"
    : cooldownTime
      ? `Boost available in ${cooldownTime}`
      : "Boost available soon";

  const primaryButton =
    "inline-flex flex-1 items-center justify-center rounded-lg border border-(--color-primary) bg-white px-3 py-1.5 text-[13px] font-medium text-(--color-primary) transition hover:bg-(--color-primary)/10 disabled:border-gray-300 disabled:text-gray-400";
  const secondaryButton =
    "inline-flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60";
  const dangerButton =
    "inline-flex flex-1 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[13px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60";
  const moreButton =
    "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 transition hover:bg-gray-50";
  const menuItemClass =
    "w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50";
  const menuItemDanger =
    "w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50";

  const pauseLabel = isPaused ? "Resume" : "Pause";
  const pauseAction = isPaused ? "resume" : "pause";

  const archivedButtonRow =
    "flex w-full items-center justify-center gap-2";

  return (
    <div className={isArchived ? archivedButtonRow : "flex w-full items-center gap-2"}>
      {isArchived ? (
        <>
          {onToggleStatus ? (
            <button
              type="button"
              className={secondaryButton}
              onClick={() => onToggleStatus(id, "active")}
              disabled={isActionPending}
            >
              {pendingAction === "restore" ? "Restoring..." : "Restore"}
            </button>
          ) : null}
          {canDelete && onDelete ? (
            <button
              type="button"
              className={dangerButton}
              onClick={() => onDelete(id)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </>
      ) : (
        <>
          {onView && canView ? (
            <button
              type="button"
              className={primaryButton}
              onClick={onView}
              aria-label="View listing"
            >
              <Eye size={18} weight="regular" aria-hidden />
              <span className="sr-only">View listing</span>
            </button>
          ) : null}
          {(isActive || isPaused) && onToggleStatus ? (
            <button
              type="button"
              className={secondaryButton}
              onClick={() => onToggleStatus(id, isPaused ? "active" : "paused")}
              disabled={isActionPending}
            >
              {pendingAction === pauseAction ? `${pauseLabel}...` : pauseLabel}
            </button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={moreButton} disabled={isActionPending}>
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-50 min-w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden ring-0 outline-none"
            >
              {(isActive || isPaused) && onEdit ? (
                <DropdownMenuItem className={menuItemClass} onSelect={() => onEdit(id)}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {(isDraft || isPending || isRejected) && onEdit ? (
                <DropdownMenuItem className={menuItemClass} onSelect={() => onEdit(id)}>
                  Continue editing
                </DropdownMenuItem>
              ) : null}
              {isDraft && onToggleStatus ? (
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => onToggleStatus(id, "active")}
                >
                  {pendingAction === "publish" ? "Publishing..." : "Publish"}
                </DropdownMenuItem>
              ) : null}
              {(isActive || isPaused) && onToggleStatus ? (
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => onToggleStatus(id, "archived")}
                >
                  {pendingAction === "archive" ? "Archiving..." : "Archive"}
                </DropdownMenuItem>
              ) : null}
              {canPromote && onBump ? (
                <DropdownMenuItem className={menuItemClass} onSelect={() => onBump(id)}>
                  {promoteLabel}
                </DropdownMenuItem>
              ) : null}
              {canDelete && onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className={menuItemDanger}
                    onSelect={() => onDelete(id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
