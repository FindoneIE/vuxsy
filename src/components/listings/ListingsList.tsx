import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { getListingHref } from "@/lib/listings/getListingHref";
import { cn } from "@/lib/utils";
import type { ListingCardItem } from "@/components/listings/ListingCard";
import SavedListingButton from "@/components/listings/SavedListingButton";

const formatDate = (value: ListingCardItem["created_at"]) => {
  if (!value) return null;
  if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

type Props = {
  items: ListingCardItem[];
  className?: string;
};

export default function ListingsList({ items, className }: Props) {
  if (!items || items.length === 0) {
    return <div className="text-muted-foreground">No listings found.</div>;
  }

  return (
    <>
      {items.map((item) => {
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
        const locationLabel = item.city ?? "";
        const dateLabel = formatDate(item.created_at);
        const listingTypeLabel = listingType
          ? `${listingType.charAt(0).toUpperCase()}${listingType.slice(1)}`
          : "";

        return (
          <React.Fragment key={item.id}>
            <Link
              href={href}
              className={cn(
                "group flex items-center gap-4 rounded-xl overflow-hidden bg-white px-4 py-0 pl-0 shadow-sm transition cursor-pointer mb-2 md:mb-3 last:mb-0 md:gap-3 md:rounded-xl md:bg-white md:p-3 md:shadow-none md:transition-[border-color,box-shadow,transform] md:duration-200 md:ease-in-out lg:hidden",
                className
              )}
            >
              <div className="listing-card__image-wrapper relative h-32 w-32 shrink-0 overflow-hidden rounded-none bg-transparent p-0 m-0 md:h-36 md:w-36">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 128px, (max-width: 1024px) 144px"
                    loading="lazy"
                    className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
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

              <div className="min-w-0 flex-1 md:flex md:flex-col md:gap-1.5 md:py-1">
                <h3 className="line-clamp-2 text-sm font-semibold text-(--text-primary) md:mb-1 md:text-base md:font-semibold">
                  {title}
                </h3>
                <div className="mt-0.5 text-sm text-(--text-primary) opacity-70 md:mt-0 md:text-[13px] md:text-slate-500 md:opacity-100">
                  {locationLabel}
                  {item.area ? ` • ${item.area}` : ""}
                </div>
                {listingTypeLabel ? (
                  <div className="mt-1 text-xs text-(--text-primary) opacity-60 md:text-[13px] md:text-slate-500 md:opacity-100">
                    {listingTypeLabel}
                  </div>
                ) : null}
                {item.sellerType ? (
                  <div className="mt-1 text-xs text-(--text-primary) opacity-60 md:text-[13px] md:text-slate-500 md:opacity-100">
                    {item.sellerType}
                  </div>
                ) : null}
              </div>

              <div className="flex w-24 shrink-0 flex-col items-end justify-between text-right text-sm text-(--text-primary) sm:w-28 md:w-32 md:items-end md:pr-1 md:pt-0">
                {item.price != null ? (
                  <div className="text-lg font-semibold text-(--text-primary) md:text-xl">
                    {item.currency ?? "€"} {item.price}
                  </div>
                ) : (
                  <div className="text-sm text-(--text-primary) opacity-60">—</div>
                )}
                {dateLabel ? (
                  <div className="mt-1 text-xs text-(--text-primary) opacity-60 md:text-[13px] md:text-slate-500 md:opacity-100">
                    {dateLabel}
                  </div>
                ) : null}
                <div className="mt-2">
                  <SavedListingButton
                    listingId={item.id}
                    initialSaved={item.savedByCurrentUser}
                    size="sm"
                  />
                </div>
              </div>
            </Link>

            <Link
              href={href}
              className="hidden lg:grid lg:grid-cols-[280px_1fr_120px] lg:h-70 rounded-xl overflow-hidden bg-white shadow-sm transition lg:mb-4 last:lg:mb-0"
            >
              <div className="relative h-70 w-70 overflow-hidden">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={title}
                    fill
                    sizes="280px"
                    loading="lazy"
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

              <div className="flex flex-col gap-2 p-6">
                <h3 className="line-clamp-2 text-lg font-semibold text-(--text-primary)">{title}</h3>
                <div className="text-sm text-(--text-primary) opacity-70">
                  {locationLabel}
                  {item.area ? ` • ${item.area}` : ""}
                </div>
                {listingTypeLabel ? (
                  <div className="text-sm text-(--text-primary) opacity-60">{listingTypeLabel}</div>
                ) : null}
                {item.sellerType ? (
                  <div className="text-sm text-(--text-primary) opacity-60">{item.sellerType}</div>
                ) : null}
              </div>

              <div className="flex flex-col items-end justify-between p-6 text-right text-sm text-(--text-primary)">
                {item.price != null ? (
                  <div className="text-xl font-semibold text-(--text-primary)">
                    {item.currency ?? "€"} {item.price}
                  </div>
                ) : (
                  <div className="text-sm text-(--text-primary) opacity-60">—</div>
                )}
                {dateLabel ? (
                  <div className="text-xs text-(--text-primary) opacity-60">{dateLabel}</div>
                ) : null}
                <div className="mt-2 flex items-center justify-end gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">View</span>
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
