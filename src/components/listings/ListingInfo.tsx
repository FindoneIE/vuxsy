import * as React from "react";

export type ListingInfoProps = {
  location?: string;
  area?: string | null;
  sellerType?: string | null;
  price?: number | null;
  currency?: string | null;
  createdAt?: unknown;
};

function formatDate(value: ListingInfoProps["createdAt"]) {
  if (!value) return null;
  if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

export default function ListingInfo({
  location,
  area,
  sellerType,
  price,
  currency,
  createdAt,
}: ListingInfoProps) {
  const dateLabel = formatDate(createdAt);
  const locationLabel = location ? `${location}${area ? ` • ${area}` : ""}` : "";

  return (
    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
      <div className="flex flex-col">
        <span className="text-sm">{locationLabel}</span>
        {sellerType && <span className="mt-1 text-xs text-muted-foreground">{sellerType}</span>}
      </div>

      <div className="text-right">
        {price != null ? (
          <div className="text-sm font-semibold">
            {currency ?? "€"} {price}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">—</div>
        )}
        {dateLabel && <div className="mt-1 text-xs text-muted-foreground">{dateLabel}</div>}
      </div>
    </div>
  );
}
