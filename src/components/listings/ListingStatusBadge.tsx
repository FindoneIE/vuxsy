import * as React from "react";
import { cn } from "@/lib/utils";

export type ListingStatus =
  | "active"
  | "draft"
  | "paused"
  | "archived"
  | "pending"
  | "rejected";

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: Record<ListingStatus, StatusConfig> = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  draft: {
    label: "Draft",
    className: "bg-slate-50 text-slate-600 border border-slate-200",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  archived: {
    label: "Archived",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  pending: {
    label: "Pending review",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
  },
};

type Props = {
  status: ListingStatus;
  className?: string;
  /**
   * Visual density of the badge.
   * - `md` (default): comfortable density for desktop / standalone use.
   * - `sm`: compact pill used on mobile listing cards where the badge
   *   should feel subtle next to a 15px title.
   */
  size?: "sm" | "md";
};

export default function ListingStatusBadge({ status, className, size = "md" }: Props) {
  const config = STATUS_CONFIG[status];

  const sizeClass =
    size === "sm"
      ? "px-2 py-[1px] text-[10.5px] leading-4"
      : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold tracking-wide",
        sizeClass,
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
