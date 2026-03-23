import Link from "next/link";
import Image from "next/image";
import { getListingHref } from "@/lib/listings/getListingHref";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/listing";

const formatDate = (value: unknown) => {
  if (!value) return null;
  if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

export type ListingCardItem = {
  id: string;
  type?: Listing["type"];
  title?: string | null;
  description?: string | null;
  category?: string | null;
  county?: string | null;
  city?: string | null;
  area?: string | null;
  price?: number | null;
  currency?: string | null;
  coverImage?: string | null;
  images?: string[];
  images1600?: string[];
  photoCount?: number;
  sellerType?: string | null;
  createdAt?: unknown;
};

type Props = {
  listing: ListingCardItem;
  className?: string;
};

export default function ListingCard({ listing, className }: Props) {
  const imageSrc =
    listing.coverImage ??
    listing.images?.[0] ??
    listing.images1600?.[0] ??
    null;

  const href = getListingHref({
    id: listing.id,
    type: listing.type ?? "service",
    category: listing.category ?? undefined,
  });

  const title = listing.title ?? "Untitled listing";
  const locationLabel = listing.county ?? listing.city ?? "";
  const dateLabel = formatDate(listing.createdAt);
  const sellerLabel = listing.sellerType ? listing.sellerType : null;

  return (
    <article className={cn("h-full", className)}>
  <Link
    href={href}
  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
  >
        <div className="relative w-full aspect-square overflow-hidden bg-slate-100">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="object-cover object-center transition-transform duration-200 group-hover:scale-105"
              onError={() => {
                console.error("LISTING CARD IMAGE ERROR:", {
                  id: listing.id,
                  src: imageSrc,
                });
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-10 w-10 opacity-60"
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

          {typeof listing.photoCount === "number" && listing.photoCount > 1 && (
            <div className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {listing.photoCount}
            </div>
          )}
        </div>

  <div className="p-3 md:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold text-(--text-primary) md:text-base">
                {title}
              </h3>
              <p className="mt-0.5 text-sm text-(--text-primary) opacity-70">
                {locationLabel}
                {listing.area ? ` • ${listing.area}` : ""}
              </p>
              {sellerLabel ? (
                <p className="mt-1 text-xs text-(--text-primary) opacity-60">
                  {sellerLabel}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 text-right">
              {listing.price != null ? (
                <div className="text-lg font-semibold text-(--text-primary) md:text-xl">
                  {listing.currency ?? "€"} {listing.price}
                </div>
              ) : (
                <div className="text-sm text-(--text-primary) opacity-60">—</div>
              )}
              {dateLabel ? (
                <div className="mt-1 text-xs text-(--text-primary) opacity-60">
                  {dateLabel}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}