"use client";

import * as React from "react";
import { formatRelativeTime, formatViewsCount } from "@/components/listings/formatters";
import { Flag, Share } from "@/components/ui/Icon";
import { useAuth } from "@/components/auth/AuthProvider";
import ReportListingModal from "./ReportListingModal";
import SavedListingButton from "@/components/listings/SavedListingButton";

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
  listingId,
  sellerId,
  location,
  price,
  currency,
  createdAt,
  views,
  savedByCurrentUser,
}: ListingInfoProps) {
  const { user } = useAuth();
  const isOwner = Boolean(user?.id && sellerId && user.id === sellerId);
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
            className="flex h-9 w-9 items-center justify-center rounded-none bg-transparent text-slate-400 transition duration-200 ease-out hover:scale-105 hover:text-slate-700"
            aria-label="Share listing"
            title="Share"
          >
            <Share className="h-5 w-5" weight="regular" />
          </button>
          <SavedListingButton
            listingId={listingId}
            initialSaved={savedByCurrentUser}
            title="Save"
            className="text-slate-400 hover:text-slate-700"
            withBackground={false}
          />
          <ReportListingModal
            listingId={listingId}
            sellerId={sellerId}
            disabled={isOwner}
            trigger={
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-none bg-transparent text-slate-400 transition duration-200 ease-out hover:scale-105 hover:text-slate-600 opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Report listing"
                disabled={isOwner}
                title={isOwner ? "You cannot report your own listing" : "Report listing"}
              >
                <Flag className="h-5 w-5" weight="regular" />
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
