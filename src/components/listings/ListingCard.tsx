"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { getListingHref } from "@/lib/listings/getListingHref";
import { cn } from "@/lib/utils";
import { formatListingLocation } from "@/components/listings/formatters";
import SavedListingButton from "@/components/listings/SavedListingButton";

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
  promoted_until?: string | Date | null;
  promotedUntil?: string | Date | null;
  savedByCurrentUser?: boolean | null;
};

type Props = {
  listing: ListingCardItem;
  className?: string;
  showPromotedBadge?: boolean;
};

export default function ListingCard({ listing, className, showPromotedBadge = false }: Props) {
  const carouselImages = React.useMemo(() => {
    const base =
      listing.images && listing.images.length > 0
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
  }, [listing.coverImage, listing.images, listing.images1600]);

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
  const dateLabel = formatDate(listing.created_at);
  const sellerLabel = listing.sellerType ? listing.sellerType : null;
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
    <article className={cn("h-full", className)}>
  <Link
    href={href}
  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-[#d9dee7] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow,transform] duration-200 ease-in-out hover:-translate-y-0.5 hover:border-[#c7d2fe] hover:shadow-[0_6px_14px_rgba(15,23,42,0.08)]"
  >
        <div
          className="relative w-full overflow-hidden bg-slate-100"
          style={{ aspectRatio: "4 / 3" }}
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
          {(showPromotedBadge || promotedActive) && promotedActive ? (
            <span className="promoted-badge" aria-label="Promoted listing">
              Promoted
            </span>
          ) : null}
          {activeImage ? (
            <Image
              src={activeImage}
              alt={title}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 768px) 40vw, 100vw"
              loading="lazy"
              className="object-cover object-center transition-transform duration-200 group-hover:scale-105"
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
            <div className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {activeIndex + 1}/{carouselImages.length}
            </div>
          ) : null}
        </div>

  <div className="p-3 md:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold text-(--text-primary) md:text-base">
                {title}
              </h3>
              {locationLabel ? (
                <p className="mt-0.5 text-sm text-(--text-primary) opacity-70">
                  {locationLabel}
                </p>
              ) : null}
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