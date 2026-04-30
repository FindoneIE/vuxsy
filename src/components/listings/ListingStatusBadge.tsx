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

const primaryStatusClassName = "bg-primary/10 text-primary border border-primary/20";

const STATUS_CONFIG: Record<ListingStatus, StatusConfig> = {
  active: {
    label: "Active",
    className: primaryStatusClassName,
  },
  draft: {
    label: "Draft",
    className: primaryStatusClassName,
  },
  paused: {
    label: "Paused",
    className: primaryStatusClassName,
  },
  sold: {
    label: "Sold",
    className: primaryStatusClassName,
  },
  expired: {
    label: "Expired",
    className: primaryStatusClassName,
  },
  archived: {
    label: "Archived",
    className: primaryStatusClassName,
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
