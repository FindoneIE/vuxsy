"use client";

import * as React from "react";
import ListingCard from "@/components/listings/ListingCard";
import { CaretLeft, CaretRight } from "@/components/ui/Icon";
import type { Listing } from "@/types/listing";
import {
  PROMOTED_DESKTOP_ROTATE_MS,
  PROMOTED_DESKTOP_VISIBLE,
  PROMOTED_MOBILE_ROTATE_MS,
  PROMOTED_MOBILE_VISIBLE,
} from "@/constants/listingPromotions";

type PromotedCarouselProps = {
  listings?: Listing[] | null;
};

export default function PromotedCarousel({ listings }: PromotedCarouselProps) {
  const promotedListings = React.useMemo(() => listings ?? [], [listings]);
  const [isMobile, setIsMobile] = React.useState(true);
  const [index, setIndex] = React.useState(0);
  const visibleCount = isMobile ? PROMOTED_MOBILE_VISIBLE : PROMOTED_DESKTOP_VISIBLE;
  const rotationMs = isMobile ? PROMOTED_MOBILE_ROTATE_MS : PROMOTED_DESKTOP_ROTATE_MS;

  const visibleListings = React.useMemo(() => {
    if (promotedListings.length === 0) return [] as Listing[];
    const count = Math.min(visibleCount, promotedListings.length);
    return promotedListings.slice(index, index + count);
  }, [index, promotedListings, visibleCount]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const update = () => queueMicrotask(() => setIsMobile(!mediaQuery.matches));
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    if (promotedListings.length <= visibleCount) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % promotedListings.length);
    }, rotationMs);
    return () => clearInterval(id);
  }, [promotedListings.length, rotationMs, visibleCount]);

  React.useEffect(() => {
    if (index >= promotedListings.length) {
      queueMicrotask(() => setIndex(0));
    }
  }, [index, promotedListings.length]);

  if (promotedListings.length === 0) return null;

  return (
    <section className="mb-6 sm:mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Promoted listings</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Previous promoted listing"
            onClick={() =>
              setIndex((prev) =>
                promotedListings.length > 0
                  ? (prev - 1 + promotedListings.length) % promotedListings.length
                  : 0
              )
            }
          >
            <CaretLeft className="h-4 w-4" weight="regular" aria-hidden />
          </button>
          <button
            type="button"
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Next promoted listing"
            onClick={() =>
              setIndex((prev) =>
                promotedListings.length > 0 ? (prev + 1) % promotedListings.length : 0
              )
            }
          >
            <CaretRight className="h-4 w-4" weight="regular" aria-hidden />
          </button>
        </div>
      </div>
  <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        {visibleListings.map((listing, idx) => (
          <ListingCard
            key={`promoted-${listing.id}`}
            listing={listing}
            showPromotedBadge
            className="listing-card--promoted listing-card--square"
            imageSizes="100vw"
            imageQuality={100}
            preferHighResImage
            eager={idx < 3}
          />
        ))}
      </div>
    </section>
  );
}
