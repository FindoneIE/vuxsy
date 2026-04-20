import * as React from "react";
import { Archive, CheckCircle2, Eye, Trash2 } from "@/components/ui/Icon";
import type { ListingStatus } from "@/components/listings/ListingStatusBadge";
import type { ListingType } from "@/types/listing";

export type UserListingSecondaryActionsProps = {
  id: string;
  type: ListingType;
  status: ListingStatus;
  onView?: (id: string) => void;
  onMarkSold?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function UserListingSecondaryActions({
  id,
  type,
  status,
  onView,
  onMarkSold,
  onArchive,
  onDelete,
}: UserListingSecondaryActionsProps) {
  const isMarketplace = type === "marketplace";
  const canMarkSold = isMarketplace && status !== "sold";
  const canArchive = status !== "archived";
  const actionClass =
    "inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-600 rounded-md px-2 py-1 transition-all duration-150 hover:text-slate-900 hover:bg-slate-100";
  const dangerClass =
    "inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-rose-600 rounded-md px-2 py-1 transition-all duration-150 hover:text-rose-700 hover:bg-rose-50";

  return (
  <div className="flex flex-nowrap items-center gap-4 whitespace-nowrap">
      {onView ? (
        <button
          type="button"
          onClick={() => onView(id)}
          className={actionClass}
        >
          <Eye className="h-4 w-4" weight="regular" />
          View listing
        </button>
      ) : null}
      {canMarkSold && onMarkSold ? (
        <button
          type="button"
          onClick={() => onMarkSold(id)}
          className={actionClass}
        >
          <CheckCircle2 className="h-4 w-4" weight="regular" />
          Mark as sold
        </button>
      ) : null}
      {canArchive && onArchive ? (
        <button
          type="button"
          onClick={() => onArchive(id)}
          className={actionClass}
        >
          <Archive className="h-4 w-4" weight="regular" />
          Archive
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(id)}
          className={dangerClass}
        >
          <Trash2 className="h-4 w-4" weight="regular" />
          Delete
        </button>
      ) : null}
    </div>
  );
}
