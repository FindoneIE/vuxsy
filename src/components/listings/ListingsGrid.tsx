import * as React from "react";
import ListingCard, { type ListingCardItem } from "@/components/listings/ListingCard";

type Props = {
  items: ListingCardItem[];
  className?: string;
  wrap?: boolean;
};

export default function ListingsGrid({ items, className, wrap = true }: Props) {
  const debugLogs =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";
  if (!items || items.length === 0) {
    return <div className="text-muted-foreground">No listings found.</div>;
  }

  if (debugLogs) {
    console.log("LISTINGS GRID RENDER:", { count: items.length });
  }

  const grid = (
    <div
      data-listings-grid=""
      className={
        className ??
        // `listings-grid-responsive` is a hook for the mobile-landscape
        // breakpoint defined in globals.css (orientation: landscape and
        // 700px–950px) that promotes the grid to 3 columns to match the
        // Saved Listings layout on phones in landscape mode.
        "listings-grid-responsive grid grid-cols-2 gap-2 sm:gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
      }
    >
      {items.map((it, idx) => (
        <ListingCard
          key={it.id}
          listing={it}
          className="listing-card--square"
          eager={idx < 6}
        />
      ))}
    </div>
  );

  if (!wrap) {
    return grid;
  }

  return <div className="px-2">{grid}</div>;
}