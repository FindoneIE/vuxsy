import * as React from "react";
import { cn } from "@/lib/utils";

export type ListingStatus =
  | "active"
  | "draft"
  | "paused"
  | "sold"
  | "expired"
  | "archived";

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: Record<ListingStatus, StatusConfig> = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  },
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  paused: {
    label: "Paused",
    className: "bg-amber-50 text-amber-700 border border-amber-100",
  },
  sold: {
    label: "Sold",
    className: "bg-blue-50 text-blue-700 border border-blue-100",
  },
  expired: {
    label: "Expired",
    className: "bg-orange-50 text-orange-700 border border-orange-100",
  },
  archived: {
    label: "Archived",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
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
