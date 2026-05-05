"use client";

import * as React from "react";
import { formatRelativeTime, formatViewsCount } from "@/components/listings/formatters";

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
  const dateLabelRaw = formatRelativeTime(createdAt) ?? "Just now";
  const dateLabel = dateLabelRaw
    .replace(/\s+ago$/, "")
    .replace(/^about\s+/i, "")
    .replace(/^less than\s+/, "")
    .replace(/minutes?/i, "min")
    .replace(/hours?/i, "hr")
    .replace(/days?/i, "day")
    .replace(/months?/i, "mo")
    .replace(/years?/i, "yr")
    .trim();
  const viewsLabel = formatViewsCount(views) ?? "0 views";
  const locationLabel = location?.trim() ?? "";
  const metaLabel = `${dateLabel} • ${viewsLabel}`;

  return (
    <div className="mt-1.5 flex items-start justify-between gap-3 text-sm text-muted-foreground">
      <div className="min-w-0">
        <span className="text-sm text-slate-700">{locationLabel}</span>
        <div className="mt-0.5 text-xs text-slate-500">{metaLabel}</div>
        {price != null ? (
          <div className="mt-3 flex items-end gap-1">
            <span className="text-gray-500 text-xl">{currency ?? "€"}</span>
            <span className="text-4xl font-bold text-gray-900">{price}</span>
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">—</div>
        )}
      </div>

      <div className="flex flex-col items-end text-right" />
    </div>
  );
}
