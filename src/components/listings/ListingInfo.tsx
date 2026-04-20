import * as React from "react";
import { formatRelativeTime, formatViewsCount } from "@/components/listings/formatters";
import { Bookmark, Flag, Share } from "@/components/ui/Icon";

export type ListingInfoProps = {
  location?: string;
  sellerType?: string | null;
  price?: number | null;
  currency?: string | null;
  createdAt?: unknown;
  views?: number | null;
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
      </div>

      <div className="flex flex-col items-end text-right">
        {price != null ? (
          <div className="text-3xl font-bold text-slate-900">
            {currency ?? "€"} {price}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}

  <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 transition hover:text-slate-900"
            aria-label="Share listing"
          >
            <Share className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 transition hover:text-slate-900"
            aria-label="Save listing"
          >
            <Bookmark className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 transition hover:text-slate-900"
            aria-label="Report listing"
          >
            <Flag className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
