"use client";

import * as React from "react";
import { formatRelativeTime, formatViewsCount } from "@/components/listings/formatters";
import ListingPrice from "@/components/listings/ListingPrice";

export type ListingInfoProps = {
  listingId: string;
  sellerId?: string | null;
  location?: string;
  sellerType?: string | null;
  price?: number | null;
  currency?: string | null;
  createdAt?: unknown;
  views?: number | null;
  savedByCurrentUser?: boolean | null;
};

export default function ListingInfo({
  location,
  price,
  currency,
  createdAt,
  views,
}: ListingInfoProps) {
  const dateLabel =
    formatRelativeTime(createdAt)
      ?.replace(/\s+ago$/i, "")
      .replace(/^about\s+/i, "")
      .trim() ?? "Just now";
  const viewsLabel = formatViewsCount(views) ?? "0 views";
  const locationLabel = location?.trim() ?? "";
  const metaLabel = [dateLabel, viewsLabel, locationLabel].filter(Boolean).join(" • ");

  return (
    <div className="mt-1.5 flex items-start justify-between gap-3 text-sm text-muted-foreground">
      <div className="min-w-0">
        <div className="mt-0.5 truncate whitespace-nowrap text-xs text-slate-500 lg:text-[13px]" title={metaLabel}>
          {metaLabel}
        </div>
        <ListingPrice price={price} currency={currency} />
      </div>

      <div className="flex flex-col items-end text-right" />
    </div>
  );
}
