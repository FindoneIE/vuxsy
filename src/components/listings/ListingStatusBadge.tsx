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
};

export default function ListingStatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
