import * as React from "react";
import { Pause, Pencil, Play, ArrowUpRight } from "@/components/ui/Icon";
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
};

export default function UserListingActions({
  id,
  status,
  createdAt,
  lastPromotedAt,
  onEdit,
  onToggleStatus,
  onBump,
}: UserListingActionsProps) {
  const nextStatus: ListingStatus = status === "active" ? "paused" : "active";
  const canPromote = canPromoteListing({ createdAt, lastPromotedAt });
  const cooldownLabel = getPromoteCooldownLabel({ createdAt, lastPromotedAt });
  const cooldownTime = cooldownLabel?.replace(/^Next in\s+/i, "");
  const promoteLabel = canPromote
    ? "Promote"
    : cooldownTime
      ? `Boost available in ${cooldownTime}`
      : "Boost available soon";

  const actionClass =
    "inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 rounded-md px-2 py-1 transition-all duration-150 hover:text-slate-900 hover:bg-slate-100";
  const promoteClass = canPromote
    ? "inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 rounded-md px-2 py-1 transition-all duration-150 hover:text-slate-950 hover:bg-slate-100"
    : "inline-flex items-center gap-1.5 text-sm font-medium text-slate-500";

  return (
  <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 sm:justify-end">
      <button
        type="button"
        onClick={() => onToggleStatus?.(id, nextStatus)}
        className={actionClass}
      >
        {status === "active" ? (
          <>
            <Pause className="h-4 w-4" weight="regular" />
            Pause
          </>
        ) : (
          <>
            <Play className="h-4 w-4" weight="regular" />
            Resume
          </>
        )}
      </button>
      <button type="button" onClick={() => onEdit?.(id)} className={actionClass}>
        <Pencil className="h-4 w-4" weight="regular" />
        Edit
      </button>
      <button
        type="button"
        onClick={() => onBump?.(id)}
        disabled={!canPromote}
        className={promoteClass}
      >
        {canPromote && <ArrowUpRight className="h-4 w-4" weight="regular" />}
        {promoteLabel}
      </button>
    </div>
  );
}
