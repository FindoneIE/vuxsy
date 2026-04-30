import * as React from "react";
import ListingCard, { type ListingCardItem } from "@/components/listings/ListingCard";

type Props = {
  items: ListingCardItem[];
  className?: string;
};

export default function ListingsGrid({ items, className }: Props) {
  const debugLogs =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";
  if (!items || items.length === 0) {
    return <div className="text-muted-foreground">No listings found.</div>;
  }

  if (debugLogs) {
    console.log("LISTINGS GRID RENDER:", { count: items.length });
  }

  return (
  <div className={className ?? "grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"}>
      {items.map((it) => (
        <ListingCard key={it.id} listing={it} />
      ))}
    </div>
  );
}