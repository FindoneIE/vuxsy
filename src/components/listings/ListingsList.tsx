import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { getListingHref } from "@/lib/listings/getListingHref";
import { cn } from "@/lib/utils";
import type { ListingCardItem } from "@/components/listings/ListingCard";
import SavedListingButton from "@/components/listings/SavedListingButton";
import ListingPrice from "@/components/listings/ListingPrice";
import {
  formatListingLocation,
  formatRelativeTime,
  formatViewsCount,
} from "@/components/listings/formatters";

type Props = {
  items: ListingCardItem[];
  className?: string;
  /**
   * Number of leading rows whose image should be eagerly fetched with
   * `priority` + `fetchPriority="high"`. Above-the-fold rows must be
   * eager so next/image emits a `<link rel="preload">` and the browser
   * issues the image request during HTML parse rather than after the
   * first paint (which is the visible image flash on refresh).
   */
  eagerCount?: number;
};

export default function ListingsList({ items, className, eagerCount = 4 }: Props) {
  if (!items || items.length === 0) {
    return <div className="text-muted-foreground">No listings found.</div>;
  }

  return (
    <>
      {items.map((item, idx) => {
        const isEager = idx < eagerCount;
        const imageSrc =
          item.images1600?.[0] ?? item.coverImage ?? item.images?.[0] ?? null;
        const listingType =
          (item.listing_type as "service" | "request" | "marketplace" | undefined) ??
          "service";
        const href = getListingHref({
          id: item.id,
          type: listingType,
          category: item.category_id ?? undefined,
        });
        const title = item.title ?? "Untitled listing";
        const locationLabel = formatListingLocation([
          item.area ?? null,
          item.county ?? null,
          item.city ?? null,
        ]);
        const relativeDateLabel = formatRelativeTime(item.created_at)
          ?.replace(/\s+ago$/i, "")
          .replace(/^about\s+/i, "")
          .trim();
        const viewsLabel = formatViewsCount(item.views) ?? "0 views";
        const metadataLabel = [relativeDateLabel, viewsLabel, locationLabel]
          .filter(Boolean)
          .join(" • ");

        return (
          <React.Fragment key={item.id}>
            <Link
              href={href}
              className={cn(
                "group relative flex gap-3 overflow-hidden rounded-xl bg-white shadow-sm transition cursor-pointer mb-2 last:mb-0 md:mb-3 md:gap-4 md:shadow-none md:transition-[border-color,box-shadow,transform] md:duration-200 md:ease-in-out lg:hidden",
                className
              )}
            >
              <div className="listing-card__image-wrapper relative aspect-square w-[36%] max-w-40 shrink-0 self-start overflow-hidden rounded-none bg-transparent p-0 m-0 sm:w-[34%]">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 38vw, (max-width: 1024px) 180px"
                    priority={isEager}
                    loading={isEager ? "eager" : "lazy"}
                    fetchPriority={isEager ? "high" : "auto"}
                    decoding={isEager ? "sync" : "async"}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-50 text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-6 w-6 opacity-60"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 7v10a2 2 0 0 0 2 2h14"
                      />
                      <path
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v0"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1 py-2.5 pr-10 sm:gap-1.5 sm:py-3">
                <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-(--text-primary) sm:text-base">
                  {title}
                </h3>
                {locationLabel ? (
                  <div
                    className="truncate text-[13px] text-slate-600 sm:text-sm"
                    title={locationLabel}
                  >
                    {locationLabel}
                  </div>
                ) : null}
                {(relativeDateLabel || viewsLabel) ? (
                  <div
                    className="truncate text-[11px] text-slate-400 sm:text-xs"
                    title={[relativeDateLabel, viewsLabel].filter(Boolean).join(" • ")}
                  >
                    {[relativeDateLabel, viewsLabel].filter(Boolean).join(" • ")}
                  </div>
                ) : null}

                <ListingPrice
                  price={item.price}
                  currency={item.currency}
                  className="pt-1.5"
                />
              </div>

              <div className="absolute right-2 top-2 z-10">
                <SavedListingButton
                  listingId={item.id}
                  initialSaved={item.savedByCurrentUser}
                  size="sm"
                />
              </div>
            </Link>

            <Link
              href={href}
              className="group relative hidden overflow-hidden rounded-xl bg-white shadow-sm transition last:lg:mb-0 lg:mb-3 lg:grid lg:h-45 lg:grid-cols-[260px_1fr]"
            >
              <div className="relative h-45 w-full overflow-hidden">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={title}
                    fill
                    sizes="260px"
                    priority={isEager}
                    loading={isEager ? "eager" : "lazy"}
                    fetchPriority={isEager ? "high" : "auto"}
                    decoding={isEager ? "sync" : "async"}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-50 text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-8 w-8 opacity-60"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 7v10a2 2 0 0 0 2 2h14"
                      />
                      <path
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v0"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="relative flex min-w-0 flex-col gap-1.5 px-5 py-4 pr-14">
                <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug text-(--text-primary)">
                  {title}
                </h3>
                {locationLabel ? (
                  <div className="truncate text-sm text-slate-600" title={locationLabel}>
                    {locationLabel}
                  </div>
                ) : null}
                {(relativeDateLabel || viewsLabel) ? (
                  <div
                    className="truncate text-xs text-slate-400"
                    title={[relativeDateLabel, viewsLabel].filter(Boolean).join(" • ")}
                  >
                    {[relativeDateLabel, viewsLabel].filter(Boolean).join(" • ")}
                  </div>
                ) : null}

                <ListingPrice
                  price={item.price}
                  currency={item.currency}
                  className="mt-auto pt-2"
                />

                <div className="absolute right-3 top-3">
                  <SavedListingButton
                    listingId={item.id}
                    initialSaved={item.savedByCurrentUser}
                    size="sm"
                  />
                </div>
              </div>
            </Link>
          </React.Fragment>
        );
      })}
    </>
  );
}
