import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import ListingStatusBadge, { type ListingStatus } from "@/components/listings/ListingStatusBadge";
import { cn } from "@/lib/utils";

export type UserListingCardProps = {
  id: string;
  title: string;
  type: "service" | "request" | "marketplace";
  location?: string | null;
  status: ListingStatus;
  views?: number | null;
  coverImage?: string | null;
  /**
   * Public listing URL. When provided, the cover image becomes an
   * interactive preview that opens the listing page (My Listings UX
   * improvement). The existing View button is preserved separately.
   */
  href?: string | null;
  createdAt?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
  actions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  mobileActions?: React.ReactNode;
  className?: string;
};

function formatDate(value?: Date | string | number | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Short date for compact mobile meta. Drops the year so cards read
 * "Updated May 16" instead of "Updated May 16, 2026" — same density
 * pattern DoneDeal/Airbnb use on mobile.
 */
function formatShortDate(value?: Date | string | number | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function UserListingCard({
  id,
  title,
  type,
  location,
  status,
  views,
  coverImage,
  href,
  createdAt,
  updatedAt,
  actions,
  secondaryActions,
  mobileActions,
  className,
}: UserListingCardProps) {
  const createdLabel = formatDate(createdAt);
  const updatedLabel = formatDate(updatedAt);
  const updatedShort = formatShortDate(updatedAt);
  const createdShort = formatShortDate(createdAt);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const shortDatePrefixed = updatedShort
    ? `Updated ${updatedShort}`
    : createdShort ?? null;

  const imageInner = coverImage ? (
    <Image
      src={coverImage}
      alt={title}
      fill
      sizes="280px"
      className="h-full w-full object-cover object-center"
      draggable={false}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-muted-foreground">
      <span className="text-[10px] sm:text-xs">No image</span>
    </div>
  );

  // Common image-wrapper classes. When `href` is provided we render a
  // Next.js <Link> so the entire image area is a real anchor (right-click
  // "Open in new tab", keyboard focus, prefetching). When no href is
  // available we fall back to a plain <div> with the same layout.
  const imageWrapperClass = cn(
    "group/image relative shrink-0 self-start overflow-hidden rounded-none bg-transparent p-0 m-0",
    "max-sm:aspect-square max-sm:w-[38%] max-sm:max-w-44",
    "sm:row-span-2 sm:h-70 sm:w-70",
    href
      ? "cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
      : null
  );

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl bg-white shadow-sm transition max-sm:flex max-sm:flex-col max-sm:overflow-hidden sm:grid sm:h-70 sm:grid-cols-[280px_1fr]",
        className
      )}
      data-listing-id={id}
    >
      <div className="max-sm:flex sm:contents">
        {href ? (
          <Link
            href={href}
            aria-label={`Open listing: ${title}`}
            className={imageWrapperClass}
            // Allow native drag (e.g. swipe galleries) to bubble — we
            // don't stopPropagation here. Only the <img> has
            // draggable={false} to prevent the browser's ghost-image
            // drag from hijacking pointer gestures.
            prefetch={false}
          >
            {imageInner}
          </Link>
        ) : (
          <div className={imageWrapperClass}>{imageInner}</div>
        )}

        <div className="flex min-w-0 flex-1 flex-col max-sm:gap-1 max-sm:py-3 max-sm:pr-3 max-sm:pl-2 sm:col-start-2 sm:row-start-1 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-2 sm:block">
            <div className="min-w-0 flex-1">
              <div className="hidden items-center gap-2 sm:flex">
                <ListingStatusBadge status={status} />
                <span className="text-xs font-medium text-slate-500">{typeLabel}</span>
              </div>
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-(--text-primary) sm:mb-0 sm:text-lg">
                {title}
              </h3>
              {location ? (
                <div className="mt-1 truncate text-[13px] text-slate-600 sm:mt-0 sm:text-sm sm:text-(--text-primary) sm:opacity-70">
                  {location}
                </div>
              ) : null}
              {/* Mobile: single clean meta line — combines type + views.
                  Example: "Service • 0 views". The single short date sits
                  on the right next to the status badge. */}
              <div className="mt-1 truncate text-[11px] text-slate-400 sm:hidden">
                {[typeLabel, views != null ? `${views ?? 0} views` : null]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
              {/* Desktop: combined meta line (unchanged behavior). */}
              {(createdLabel || updatedLabel || views != null) ? (
                <div className="mt-1 hidden truncate text-[11px] text-slate-400 sm:mt-2 sm:block sm:text-sm sm:text-(--text-primary) sm:opacity-60">
                  {views != null ? `${views ?? 0} views` : null}
                  {createdLabel ? `${views != null ? " • " : ""}Created ${createdLabel}` : ""}
                  {updatedLabel ? `${(views != null || createdLabel) ? " • " : ""}Updated ${updatedLabel}` : ""}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-right sm:hidden">
              <ListingStatusBadge status={status} size="sm" />
              {shortDatePrefixed ? (
                <div className="whitespace-nowrap text-[11px] text-slate-400">
                  {shortDatePrefixed}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="max-sm:flex max-sm:items-center max-sm:justify-center max-sm:border-t max-sm:border-slate-200 max-sm:bg-slate-50 max-sm:px-3 max-sm:py-1.5 sm:col-start-2 sm:row-start-2 sm:flex sm:flex-wrap sm:items-center sm:gap-5 sm:px-5 sm:pt-4 sm:pb-5">
        <div className="w-full sm:hidden">{mobileActions}</div>
        <div className="hidden w-full items-center gap-5 sm:flex">
          {secondaryActions}
          {actions}
        </div>
      </div>
    </div>
  );
}
