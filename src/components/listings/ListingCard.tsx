"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { getListingHref } from "@/lib/listings/getListingHref";
import { cn } from "@/lib/utils";
import {
  formatListingLocation,
  formatRelativeTime,
  formatViewsCount,
} from "@/components/listings/formatters";
import SavedListingButton from "@/components/listings/SavedListingButton";
import ListingPrice from "@/components/listings/ListingPrice";

export type ListingCardItem = {
  id: string;
  title?: string | null;
  description?: string | null;
  category_id?: string | null;
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
  listing_type?: "service" | "request" | "marketplace" | string | null;
  created_at?: unknown;
  views?: number | null;
  promoted_until?: string | Date | null;
  promotedUntil?: string | Date | null;
  savedByCurrentUser?: boolean | null;
};

type Props = {
  listing: ListingCardItem;
  className?: string;
  showPromotedBadge?: boolean;
  imageClassName?: string;
  imageSizes?: string;
  imageQuality?: number;
  preferHighResImage?: boolean;
  /**
   * Above-the-fold cards should set this to true. It switches the image to
   * `priority` + `loading="eager"` + `fetchPriority="high"` so next/image
   * emits a `<link rel="preload">` in the document head and the browser
   * starts the image request during HTML parse instead of after first
   * paint. Without this, above-the-fold cards visibly repaint when their
   * lazy-loaded images decode a few frames after the initial paint.
   */
  eager?: boolean;
};

export default function ListingCard({
  listing,
  className,
  showPromotedBadge = false,
  imageClassName,
  imageSizes,
  imageQuality,
  preferHighResImage = false,
  eager = false,
}: Props) {
  const carouselImages = React.useMemo(() => {
    const base = preferHighResImage
      ? listing.images1600 && listing.images1600.length > 0
        ? listing.images1600
        : listing.images && listing.images.length > 0
        ? listing.images
        : []
      : listing.images && listing.images.length > 0
      ? listing.images
      : listing.images1600 && listing.images1600.length > 0
      ? listing.images1600
      : [];

    const combined = base.length === 0 && listing.coverImage
      ? [listing.coverImage]
      : base;

    return Array.from(
      new Set(
        combined.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0
        )
      )
    );
  }, [listing.coverImage, listing.images, listing.images1600, preferHighResImage]);

  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (activeIndex >= carouselImages.length) {
      queueMicrotask(() => setActiveIndex(0));
    }
  }, [activeIndex, carouselImages.length]);

  const goPrev = React.useCallback(() => {
    setActiveIndex((prev) =>
      carouselImages.length
        ? (prev - 1 + carouselImages.length) % carouselImages.length
        : 0
    );
  }, [carouselImages.length]);

  const goNext = React.useCallback(() => {
    setActiveIndex((prev) =>
      carouselImages.length ? (prev + 1) % carouselImages.length : 0
    );
  }, [carouselImages.length]);

  const touchStartX = React.useRef<number | null>(null);
  const touchDeltaX = React.useRef(0);

  const onTouchStart = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  }, []);

  const onTouchMove = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return;
    const currentX = event.touches[0]?.clientX ?? null;
    if (currentX == null) return;
    touchDeltaX.current = currentX - touchStartX.current;
  }, []);

  const onTouchEnd = React.useCallback(() => {
    if (touchStartX.current == null) return;
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      goPrev();
    } else {
      goNext();
    }
  }, [goNext, goPrev]);

  const listingType =
    (listing.listing_type as "service" | "request" | "marketplace" | undefined) ??
    "service";
  const href = getListingHref({
    id: listing.id,
    type: listingType,
    category: listing.category_id ?? undefined,
  });

  const title = listing.title ?? "Untitled listing";
  const locationLabel = formatListingLocation([
    listing.area ?? null,
    listing.county ?? null,
    listing.city ?? null,
  ]);
  const relativeDateLabel = formatRelativeTime(listing.created_at)
    ?.replace(/\s+ago$/i, "")
    .replace(/^about\s+/i, "")
    .trim();
  const viewsLabel = formatViewsCount(listing.views) ?? "0 views";
  const secondaryMetaLabel = [relativeDateLabel, viewsLabel].filter(Boolean).join(" • ");
  const activeImage = carouselImages[activeIndex] ?? null;
  const promotedUntil = listing.promoted_until ?? listing.promotedUntil;
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => setNowMs(Date.now()));
  }, [promotedUntil]);
  const promotedActive = React.useMemo(() => {
    if (!promotedUntil) return false;
    const promotedTime = new Date(promotedUntil).getTime();
    return Number.isFinite(promotedTime) && promotedTime > nowMs;
  }, [promotedUntil, nowMs]);

  return (
    <article className="h-full w-full">
      <Link
        href={href}
        className={cn("listing-card group flex h-full cursor-pointer flex-col", className)}
      >
        <div
          className="listing-card__image-wrapper relative h-47.5 w-full overflow-hidden bg-[#F4F6FA] md:h-55"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="absolute right-2 top-2 z-10">
            <SavedListingButton
              listingId={listing.id}
              initialSaved={listing.savedByCurrentUser}
              size="sm"
            />
          </div>
          {showPromotedBadge && promotedActive ? (
            <span className="promoted-badge" aria-label="Promoted listing">
              Promoted
            </span>
          ) : null}
          {activeImage ? (
            <Image
              src={activeImage}
              alt={title}
              fill
              sizes={
                imageSizes ??
                "(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 40vw, 100vw"
              }
              quality={imageQuality}
              priority={eager}
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              /*
                Above-the-fold images use `decoding="sync"` so the browser
                must decode the bitmap before painting the frame that
                contains the <img>. Without this, even preloaded images
                paint asynchronously (default decoding="async"), causing
                card1, card2, card3 to pop in on consecutive frames — the
                visible "image repaint" flash. With sync decode + preload,
                all eager card images appear in the same paint frame as
                the surrounding layout.
              */
              decoding={eager ? "sync" : "async"}
              className={cn(
                "object-cover object-center",
                imageClassName
              )}
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

          {carouselImages.length > 1 ? (
            <div className="listing-card__count absolute bottom-3 right-3 z-10">
              {activeIndex + 1}/{carouselImages.length}
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3 md:p-4">
          <div className="min-w-0 space-y-1">
            <h3 className="listing-card__title line-clamp-2 min-h-[2.7em]">
              {title}
            </h3>
            {locationLabel ? (
              <p
                className="listing-card__meta listing-card__meta--location truncate"
                title={locationLabel}
              >
                {locationLabel}
              </p>
            ) : null}
            {secondaryMetaLabel ? (
              <p
                className="listing-card__meta listing-card__meta--small truncate"
                title={secondaryMetaLabel}
              >
                {secondaryMetaLabel}
              </p>
            ) : null}
          </div>

          <ListingPrice
            price={listing.price}
            currency={listing.currency}
            className="listing-card__price-balance mt-auto pt-1"
          />
        </div>
      </Link>
    </article>
  );
}