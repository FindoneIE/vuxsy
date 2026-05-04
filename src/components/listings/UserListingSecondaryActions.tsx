import * as React from "react";
import { Eye, Trash } from "phosphor-react";
import type { ListingStatus } from "@/components/listings/ListingStatusBadge";

export type UserListingSecondaryActionsProps = {
  id: string;
  status: ListingStatus;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
};

export default function UserListingSecondaryActions({
  id,
  status,
  onView,
  onDelete,
  isDeleting = false,
}: UserListingSecondaryActionsProps) {
  const canView = status === "active";
  const canDelete =
    status === "archived" ||
    status === "draft" ||
    status === "pending" ||
    status === "rejected";
  const actionClass =
    "inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-600 rounded-md px-2 py-1 transition-all duration-150 hover:text-slate-900 hover:bg-slate-100";
  const dangerClass =
    "inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-rose-600 rounded-md px-2 py-1 transition-all duration-150 hover:text-rose-700 hover:bg-rose-50";

  return (
  <div className="contents">
      {onView && canView ? (
        <button
          type="button"
          onClick={() => onView(id)}
          className={`${actionClass} order-0`}
        >
          <Eye size={18} weight="regular" />
          View listing
        </button>
      ) : null}
      {onDelete && canDelete ? (
        <button
          type="button"
          onClick={() => onDelete(id)}
          className={`${dangerClass} order-10`}
          disabled={isDeleting}
        >
          <Trash size={18} weight="regular" />
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      ) : null}
    </div>
  );
}
